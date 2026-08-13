"""
Authentication Routes
Handles user registration, login, OAuth, and token management
"""
from fastapi import APIRouter, HTTPException, Depends, Response, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import hashlib
import html
import os
import logging
import re
import secrets
import uuid
from urllib.parse import quote

from pymongo import ReturnDocument

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

RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "30"))
RESET_TOKEN_BYTES = 32
PUBLIC_SITE_URL = os.getenv("STORE_PUBLIC_URL", "https://auraaluxury.com").rstrip("/")


def _normalise_email(email: str) -> str:
    return email.strip().lower()


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _reset_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)


# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    phone: Optional[str] = None
    # The sign-up form asks for these two and always has. They were not on the
    # model, so pydantic dropped them and every customer was stored under the
    # local part of their email address.
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    country: Optional[str] = None


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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=32, max_length=256)
    new_password: str = Field(min_length=8, max_length=256)


# Helper Functions
async def _issue_session(db, response: Response, user: Dict[str, Any]) -> str:
    """
    Mint an access/refresh pair for `user`, record the refresh token's jti,
    and set both as HttpOnly cookies. Returns the access token so callers can
    also return it in the body for clients that use the Authorization header.
    """
    claims = {
        "sub": user["email"],
        "user_id": user["id"],
        "auth_version": int(user.get("auth_version", 0)),
    }

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
        full_name = " ".join(
            part for part in [user.first_name, user.last_name] if part
        ).strip()

        user_data = {
            "id": str(uuid.uuid4()),
            "email": user.email,
            "password": hash_password(user.password),
            "name": user.name or full_name or user.email.split('@')[0],
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "country": user.country,
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


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Start a password reset without revealing whether the email exists.

    Only a SHA-256 hash of the random token is persisted. The raw token is sent
    once by email and cannot be recovered from the database if it is exposed.
    """
    generic = {
        "success": True,
        "message": "If the account exists, a password reset link has been sent.",
    }
    email = _normalise_email(str(payload.email))
    db = request.app.state.db

    user = await db.users.find_one({"email": email})
    if not user:
        user = await db.users.find_one(
            {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}
        )

    # OAuth-only accounts do not have a password to reset. They receive the same
    # response so this endpoint cannot be used as an account-enumeration oracle.
    if not user or not user.get("password") or user.get("is_active") is False:
        return generic

    raw_token = secrets.token_urlsafe(RESET_TOKEN_BYTES)
    now = datetime.now(timezone.utc)
    expires_at = _reset_expiry()
    await db.password_reset_tokens.delete_many({"user_id": user["id"]})
    await db.password_reset_tokens.insert_one({
        "token_hash": _hash_reset_token(raw_token),
        "user_id": user["id"],
        "created_at": now,
        "expires_at": expires_at,
        "used_at": None,
    })

    reset_url = f"{PUBLIC_SITE_URL}/reset-password?token={quote(raw_token)}"
    try:
        from services.email_service import send_password_reset_email
        background_tasks.add_task(
            send_password_reset_email,
            user.get("email") or email,
            user.get("name") or email.split("@", 1)[0],
            reset_url,
        )
    except Exception:
        # Email delivery is best effort; the generic response must remain the
        # same and the token stays in the database for operational inspection.
        logger.exception("Could not queue password reset email")

    return generic


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, request: Request):
    """Consume one valid reset token and invalidate the user's sessions."""
    token_hash = _hash_reset_token(payload.token)
    now = datetime.now(timezone.utc)
    reset_doc = await request.app.state.db.password_reset_tokens.find_one_and_update(
        {
            "token_hash": token_hash,
            "used_at": None,
            "expires_at": {"$gt": now},
        },
        {"$set": {"used_at": now}},
        return_document=ReturnDocument.BEFORE,
    )
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    db = request.app.state.db
    user = await db.users.find_one({"id": reset_doc["user_id"]})
    if not user or user.get("is_active") is False:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    hashed = bcrypt.hashpw(payload.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password": hashed,
            "updated_at": now.isoformat(),
            # Incrementing the version invalidates every session issued before
            # this reset. New login/refresh sessions carry the new version.
            "auth_version": int(user.get("auth_version", 0)) + 1,
        }},
    )

    return {"success": True, "message": "Password reset successfully"}


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

        # Registration stores the address exactly as it was typed, while Google
        # reports it lowercased. Matching only the lowercase form would miss an
        # account registered as "Name@Gmail.com" and silently create a second
        # one — losing that customer's orders, wishlist and admin rights. Try
        # the exact form first, then fall back to a case-insensitive match.
        user_data = await db.users.find_one({"email": email})
        if not user_data:
            user_data = await db.users.find_one(
                {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}
            )

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

        token_version = payload.get("auth_version")
        if token_version is not None and int(token_version) != int(user.get("auth_version", 0)):
            raise HTTPException(status_code=401, detail="Session expired; please sign in again")

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


class ProfileUpdate(BaseModel):
    """
    The fields a signed-in person may change about themselves.

    Deliberately not `email`: the address identifies the account and is what a
    password reset would be sent to, so changing it is an account operation
    with its own confirmation, not a profile edit. The screen sends it anyway
    (it renders it in the form) and it is ignored here rather than trusted.
    """
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[Dict[str, Any]] = None


@router.put("/profile")
async def update_profile(
    payload: ProfileUpdate,
    request: Request,
    user: Dict[str, Any] = Depends(get_current_user_doc),
):
    """
    Save a customer's own details.

    The profile screen has always called PUT /api/auth/profile — for the name,
    the phone, and the delivery address — and this route did not exist. Every
    save answered 404, the screen said "failed to update", and a customer could
    not store the address their order would be shipped to.
    """
    db = request.app.state.db
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": user["id"]}, {"$set": updates})

    saved = await db.users.find_one({"id": user["id"]})
    if saved:
        saved.pop("_id", None)
        saved.pop("password", None)
        saved.pop("hashed_password", None)
    # `success` is what the screen checks before it tells the customer their
    # details were saved.
    return {"success": True, "user": saved}
