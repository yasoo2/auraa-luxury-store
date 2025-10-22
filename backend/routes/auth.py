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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# JWT Configuration
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 3650  # 10 years for "forever" sessions


# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    turnstile_token: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


# Helper Functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict):
    """Create long-lived refresh token (10 years)"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


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
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user_data["id"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(
            data={"sub": user.email, "user_id": user_data["id"]}
        )
        
        # Set refresh token as HttpOnly cookie (10 years)
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60  # 10 years in seconds
        )
        
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
        
        # Find user
        user = await db.users.find_one({"email": credentials.email})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password
        if not verify_password(credentials.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": user["email"], "user_id": user["id"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(
            data={"sub": user["email"], "user_id": user["id"]}
        )
        
        # Set refresh token as HttpOnly cookie (10 years)
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        )
        
        # Return user data (without password)
        user.pop("password", None)
        user.pop("_id", None)
        
        logger.info(f"✅ User logged in: {credentials.email}")
        
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
async def logout(response: Response):
    """
    Logout user by clearing refresh token cookie
    """
    response.delete_cookie(key="refresh_token")
    return {"message": "Logged out successfully"}


@router.get("/oauth/google/url")
async def google_oauth_url(redirect_url: str):
    """
    Get Google OAuth URL for authentication
    """
    try:
        from services.auth.oauth_service import get_google_oauth_url
        
        oauth_url = await get_google_oauth_url(redirect_url)
        return {"url": oauth_url}
        
    except ImportError:
        logger.error("OAuth service not available")
        raise HTTPException(status_code=501, detail="OAuth not implemented")
    except Exception as e:
        logger.error(f"OAuth URL generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/oauth/google/callback")
async def google_oauth_callback(code: str, request: Request, response: Response):
    """
    Handle Google OAuth callback
    """
    try:
        from services.auth.oauth_service import handle_google_callback
        
        db = request.app.state.db
        user_data = await handle_google_callback(code, db)
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": user_data["email"], "user_id": user_data["id"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(
            data={"sub": user_data["email"], "user_id": user_data["id"]}
        )
        
        # Set refresh token cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }
        
    except ImportError:
        logger.error("OAuth service not available")
        raise HTTPException(status_code=501, detail="OAuth not implemented")
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    """
    Refresh access token using refresh token from cookie
    """
    try:
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise HTTPException(status_code=401, detail="No refresh token")
        
        # Decode and verify refresh token
        try:
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            user_id = payload.get("user_id")
            
            if not email or not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Refresh token expired")
        except jwt.JWTError:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        # Create new access token
        access_token = create_access_token(
            data={"sub": email, "user_id": user_id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
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
async def get_current_user(request: Request):
    """
    Get current user info from access token
    """
    try:
        # Get token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        token = auth_header.split(" ")[1]
        
        # Decode token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("user_id")
            
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
                
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user from database
        db = request.app.state.db
        user = await db.users.find_one({"id": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Remove sensitive data
        user.pop("password", None)
        user.pop("_id", None)
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user info")
