"""
Super Admin Management Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import bcrypt
import os

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])

# Import from main server
import sys
sys.path.append('/app/backend')
from server import db, get_current_user, User

# Models
class SuperAdminCreate(BaseModel):
    identifier: str  # email or phone
    type: str  # 'email' or 'phone'
    password: str

class SuperAdminUpdate(BaseModel):
    identifier: Optional[str] = None
    password: Optional[str] = None

class SuperAdminAction(BaseModel):
    current_password: str  # Verification
    
class SuperAdminTransfer(BaseModel):
    target_identifier: str  # Transfer to this email/phone
    current_password: str

class SuperAdminResponse(BaseModel):
    id: str
    identifier: str
    type: str
    role: str
    created_at: str
    is_active: bool
    last_login: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

async def verify_super_admin(identifier: str, password: str, database=None) -> dict:
    """Verify super admin credentials"""
    admin = await db.super_admins.find_one({
        "identifier": identifier,
        "is_active": True
    })
    
    if not admin or not verify_password(password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid_super_admin_credentials")
    
    return admin

async def log_admin_action(
    action: str,
    performed_by: str,
    details: dict
):
    """Log admin actions"""
    await db.admin_audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": action,
        "performed_by": performed_by,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

# Dependency to get current super admin
async def get_current_super_admin(identifier: str, db: AsyncIOMotorDatabase):
    """Get current super admin (must be called with verification)"""
    admin = await db.super_admins.find_one({
        "identifier": identifier,
        "is_active": True
    })
    
    if not admin:
        raise HTTPException(status_code=403, detail="not_super_admin")
    
    return admin

# Routes
@router.get("/list", response_model=List[SuperAdminResponse])
async def list_super_admins(
    current_admin_identifier: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """List all super admins (requires super admin access)"""
    # Verify caller is super admin
    await get_current_super_admin(current_admin_identifier, db)
    
    # Get all super admins
    admins = await db.super_admins.find({"is_active": True}).to_list(length=100)
    
    return [
        SuperAdminResponse(
            id=admin["id"],
            identifier=admin["identifier"],
            type=admin["type"],
            role=admin["role"],
            created_at=admin["created_at"],
            is_active=admin["is_active"],
            last_login=admin.get("last_login")
        )
        for admin in admins
    ]

@router.post("/add")
async def add_super_admin(
    new_admin: SuperAdminCreate,
    current_admin_identifier: str,
    current_password: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Add new super admin (requires password verification)"""
    # Verify current admin
    current_admin = await verify_super_admin(current_admin_identifier, current_password, db)
    
    # Check if identifier already exists
    existing = await db.super_admins.find_one({"identifier": new_admin.identifier})
    if existing:
        raise HTTPException(status_code=400, detail="super_admin_already_exists")
    
    # Create new super admin
    new_admin_doc = {
        "id": str(uuid.uuid4()),
        "identifier": new_admin.identifier,
        "type": new_admin.type,
        "password_hash": hash_password(new_admin.password),
        "role": "super_admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_admin["identifier"],
        "is_active": True,
        "last_login": None
    }
    
    await db.super_admins.insert_one(new_admin_doc)
    
    # Log action
    await log_admin_action(
        db,
        "super_admin_added",
        current_admin["identifier"],
        {"new_admin": new_admin.identifier}
    )
    
    # TODO: Send email notification
    
    return {"message": "super_admin_added_successfully", "id": new_admin_doc["id"]}

