"""
Authentication middleware for admin and super admin verification.

Previously `verify_super_admin` returned a hardcoded super-admin dict for any
non-empty string, so any value in the Authorization header granted full
super-admin access. It now performs real verification via core.security.
"""
from fastapi import Depends, Request
from typing import Dict, Any

from core.security import require_admin_doc, require_super_admin_doc


async def verify_super_admin(request: Request) -> Dict[str, Any]:
    """Verify the caller is a super admin. Raises 401/403 otherwise."""
    return await require_super_admin_doc(request)


async def verify_admin(request: Request) -> Dict[str, Any]:
    """Verify the caller is an admin (super admins included)."""
    return await require_admin_doc(request)
