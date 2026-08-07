"""
Single source of truth for JWT handling and auth dependencies.

Before this module the signing key was read in three places under two
different env var names (`JWT_SECRET_KEY` in routes/auth.py and server.py,
`SECRET_KEY` in middleware/auth.py), each with the same public fallback
string. Tokens minted by one component could not be verified by another,
and any deployment missing the env var silently signed with a key that is
committed to a public repository.
"""
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

import jwt
from fastapi import Depends, HTTPException, Request

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Was 3650 days (10 years). A leaked refresh token was effectively a
# permanent account takeover, since nothing could invalidate it.
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "90"))

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"

_DEV_SECRET = "dev-only-insecure-key-never-use-in-production"


def _load_secret() -> str:
    """
    Resolve the signing key, preferring JWT_SECRET_KEY and accepting the
    legacy SECRET_KEY name so existing deployments keep working.

    Refuses to start in production rather than falling back to a known key.
    """
    secret = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY")
    if secret:
        return secret

    if os.getenv("ENV", "production").lower() in ("production", "prod"):
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. Refusing to start in production: "
            "falling back to a hardcoded key would let anyone forge admin tokens."
        )

    logger.warning("⚠️  JWT_SECRET_KEY not set — using an insecure development key.")
    return _DEV_SECRET


SECRET_KEY = _load_secret()


# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> tuple[str, str]:
    """
    Create a refresh token carrying a unique `jti` so it can be revoked.
    Returns (token, jti).
    """
    jti = str(uuid.uuid4())
    to_encode = data.copy()
    to_encode.update({
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
        "jti": jti,
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM), jti


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and verify a token, raising 401 on any failure."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        # PyJWT's base class is PyJWTError. `jwt.JWTError` (python-jose's name)
        # does not exist here and raised AttributeError, surfacing as a 500.
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Refresh token revocation
# ---------------------------------------------------------------------------

async def revoke_refresh_token(db, jti: str) -> None:
    if jti:
        await db.revoked_tokens.update_one(
            {"jti": jti},
            {"$set": {"jti": jti, "revoked_at": datetime.now(timezone.utc)}},
            upsert=True,
        )


async def is_refresh_token_revoked(db, jti: Optional[str]) -> bool:
    # Tokens minted before revocation existed carry no jti. Treat them as
    # valid so this change does not log every existing user out; they are
    # replaced with a revocable token on their next refresh.
    if not jti:
        return False
    return await db.revoked_tokens.find_one({"jti": jti}) is not None


# ---------------------------------------------------------------------------
# Cookies
# ---------------------------------------------------------------------------

def _cookie_kwargs() -> Dict[str, Any]:
    """
    Cookie flags.

    SameSite=None is required in production because the frontend
    (auraaluxury.com / *.vercel.app) and the API (api.auraaluxury.com) are
    different sites, and SameSite=Lax would drop the cookie on those
    cross-site XHRs. SameSite=None requires Secure.

    Both are configurable because Secure cookies are never sent over plain
    HTTP, which would break local development and test clients.
    """
    cross_site = os.getenv("COOKIE_CROSS_SITE", "true").lower() == "true"
    secure = os.getenv("COOKIE_SECURE", "true").lower() == "true"

    # SameSite=None without Secure is rejected by browsers; fall back to Lax.
    samesite = "none" if (cross_site and secure) else "lax"

    return {"httponly": True, "secure": secure, "samesite": samesite}


def set_auth_cookies(response, access_token: str, refresh_token: str) -> None:
    """
    Set both tokens as HttpOnly cookies.

    The access token is also sent as a cookie so that requests which cannot
    attach an Authorization header (api.js uses bare fetch with
    credentials:'include') still authenticate, and so the session survives a
    page reload.
    """
    flags = _cookie_kwargs()
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **flags,
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        **flags,
    )


def clear_auth_cookies(response) -> None:
    for key in (ACCESS_COOKIE, REFRESH_COOKIE):
        response.delete_cookie(key=key, **_cookie_kwargs())


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

def extract_token(request: Request) -> Optional[str]:
    """
    Resolve the access token from the Authorization header, falling back to
    the access_token cookie.

    Both are needed: admin pages send `Authorization: Bearer <localStorage
    token>`, while api.js sends cookies only.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        # Admin pages send the literal "null"/"undefined" when localStorage is
        # empty; treat that as absent so the cookie can still be used.
        if token and token not in ("null", "undefined"):
            return token

    return request.cookies.get(ACCESS_COOKIE)


async def get_current_user_doc(request: Request) -> Dict[str, Any]:
    """Resolve the caller as a raw user document."""
    token = extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if payload.get("type") == "refresh":
        raise HTTPException(status_code=401, detail="Refresh token cannot be used for access")

    # routes/auth.py puts the id in `user_id` and the email in `sub`; older
    # tokens put the id in `sub`. Accept both so existing sessions keep working.
    user_id = payload.get("user_id") or payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = request.app.state.db
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user.pop("_id", None)
    user.pop("password", None)
    return user


async def require_admin_doc(request: Request) -> Dict[str, Any]:
    user = await get_current_user_doc(request)
    if not (user.get("is_admin") or user.get("is_super_admin")):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_super_admin_doc(request: Request) -> Dict[str, Any]:
    user = await get_current_user_doc(request)
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user