@router.delete("/remove/{admin_id}")
async def remove_super_admin(
    admin_id: str,
    current_admin_identifier: str,
    current_password: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Remove super admin (requires password verification, must keep at least one)"""
    # Verify current admin
    current_admin = await verify_super_admin(current_admin_identifier, current_password, db)
    
    # Check if removing self
    target_admin = await db.super_admins.find_one({"id": admin_id})
    if not target_admin:
        raise HTTPException(status_code=404, detail="super_admin_not_found")
    
    if target_admin["identifier"] == current_admin["identifier"]:
        raise HTTPException(status_code=400, detail="cannot_remove_self")
    
    # Check if at least one super admin will remain
    total_admins = await db.super_admins.count_documents({"is_active": True})
    if total_admins <= 1:
        raise HTTPException(status_code=400, detail="must_keep_one_super_admin")
    
    # Deactivate (soft delete)
    await db.super_admins.update_one(
        {"id": admin_id},
        {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Log action
    await log_admin_action(
        db,
        "super_admin_removed",
        current_admin["identifier"],
        {"removed_admin": target_admin["identifier"]}
    )
    
    # TODO: Send email notification
    
    return {"message": "super_admin_removed_successfully"}

@router.put("/update-profile")
async def update_super_admin_profile(
    updates: SuperAdminUpdate,
    current_admin_identifier: str,
    current_password: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update own super admin profile"""
    # Verify current admin
    current_admin = await verify_super_admin(current_admin_identifier, current_password, db)
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if updates.identifier:
        # Check if new identifier is available
        existing = await db.super_admins.find_one({
            "identifier": updates.identifier,
            "id": {"$ne": current_admin["id"]}
        })
        if existing:
            raise HTTPException(status_code=400, detail="identifier_already_taken")
        
        update_data["identifier"] = updates.identifier
    
    if updates.password:
        update_data["password_hash"] = hash_password(updates.password)
    
    # Update
    await db.super_admins.update_one(
        {"id": current_admin["id"]},
        {"$set": update_data}
    )
    
    # Log action
    await log_admin_action(
        db,
        "super_admin_profile_updated",
        current_admin["identifier"],
        {"updates": list(update_data.keys())}
    )
    
    return {"message": "profile_updated_successfully"}

@router.post("/transfer")
async def transfer_super_admin(
    transfer: SuperAdminTransfer,
    current_admin_identifier: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Transfer super admin rights to another account"""
    # Verify current admin
    current_admin = await verify_super_admin(
        current_admin_identifier,
        transfer.current_password,
        db
    )
    
    # Check if target exists in users collection
    target_user = await db.users.find_one({
        "$or": [
            {"email": transfer.target_identifier},
            {"phone": transfer.target_identifier}
        ]
    })
    
    if not target_user:
        raise HTTPException(status_code=404, detail="target_user_not_found")
    
    # Check if target is already super admin
    existing_super_admin = await db.super_admins.find_one({
        "identifier": transfer.target_identifier,
        "is_active": True
    })
    
    if existing_super_admin:
        raise HTTPException(status_code=400, detail="target_already_super_admin")
    
    # Create new super admin for target
    new_super_admin = {
        "id": str(uuid.uuid4()),
        "identifier": transfer.target_identifier,
        "type": "email" if "@" in transfer.target_identifier else "phone",
        "password_hash": hash_password("change_me_" + str(uuid.uuid4())[:8]),  # Temp password
        "role": "super_admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_admin["identifier"],
        "is_active": True,
        "last_login": None,
        "transferred_from": current_admin["identifier"]
    }
    
    await db.super_admins.insert_one(new_super_admin)
    
    # Remove current admin's super admin rights
    await db.super_admins.update_one(
        {"id": current_admin["id"]},
        {"$set": {"is_active": False, "transferred_to": transfer.target_identifier}}
    )
    
    # Log action
    await log_admin_action(
        db,
        "super_admin_transferred",
        current_admin["identifier"],
        {
            "from": current_admin["identifier"],
            "to": transfer.target_identifier
        }
    )
    
    # TODO: Send email to both parties
    
    return {
        "message": "super_admin_transferred_successfully",
        "temp_password_sent": True
    }

@router.get("/audit-logs")
async def get_audit_logs(
    current_admin_identifier: str,
    limit: int = 50,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get admin audit logs"""
    # Verify caller is super admin
    await get_current_super_admin(current_admin_identifier, db)
    
    # Get logs
    logs = await db.admin_audit_logs.find().sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    return logs


# ==================== ADMIN MANAGEMENT ENDPOINTS ====================

class AdminManagementModels:
    """Models for admin management"""
    
    class AdminListResponse(BaseModel):
        id: str
        email: Optional[str] = None
        phone: Optional[str] = None
        first_name: str
        last_name: str
        is_admin: bool
        is_super_admin: bool
        is_active: bool
        created_at: str
        last_login: Optional[str] = None
    
    class ChangeRoleRequest(BaseModel):
        user_id: str
        new_role: str  # 'super_admin', 'admin', 'user'
        current_password: str  # Super admin password verification
    
    class ResetPasswordRequest(BaseModel):
        user_id: str
        new_password: str
        current_password: str  # Super admin password verification
    
    class ToggleStatusRequest(BaseModel):
        user_id: str
        is_active: bool
        current_password: str

@router.get("/manage/list-all-admins")
async def list_all_admins(
    current_user: User = Depends(get_current_user)
):
    """List all admins and super admins (Super Admin only) - Uses JWT token"""
    # Verify user is super admin
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Get all users who are admins or super admins
    admins = await db.users.find({
        "$or": [
            {"is_admin": True},
            {"is_super_admin": True}
        ]
    }).to_list(length=1000)
    
    # Get super admin details
    super_admins = await db.super_admins.find({"is_active": True}).to_list(length=100)
    super_admin_identifiers = {sa["identifier"] for sa in super_admins}
    
    result = []
    for admin in admins:
        identifier = admin.get("email") or admin.get("phone")
        result.append({
            "id": admin["id"],
            "email": admin.get("email"),
            "phone": admin.get("phone"),
            "first_name": admin.get("first_name", ""),
            "last_name": admin.get("last_name", ""),
            "is_admin": admin.get("is_admin", False),
            "is_super_admin": identifier in super_admin_identifiers,
            "is_active": admin.get("is_active", True),
            "created_at": admin.get("created_at", ""),
            "last_login": admin.get("last_login")
        })
    
    return {
        "admins": result,
        "total": len(result),
        "super_admin_count": len([r for r in result if r["is_super_admin"]]),
        "admin_count": len([r for r in result if r["is_admin"] and not r["is_super_admin"]])
    }

@router.post("/manage/change-role")
async def change_user_role(
    request: AdminManagementModels.ChangeRoleRequest,
    current_user: User = Depends(get_current_user)
):
    """Change user role (Super Admin only)"""
    # Verify user is super admin
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Verify super admin password
    current_admin_identifier = current_user.email or current_user.phone
    current_admin = await verify_super_admin(
        current_admin_identifier,
        request.current_password,
        db
    )
    
    # Get target user
    target_user = await db.users.find_one({"id": request.user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    # Prevent super admin from removing their own super admin rights
    target_identifier = target_user.get("email") or target_user.get("phone")
    if target_identifier == current_admin_identifier and request.new_role != "super_admin":
        raise HTTPException(status_code=400, detail="cannot_remove_own_super_admin")
    
    # Update role based on new_role
    updates = {}
    
    if request.new_role == "super_admin":
        # Make super admin
        updates["is_admin"] = True
        updates["is_super_admin"] = True
        
        # Add to super_admins collection
        existing_super_admin = await db.super_admins.find_one({
            "identifier": target_identifier,
            "is_active": True
        })
        
        if not existing_super_admin:
            # Create new super admin entry
            temp_password = "change_me_" + str(uuid.uuid4())[:8]
            await db.super_admins.insert_one({
                "id": str(uuid.uuid4()),
                "identifier": target_identifier,
                "type": "email" if target_user.get("email") else "phone",
                "password_hash": hash_password(temp_password),
                "role": "super_admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_admin_identifier,
                "is_active": True,
                "last_login": None
            })
    
    elif request.new_role == "admin":
        # Make regular admin
        updates["is_admin"] = True
        updates["is_super_admin"] = False
        
        # Remove from super_admins collection
        await db.super_admins.update_many(
            {"identifier": target_identifier},
            {"$set": {"is_active": False}}
        )
    
    elif request.new_role == "user":
        # Make regular user
        updates["is_admin"] = False
        updates["is_super_admin"] = False
        
        # Remove from super_admins collection
        await db.super_admins.update_many(
            {"identifier": target_identifier},
            {"$set": {"is_active": False}}
        )
    
    else:
        raise HTTPException(status_code=400, detail="invalid_role")
    
    # Update user
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": updates}
    )
    
    # Log action
    await log_admin_action(
        "role_changed",
        current_admin_identifier,
        {
            "target_user": target_identifier,
            "new_role": request.new_role,
            "old_is_admin": target_user.get("is_admin"),
            "old_is_super_admin": target_user.get("is_super_admin", False)
        }
    )
    
    return {
        "message": "role_changed_successfully",
        "user_id": request.user_id,
        "new_role": request.new_role
    }

@router.post("/manage/reset-password")
async def reset_admin_password(
    request: AdminManagementModels.ResetPasswordRequest,
    current_user: User = Depends(get_current_user)
):
    """Reset admin password (Super Admin only)"""
    # Verify user is super admin
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Verify super admin password
    current_admin_identifier = current_user.email or current_user.phone
    await verify_super_admin(current_admin_identifier, request.current_password, db)
    
    # Get target user
    target_user = await db.users.find_one({"id": request.user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    # Hash new password
    from ..server import get_password_hash  # Import from main server
    new_hashed_password = hash_password(request.new_password)
    
    # Update password
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {"password": new_hashed_password}}
    )
    
    # Also update in super_admins if applicable
    target_identifier = target_user.get("email") or target_user.get("phone")
    await db.super_admins.update_many(
        {"identifier": target_identifier, "is_active": True},
        {"$set": {"password_hash": new_hashed_password}}
    )
    
    # Log action
    await log_admin_action(
        db,
        "password_reset",
        current_admin_identifier,
        {
            "target_user": target_identifier,
            "reset_by": current_admin_identifier
        }
    )
    
    return {
        "message": "password_reset_successfully",
        "user_id": request.user_id
    }

@router.post("/manage/toggle-status")
async def toggle_admin_status(
    request: AdminManagementModels.ToggleStatusRequest,
    current_admin_identifier: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Enable/Disable admin account (Super Admin only)"""
    # Verify super admin
    current_admin = await verify_super_admin(
        current_admin_identifier,
        request.current_password,
        db
    )
    
    # Get target user
    target_user = await db.users.find_one({"id": request.user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    # Prevent super admin from disabling themselves
    target_identifier = target_user.get("email") or target_user.get("phone")
    if target_identifier == current_admin_identifier:
        raise HTTPException(status_code=400, detail="cannot_disable_self")
    
    # Update status
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": {"is_active": request.is_active}}
    )
    
    # Also update in super_admins if applicable
    await db.super_admins.update_many(
        {"identifier": target_identifier},
        {"$set": {"is_active": request.is_active}}
    )
    
    # Log action
    await log_admin_action(
        db,
        "status_changed",
        current_admin_identifier,
        {
            "target_user": target_identifier,
            "new_status": "active" if request.is_active else "inactive"
        }
    )
    
    return {
        "message": "status_updated_successfully",
        "user_id": request.user_id,
        "is_active": request.is_active
    }

@router.delete("/manage/delete-admin/{user_id}")
async def delete_admin(
    user_id: str,
    current_admin_identifier: str,
    current_password: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete admin account (Super Admin only, DANGEROUS!)"""
    # Verify super admin
    current_admin = await verify_super_admin(
        current_admin_identifier,
        current_password,
        db
    )
    
    # Get target user
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    # Prevent super admin from deleting themselves
    target_identifier = target_user.get("email") or target_user.get("phone")
    if target_identifier == current_admin_identifier:
        raise HTTPException(status_code=400, detail="cannot_delete_self")
    
    # Check if this is the last super admin
    if target_user.get("is_super_admin"):
        super_admin_count = await db.super_admins.count_documents({"is_active": True})
        if super_admin_count <= 1:
            raise HTTPException(status_code=400, detail="cannot_delete_last_super_admin")
    
    # Log action before deletion
    await log_admin_action(
        db,
        "admin_deleted",
        current_admin_identifier,
        {
            "target_user": target_identifier,
            "was_super_admin": target_user.get("is_super_admin", False),
            "was_admin": target_user.get("is_admin", False)
        }
    )
    
    # Delete from users
    await db.users.delete_one({"id": user_id})
    
    # Delete from super_admins
    await db.super_admins.delete_many({"identifier": target_identifier})
    
    return {
        "message": "admin_deleted_successfully",
        "user_id": user_id
    }

@router.get("/manage/statistics")
async def get_admin_statistics(
    current_user: User = Depends(get_current_user)
):
    """Get admin statistics (Super Admin only)"""
    # Verify user is super admin
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    # Count statistics
    total_users = await db.users.count_documents({})
    total_admins = await db.users.count_documents({"is_admin": True})
    total_super_admins = await db.super_admins.count_documents({"is_active": True})
    active_admins = await db.users.count_documents({"is_admin": True, "is_active": True})
    
    # Recent actions
    recent_actions = await db.admin_audit_logs.find().sort("timestamp", -1).limit(10).to_list(length=10)
    
    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "total_super_admins": total_super_admins,
        "active_admins": active_admins,
        "inactive_admins": total_admins - active_admins,
        "recent_actions": recent_actions
    }

