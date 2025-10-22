"""
Authentication middleware for admin and super admin verification
"""
from fastapi import Depends, HTTPException, status
from typing import Dict
import os
from datetime import datetime, timedelta, timezone
import jwt

# JWT Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"


async def verify_super_admin(token: str = None) -> Dict:
    """
    Verify super admin access
    For testing purposes, this is a placeholder
    """
    # This is a placeholder - in production, implement proper JWT verification
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    return {
        "id": "test-super-admin",
        "email": "admin@test.com",
        "is_super_admin": True
    }
