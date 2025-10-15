"""
Super Admin Management Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import bcrypt
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])

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

async def verify_super_admin(identifier: str, password: str, db: AsyncIOMotorDatabase) -> dict:
    """Verify super admin credentials"""
    admin = await db.super_admins.find_one({
        "identifier": identifier,
        "is_active": True
    })
    
    if not admin or not verify_password(password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid_super_admin_credentials")
    
    return admin

async def log_admin_action(
    db: AsyncIOMotorDatabase,
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
    db: AsyncIOMotorDatabase = Depends()
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
    db: AsyncIOMotorDatabase = Depends()
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
    db: AsyncIOMotorDatabase = Depends()
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
    db: AsyncIOMotorDatabase = Depends()
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
    db: AsyncIOMotorDatabase = Depends()
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
    db: AsyncIOMotorDatabase = Depends()
):
    """Get admin audit logs"""
    # Verify caller is super admin
    await get_current_super_admin(current_admin_identifier, db)
    
    # Get logs
    logs = await db.admin_audit_logs.find().sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    return logs
