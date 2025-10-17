"""
Super Admin Management Routes - Simplified for Review
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import bcrypt

router = APIRouter(prefix="/admin/super-admin", tags=["Super Admin"])

# Import from main server
import sys
sys.path.append('/app/backend')
from server import db, get_current_user, User, get_password_hash

# Models for admin management
class ChangeRoleRequest(BaseModel):
    user_id: str
    new_role: str  # 'super_admin', 'admin', 'user'
    current_password: str  # Super admin password verification

class ResetPasswordRequest(BaseModel):
    user_id: str
    new_password: str
    current_password: str  # Super admin password verification

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except:
        return False

async def verify_super_admin_password(identifier: str, password: str) -> dict:
    """Verify super admin credentials"""
    admin = await db.super_admins.find_one({
        "identifier": identifier,
        "is_active": True
    })
    
    if not admin or not verify_password(password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid_super_admin_credentials")
    
    return admin

async def log_admin_action(action: str, performed_by: str, details: dict):
    """Log admin actions"""
    await db.admin_audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": action,
        "performed_by": performed_by,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

# Management endpoints
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

@router.post("/manage/change-role")
async def change_user_role(
    request: ChangeRoleRequest,
    current_user: User = Depends(get_current_user)
):
    """Change user role (Super Admin only)"""
    # Verify user is super admin
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Verify super admin password
    current_admin_identifier = current_user.email or current_user.phone
    await verify_super_admin_password(current_admin_identifier, request.current_password)
    
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
                "password_hash": get_password_hash(temp_password),
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
    request: ResetPasswordRequest,
    current_user: User = Depends(get_current_user)
):
    """Reset admin password (Super Admin only)"""
    # Verify user is super admin
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Verify super admin password
    current_admin_identifier = current_user.email or current_user.phone
    await verify_super_admin_password(current_admin_identifier, request.current_password)
    
    # Get target user
    target_user = await db.users.find_one({"id": request.user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    # Hash new password
    new_hashed_password = get_password_hash(request.new_password)
    
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