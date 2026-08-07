# Multi-Method Authentication System - Implementation Plan
## AuraaLuxury E-Commerce Platform

**Date**: January 28, 2025  
**Status**: Planning Phase

---

## 🎯 Overview

Implementing comprehensive authentication system with:
- ✅ Email + Password (existing)
- ✅ Phone + Password (just implemented)
- 🔨 Google OAuth (Emergent Auth)
- 🔨 Facebook OAuth (Emergent Auth)
- 🔨 Twitter OAuth (Emergent Auth)
- 🔨 Email Verification (OTP)
- 🔨 Phone Verification (SMS OTP via Twilio)
- 🔨 Password Reset (Email + SMS)
- 🔨 Account Linking/Unlinking
- 🔨 Security Features (Rate Limiting, Brute-force Protection)

---

## 📋 Implementation Phases

### Phase 1: Foundation & OAuth Setup ⏳
**Estimated Time**: 3-4 hours

#### 1.1 Install Dependencies
```bash
# Backend
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
pip install twilio
pip install slowapi  # Rate limiting

# Frontend
yarn add @react-oauth/google
```

#### 1.2 Database Schema Updates
**New Collections:**
- `auth_sessions` - OAuth sessions (7-day expiry)
- `verification_codes` - Email/SMS OTPs
- `linked_accounts` - Social account links

**Update `users` collection:**
```json
{
  "id": "uuid",
  "email": "string (unique)",
  "phone": "string (unique, E.164 format)",
  "password": "string (hashed, optional if OAuth only)",
  "first_name": "string",
  "last_name": "string",
  "is_admin": "boolean",
  "email_verified": "boolean",
  "phone_verified": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime",
  "last_login": "datetime",
  "login_attempts": "int",
  "locked_until": "datetime (optional)",
  "linked_accounts": [
    {
      "provider": "google|facebook|twitter",
      "provider_id": "string",
      "email": "string",
      "name": "string",
      "picture": "string",
      "linked_at": "datetime"
    }
  ]
}
```

#### 1.3 Environment Variables
```env
# OAuth
OAUTH_GOOGLE_ENABLED=true
OAUTH_FACEBOOK_ENABLED=true
OAUTH_TWITTER_ENABLED=true

# Login Methods
LOGIN_WITH_EMAIL=true
LOGIN_WITH_PHONE=true

# OAuth URLs
OAUTH_REDIRECT_URL=https://auraaluxury.com/dashboard
EMERGENT_AUTH_URL=https://auth.emergentagent.com
EMERGENT_SESSION_API=https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_ENABLED=true

# Security
RATE_LIMIT_LOGIN=5/minute
RATE_LIMIT_OTP=3/minute
BRUTE_FORCE_THRESHOLD=5
BRUTE_FORCE_LOCKOUT_MINUTES=15

# Session
SESSION_EXPIRY_DAYS=7
OTP_EXPIRY_MINUTES=10
```

---

### Phase 2: OAuth Implementation (Google) 🔨
**Estimated Time**: 2-3 hours

#### 2.1 Backend OAuth Endpoints

**File**: `/app/backend/auth/oauth.py` (new)
```python
from fastapi import APIRouter, HTTPException, Response, Header
from datetime import datetime, timezone, timedelta
import httpx

router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

@router.get("/google/url")
async def get_google_oauth_url(redirect_url: str):
    """Get Google OAuth URL"""
    oauth_url = f"https://auth.emergentagent.com/?redirect={quote(redirect_url)}"
    return {"url": oauth_url}

@router.post("/session")
async def process_oauth_session(
    x_session_id: str = Header(..., alias="X-Session-ID")
):
    """Process OAuth session ID and get user data"""
    # Call Emergent API
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": x_session_id}
        )
    
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    data = response.json()
    # Return: id, email, name, picture, session_token
    
    # Check if user exists by email
    user = await db.users.find_one({"email": data["email"]})
    
    if not user:
        # New user - needs phone number
        return {
            "status": "needs_phone",
            "temp_data": data,
            "session_token": data["session_token"]
        }
    
    # Existing user - link OAuth account
    if not any(acc["provider"] == "google" for acc in user.get("linked_accounts", [])):
        await db.users.update_one(
            {"email": data["email"]},
            {"$push": {"linked_accounts": {
                "provider": "google",
                "provider_id": data["id"],
                "email": data["email"],
                "name": data["name"],
                "picture": data["picture"],
                "linked_at": datetime.now(timezone.utc).isoformat()
            }}}
        )
    
    # Store session in database
    await db.auth_sessions.insert_one({
        "session_token": data["session_token"],
        "user_id": user["id"],
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7)
    })
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "status": "success",
        "access_token": access_token,
        "session_token": data["session_token"],
        "user": {k: v for k, v in user.items() if k != "password"}
    }

@router.post("/complete-phone")
async def complete_phone_registration(
    temp_data: dict,
    phone: str,
    otp_code: str
):
    """Complete OAuth registration by adding phone number"""
    # Verify OTP
    # Create user account
    # Link OAuth account
    # Return tokens
    pass
```

