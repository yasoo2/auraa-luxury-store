"""
Super Admin Routes for User Management
Provides full control over users: delete, change password, toggle admin status
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

# This will be imported and used in server.py
# The actual implementation will be added to server.py directly

class ChangePasswordRequest(BaseModel):
    new_password: str

class ToggleAdminRequest(BaseModel):
    is_admin: bool

# Endpoints to be added to server.py:
# GET /api/admin/users - Get all users
# DELETE /api/admin/users/{user_id} - Delete user
# PATCH /api/admin/users/{user_id}/change-password - Change user password
# PATCH /api/admin/users/{user_id}/toggle-admin - Toggle admin status

