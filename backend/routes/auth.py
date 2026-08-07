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

from auth.oauth_service import (
    OAuthExchangeError,
    OAuthNotConfigured,
    SUPPORTED_PROVIDERS,
    oauth_service,
)
from core.origins import is_url_on_allowed_origin
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


class OAuthCallbackRequest(BaseModel):
    # The one-time authorization code Google put in the callback URL, plus the
    # exact redirect_uri it was issued for — Google requires the two to match.
    code: str
    redirect_uri: str
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


@router.get("/oauth/providers")
async def oauth_providers():
    """
    Which social sign-ins this deployment can actually perform.

    The sign-in page hides the Google button when this says false, so a store
    without credentials shows no button rather than one that fails on click.
    """
    return {"google": oauth_service.is_configured()}


@router.get("/oauth/{provider}/url")
async def oauth_url(provider: str, redirect_url: str, state: str):
    """
    Build the Google sign-in URL to send the browser to.

    `state` is generated by the frontend and checked again when the browser
    comes back, which is what stops an attacker from feeding a victim a
    prepared callback URL and signing them into the attacker's account.
    """
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    # Google enforces its own registered-URI list, but refusing an off-site
    # return address here means a misconfigured client fails loudly at our
    # door instead of quietly redirecting customers somewhere else.
    if not is_url_on_allowed_origin(redirect_url):
        raise HTTPException(status_code=400, detail="redirect_url is not an allowed origin")

    if not state or len(state) < 16:
        raise HTTPException(status_code=400, detail="state is required")

    try:
        return {"url": oauth_service.build_auth_url(provider, redirect_url, state)}
    except OAuthNotConfigured:
        logger.error("Google sign-in requested but GOOGLE_CLIENT_ID/SECRET are not set")
        raise HTTPException(status_code=503, detail="google_signin_unavailable")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/oauth/google/callback")
async def oauth_google_callback(
    payload: OAuthCallbackRequest, request: Request, response: Response
):
    """
    Trade Google's authorization code for an app session.

    Creates the account on first sign-in, or signs into the existing account
    with that email. Issues exactly the same tokens as a password login, so
    everything downstream is unaware of how the user got here.
    """
    if payload.provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {payload.provider}")

    if not is_url_on_allowed_origin(payload.redirect_uri):
        raise HTTPException(status_code=400, detail="redirect_uri is not an allowed origin")

    try:
        profile = await oauth_service.exchange_code(payload.code, payload.redirect_uri)
    except OAuthNotConfigured:
        raise HTTPException(status_code=503, detail="google_signin_unavailable")
    except OAuthExchangeError:
        raise HTTPException(status_code=401, detail="oauth_session_invalid")

    email = (profile.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=401, detail="oauth_session_invalid")

    # An unverified address must not be allowed to claim an existing account:
    # that is the whole attack. Google only reports false for a few Workspace
    # setups, so refusing costs almost nothing.
    if not profile.get("email_verified"):
        raise HTTPException(status_code=401, detail="google_email_not_verified")

    try:
        db = request.app.state.db
        user_data = await db.users.find_one({"email": email})

        if not user_data:
            # First sign-in via Google: create the account. No password is set,
            # so password login stays unavailable until the user sets one.
            user_data = {
                "id": str(uuid.uuid4()),
                "email": email,
                "name": profile.get("name") or email.split("@")[0],
                "picture": profile.get("picture"),
                "phone": None,
                "auth_provider": payload.provider,
                "google_sub": profile.get("sub"),
                "is_admin": False,
                "is_super_admin": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.users.insert_one(dict(user_data))
            logger.info(f"✅ New user registered via {payload.provider}: {email}")
        else:
            # Remember the Google account id so a later email change on their
            # side can still be matched to this record.
            if profile.get("sub") and not user_data.get("google_sub"):
                await db.users.update_one(
                    {"id": user_data["id"]},
                    {"$set": {"google_sub": profile["sub"],
                              "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
            logger.info(f"✅ User logged in via {payload.provider}: {email}")

        user_data.pop("password", None)
        user_data.pop("_id", None)

        access_token = await _issue_session(db, response, user_data)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data,
            # The callback page routes the user to add a phone number when true.
            "needs_phone": not user_data.get("phone"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth sign-in error: {e}")
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