#### 2.2 Frontend OAuth Integration

**File**: `/app/frontend/src/components/OAuthButtons.js` (new)
```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const OAuthButtons = () => {
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  const handleGoogleLogin = async () => {
    try {
      // Get OAuth URL
      const response = await axios.get(`${BACKEND_URL}/api/auth/oauth/google/url`, {
        params: { redirect_url: `${window.location.origin}/dashboard` }
      });
      
      // Redirect to Emergent Auth
      window.location.href = response.data.url;
    } catch (error) {
      console.error('OAuth error:', error);
    }
  };
  
  return (
    <div className="space-y-3">
      <button
        onClick={handleGoogleLogin}
        className="w-full bg-white text-gray-700 border border-gray-300 rounded-xl px-4 py-3 flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors"
      >
        <img src="/google-icon.svg" alt="Google" className="h-5 w-5" />
        <span>Continue with Google</span>
      </button>
      
      {/* Facebook & Twitter buttons */}
    </div>
  );
};

export default OAuthButtons;
```

**File**: `/app/frontend/src/pages/OAuthCallback.js` (new)
```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  
  useEffect(() => {
    const processOAuth = async () => {
      // Get session_id from URL fragment
      const fragment = window.location.hash.substring(1);
      const params = new URLSearchParams(fragment);
      const sessionId = params.get('session_id');
      
      if (!sessionId) {
        setStatus('error');
        return;
      }
      
      try {
        // Process session
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/auth/oauth/session`,
          {},
          { headers: { 'X-Session-ID': sessionId } }
        );
        
        if (response.data.status === 'needs_phone') {
          // Redirect to phone collection
          sessionStorage.setItem('temp_oauth_data', JSON.stringify(response.data.temp_data));
          navigate('/auth/complete-phone');
        } else {
          // Login successful
          localStorage.setItem('token', response.data.access_token);
          // Set cookie for session_token
          document.cookie = `session_token=${response.data.session_token}; path=/; secure; samesite=none; max-age=${7*24*60*60}`;
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('OAuth processing error:', error);
        setStatus('error');
      }
    };
    
    processOAuth();
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      {status === 'processing' && <div>Processing login...</div>}
      {status === 'error' && <div>Authentication failed</div>}
    </div>
  );
};

export default OAuthCallback;
```

---

### Phase 3: Phone Verification (SMS OTP) 🔨
**Estimated Time**: 2 hours

#### 3.1 Backend SMS Service

**File**: `/app/backend/services/sms_service.py` (new)
```python
from twilio.rest import Client
import os
import random

class SMSService:
    def __init__(self):
        self.account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        self.auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        self.phone_number = os.environ.get('TWILIO_PHONE_NUMBER')
        self.enabled = os.environ.get('TWILIO_ENABLED', 'false').lower() == 'true'
        
        if self.enabled:
            self.client = Client(self.account_sid, self.auth_token)
    
    def generate_otp(self):
        """Generate 6-digit OTP"""
        return str(random.randint(100000, 999999))
    
    async def send_otp(self, phone: str, otp: str):
        """Send OTP via SMS"""
        if not self.enabled:
            print(f"SMS disabled. OTP for {phone}: {otp}")
            return True
        
        try:
            message = self.client.messages.create(
                body=f"Your Auraa Luxury verification code is: {otp}",
                from_=self.phone_number,
                to=phone
            )
            return message.sid
        except Exception as e:
            print(f"SMS error: {e}")
            return False

sms_service = SMSService()
```

#### 3.2 OTP Endpoints

**File**: `/app/backend/server.py` (add endpoints)
```python
@api_router.post("/auth/send-phone-otp")
async def send_phone_otp(phone: str):
    """Send OTP to phone number"""
    # Rate limiting check
    # Normalize phone to E.164
    # Generate OTP
    otp = sms_service.generate_otp()
    
    # Store in database
    await db.verification_codes.insert_one({
        "phone": phone,
        "code": otp,
        "type": "phone_verification",
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
    })
    
    # Send SMS
    await sms_service.send_otp(phone, otp)
    
    return {"message": "OTP sent"}

