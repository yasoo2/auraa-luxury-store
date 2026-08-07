"""
Authentication Routes
Handles user registration, login, OAuth, and token management
"""
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import os
import logging
import uuid

from auth.oauth_service import oauth_service
from core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    clear_auth_cookies,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_doc,
    is_refresh_token_revoked,
    revoke_refresh_token,
    set_auth_cookies,
    REFRESH_COOKIE,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    phone: Optional[str] = None


class UserLogin(BaseModel):
    # The frontend sends `identifier`, which may be either an email address or a
    # phone number (AuthPage lets the user pick). Keep it a plain str so phone
    # logins are not rejected by email validation.
    identifier: str
    password: str
    remember_me: bool = False
    turnstile_token: Optional[str] = None


class OAuthSessionRequest(BaseModel):
    session_id: str
    provider: str = "google"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


# Helper Functions
async def _issue_session(db, response: Response, user: Dict[str, Any]) -> str:
    """
    Mint an access/refresh pair for `user`, record the refresh token's jti,
    and set both as HttpOnly cookies. Returns the access token so callers can
    also return it in the body for clients that use the Authorization header.
    """
    claims = {"sub": user["email"], "user_id": user["id"]}

    access_token = create_access_token(claims)
    refresh_token, jti = create_refresh_token(claims)

    await db.refresh_tokens.insert_one({
        "jti": jti,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    })

    set_auth_cookies(response, access_token, refresh_token)
    return access_token


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


# Routes
@router.post("/register")
async def register(user: UserRegister, request: Request, response: Response):
    """
    Register a new user
    """
    try:
        db = request.app.state.db
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        user_data = {
            "id": str(uuid.uuid4()),
            "email": user.email,
            "password": hash_password(user.password),
            "name": user.name or user.email.split('@')[0],
            "phone": user.phone,
            "is_admin": False,
            "is_super_admin": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(user_data)

        access_token = await _issue_session(db, response, user_data)

        # Return user data (without password)
        user_data.pop("password", None)
        user_data.pop("_id", None)
        
        logger.info(f"✅ New user registered: {user.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/login")
async def login(credentials: UserLogin, request: Request, response: Response):
    """
    Login with email and password
    """
    try:
        db = request.app.state.db

        # Find user by email or phone
        identifier = credentials.identifier.strip()
        user = await db.users.find_one({
            "$or": [{"email": identifier}, {"phone": identifier}]
        })
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Verify password
        if not verify_password(credentials.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Disabled accounts must not authenticate, or the admin toggle is cosmetic.
        # Absent field means active, so existing users are unaffected.
        if user.get("is_active") is False:
            raise HTTPException(status_code=403, detail="Account is disabled")
        
        access_token = await _issue_session(db, response, user)

        # Return user data (without password)
        user.pop("password", None)
        user.pop("_id", None)

        logger.info(f"✅ User logged in: {identifier}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


@router.post("/logout")
async def logout(request: Request, response: Response):
    """
    Log out: revoke the refresh token server-side and clear both cookies.

    Clearing the cookie alone left the token usable by anyone who had copied
    it, so logout did not actually end the session.
    """
    token = request.cookies.get(REFRESH_COOKIE)
    if token:
        try:
            payload = decode_token(token)
            await revoke_refresh_token(request.app.state.db, payload.get("jti"))
        except HTTPException:
            # Already expired or malformed — nothing to revoke.
            pass

    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}


@router.get("/oauth/{provider}/url")
async def oauth_url(provider: str, redirect_url: str):
    """
    Get the OAuth sign-in URL for a provider ('google' or 'facebook').
    """
    try:
        oauth_url = oauth_service.get_oauth_url(provider, redirect_url)
        return {"url": oauth_url}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"OAuth URL generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to build OAuth URL")


@router.post("/oauth/session")
async def oauth_session(payload: OAuthSessionRequest, request: Request, response: Response):
    """
    Exchange an OAuth session_id for an app session.

    The sign-in URL returned by /oauth/{provider}/url redirects back with a
    session_id in the URL fragment; the frontend posts it here. Creates the
    user on first sign-in, then issues the same tokens as password login.
    """
    try:
        db = request.app.state.db

        profile = await oauth_service.get_user_from_session(payload.session_id)
        if not profile or not profile.get("email"):
            raise HTTPException(status_code=401, detail="Invalid or expired OAuth session")

        email = profile["email"]
        user_data = await db.users.find_one({"email": email})

        if not user_data:
            # First sign-in via OAuth: create the account. No password is set,
            # so password login stays unavailable until the user sets one.
            user_data = {
                "id": str(uuid.uuid4()),
                "email": email,
                "name": profile.get("name") or email.split('@')[0],
                "picture": profile.get("picture"),
                "phone": None,
                "auth_provider": payload.provider,
                "is_admin": False,
                "is_super_admin": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(dict(user_data))
            logger.info(f"✅ New user registered via {payload.provider}: {email}")
        else:
            logger.info(f"✅ User logged in via {payload.provider}: {email}")

        user_data.pop("password", None)
        user_data.pop("_id", None)

        access_token = await _issue_session(db, response, user_data)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data,
            # AuthPage routes the user to add a phone number when this is true.
            "needs_phone": not user_data.get("phone")
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth session error: {e}")
        raise HTTPException(status_code=500, detail="OAuth sign-in failed")


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    """
    Exchange the refresh cookie for a fresh session.

    Rotates the refresh token: the presented one is revoked and replaced, so a
    stolen token stops working as soon as the real user refreshes.
    """
    try:
        db = request.app.state.db

        token = request.cookies.get(REFRESH_COOKIE)
        if not token:
            raise HTTPException(status_code=401, detail="No refresh token")

        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Not a refresh token")

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        if await is_refresh_token_revoked(db, payload.get("jti")):
            raise HTTPException(status_code=401, detail="Refresh token revoked")

        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Rotate: retire the presented token before issuing its replacement.
        await revoke_refresh_token(db, payload.get("jti"))
        access_token = await _issue_session(db, response, user)

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(status_code=500, detail="Token refresh failed")


@router.get("/me")
async def get_current_user(user: Dict[str, Any] = Depends(get_current_user_doc)):
    """
    Return the signed-in user.

    Resolves the token from the Authorization header or the access_token
    cookie. Header-only meant AuthContext (which sends cookies and no header)
    always got a 401, so the session never survived a page reload.
    """
    return user