@api_router.post("/auth/verify-phone-otp")
async def verify_phone_otp(phone: str, code: str):
    """Verify phone OTP"""
    # Find OTP
    otp_record = await db.verification_codes.find_one({
        "phone": phone,
        "code": code,
        "type": "phone_verification",
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Mark as verified
    await db.verification_codes.delete_one({"_id": otp_record["_id"]})
    
    return {"verified": True}
```

---

### Phase 4: Email Verification 🔨
**Estimated Time**: 1 hour

Similar to phone verification but using existing email service.

---

### Phase 5: Password Reset (Email + SMS) 🔨
**Estimated Time**: 2 hours

Support password reset via:
1. Email (send reset link with token)
2. SMS (send OTP to phone)

---

### Phase 6: Security Features 🔨
**Estimated Time**: 2 hours

#### 6.1 Rate Limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@api_router.post("/auth/login")
@limiter.limit("5/minute")
async def login(...):
    pass
```

#### 6.2 Brute-force Protection
```python
async def check_brute_force(identifier: str):
    user = await db.users.find_one({
        "$or": [{"email": identifier}, {"phone": identifier}]
    })
    
    if user and user.get("locked_until"):
        if user["locked_until"] > datetime.now(timezone.utc):
            raise HTTPException(status_code=423, detail="Account temporarily locked")
    
    return user

async def record_failed_login(user_id: str):
    user = await db.users.find_one({"id": user_id})
    attempts = user.get("login_attempts", 0) + 1
    
    update_data = {"login_attempts": attempts}
    
    if attempts >= 5:
        update_data["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
```

---

### Phase 7: Profile Security Settings 🔨
**Estimated Time**: 2 hours

**File**: `/app/frontend/src/pages/ProfileSecurity.js` (new)
```jsx
const ProfileSecurity = () => {
  return (
    <div>
      {/* Linked Accounts */}
      <div className="linked-accounts">
        <h3>Linked Accounts</h3>
        {/* Google */}
        {googleLinked ? (
          <button onClick={unlinkGoogle}>Unlink Google</button>
        ) : (
          <button onClick={linkGoogle}>Link Google</button>
        )}
        {/* Facebook, Twitter */}
      </div>
      
      {/* Change Password */}
      {/* Two-Factor Auth (future) */}
      {/* Active Sessions */}
    </div>
  );
};
```

---

## 🧪 Testing Plan

### Test Scenarios

**1. New User Registration (Email + Phone)**
- [ ] Register with email + phone + password
- [ ] Receive email verification code
- [ ] Receive SMS verification code
- [ ] Verify both
- [ ] Login with email
- [ ] Login with phone

**2. OAuth First-Time Login**
- [ ] Click "Continue with Google"
- [ ] Complete Google OAuth
- [ ] Redirect to phone collection page
- [ ] Enter phone number
- [ ] Receive SMS OTP
- [ ] Verify OTP
- [ ] Complete registration
- [ ] Subsequent login via Google (no phone prompt)

**3. OAuth with Existing Account**
- [ ] Existing user (registered via email)
- [ ] Login with Google (same email)
- [ ] Google account linked automatically
- [ ] Can login via email OR Google

**4. Password Reset**
- [ ] Forgot password → Enter email
- [ ] Receive reset link
- [ ] Reset password
- [ ] Forgot password → Enter phone
- [ ] Receive SMS OTP
- [ ] Reset password

**5. Account Linking**
- [ ] Login with email
- [ ] Go to Profile → Security
- [ ] Link Google account
- [ ] Link Facebook account
- [ ] Unlink Google account
- [ ] Login methods updated

**6. Security**
- [ ] 5 failed login attempts
- [ ] Account locked for 15 minutes
- [ ] Rate limiting on OTP requests
- [ ] Rate limiting on login attempts

---

## 📝 API Documentation

### New Endpoints

```
POST /api/auth/oauth/google/url
GET  /api/auth/oauth/session
POST /api/auth/oauth/complete-phone
POST /api/auth/send-email-otp
POST /api/auth/verify-email-otp
POST /api/auth/send-phone-otp
POST /api/auth/verify-phone-otp
POST /api/auth/password-reset/request
POST /api/auth/password-reset/verify
POST /api/auth/password-reset/confirm
GET  /api/auth/linked-accounts
POST /api/auth/link-account
POST /api/auth/unlink-account
POST /api/auth/logout
```

---

## 🚀 Deployment Steps

1. **Environment Variables**: Set all required variables on Render/Vercel
2. **Database Migration**: Create new collections
3. **Twilio Setup**: Get account SID, auth token, phone number
4. **Test OAuth Flow**: Verify Emergent Auth integration
5. **Deploy Backend**: Push to Render
6. **Deploy Frontend**: Push to Vercel
7. **Test Production**: Run all test scenarios

---

## 📊 Timeline

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| 1 | Foundation & Setup | 3-4h | ⏳ |
| 2 | Google OAuth | 2-3h | ⏳ |
| 3 | Phone Verification | 2h | ⏳ |
| 4 | Email Verification | 1h | ⏳ |
| 5 | Password Reset | 2h | ⏳ |
| 6 | Security Features | 2h | ⏳ |
| 7 | Profile Settings | 2h | ⏳ |
| 8 | Testing & Docs | 2h | ⏳ |

**Total Estimated Time**: 16-18 hours

---

## 🎯 Success Criteria

- [x] User can register with email + phone + password
- [x] User can login with email OR phone + password
- [ ] User can login with Google OAuth
- [ ] User can login with Facebook OAuth
- [ ] User can login with Twitter OAuth
- [ ] Email verification working
- [ ] Phone verification (SMS OTP) working
- [ ] Password reset via email working
- [ ] Password reset via SMS working
- [ ] Account linking/unlinking working
- [ ] Rate limiting active
- [ ] Brute-force protection active
- [ ] All test scenarios pass

---

**Next Step**: Begin Phase 1 implementation
