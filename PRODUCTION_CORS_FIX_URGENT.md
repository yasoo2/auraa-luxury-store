# 🚨 URGENT: Production CORS Fix for api.auraaluxury.com

## Problem
```
Access to fetch at 'https://api.auraaluxury.com/api/*' 
from origin 'https://www.auraaluxury.com' 
has been blocked by CORS policy
```

## Root Cause
The backend server on Render (api.auraaluxury.com) is not allowing requests from www.auraaluxury.com

## Solution Steps

### Option 1: Fix on Render (If backend is on Render)

1. **Check Render Environment Variables**
   - Login to render.com
   - Go to your backend service
   - Check Environment Variables
   - Make sure CORS settings allow `www.auraaluxury.com`

2. **Verify Backend CORS Configuration**
   Your backend code already has CORS configured for:
   - `https://auraaluxury.com`
   - `https://www.auraaluxury.com` ✅
   - `https://api.auraaluxury.com`
   
   **BUT** - The server might not be reading the latest code!

3. **Force Render to Re-deploy**
   - Go to Render Dashboard
   - Click "Manual Deploy" → "Deploy latest commit"
   - Or push a small change to trigger auto-deploy

4. **Check Render Logs**
   ```bash
   # Look for CORS-related errors in logs
   # Check if server is starting correctly
   ```

### Option 2: Add CORS Headers via Render.yaml

Create `/render.yaml` in your backend root:

```yaml
services:
  - type: web
    name: auraa-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn server:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: PYTHON_VERSION
        value: 3.11
    headers:
      - path: /*
        name: Access-Control-Allow-Origin
        value: https://www.auraaluxury.com
      - path: /*
        name: Access-Control-Allow-Methods
        value: GET, POST, PUT, DELETE, OPTIONS
      - path: /*
        name: Access-Control-Allow-Headers
        value: "*"
      - path: /*
        name: Access-Control-Allow-Credentials
        value: "true"
```

### Option 3: Quick Test - Allow All Origins (TEMPORARY ONLY)

**⚠️ FOR TESTING ONLY - NOT FOR PRODUCTION**

In `/app/backend/server.py`, temporarily change:

```python
allowed_origins = [
    "*",  # Allow all (TEMPORARY!)
]
```

Then redeploy to see if CORS is the issue.

If it works, revert to specific origins and redeploy properly.

---

## Current Backend CORS Config (Already Correct!)

Your code in `/app/backend/server.py` already allows:

```python
allowed_origins = [
    "https://auraaluxury.com",
    "https://www.auraaluxury.com",  ✅
    "https://api.auraaluxury.com",
    "https://auraa-ecom-fix.preview.emergentagent.com",
    "https://auraa-admin-1.emergent.host",
    "http://localhost:3000",
    "http://localhost:8001",
]
```

**This is CORRECT!** The problem is likely:
1. Old version deployed on Render
2. Render not picking up the latest code
3. Environment variables not set correctly

---

## Quick Diagnosis Commands

### Check what's actually running on api.auraaluxury.com:

```bash
# Test CORS headers
curl -I -X OPTIONS https://api.auraaluxury.com/api/categories \
  -H "Origin: https://www.auraaluxury.com" \
  -H "Access-Control-Request-Method: GET"

# Expected response should include:
# Access-Control-Allow-Origin: https://www.auraaluxury.com
# Access-Control-Allow-Credentials: true
```

### Test from browser console (on www.auraaluxury.com):

```javascript
fetch('https://api.auraaluxury.com/api/', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Accept': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## Action Items (IN ORDER)

1. ✅ **Check Render Dashboard**
   - Is backend service running?
   - When was last deployment?
   - Any errors in logs?

2. ✅ **Force Re-deploy on Render**
   - Manual deploy from dashboard
   - OR push a small commit to trigger auto-deploy

3. ✅ **Wait 2-3 minutes for deployment**

4. ✅ **Test again from www.auraaluxury.com**

5. ✅ **Check browser console** - CORS errors should be gone

---

## If Still Not Working

### Last Resort: Check Render Service Settings

1. **Domain Configuration**
   - Ensure `api.auraaluxury.com` is properly configured
   - Check DNS settings
   - Verify SSL certificate

2. **Service Configuration**
   - Check if there's a reverse proxy (nginx) blocking CORS
   - Check if Render's edge network is stripping headers

3. **Contact Support**
   - If all else fails, contact Render support
   - They might have additional security settings blocking CORS

---

## Status: WAITING FOR YOUR ACTION

Please:
1. Login to Render.com
2. Find your backend service
3. Click "Manual Deploy"
4. Wait 2-3 minutes
5. Test www.auraaluxury.com again

**Let me know the result!**
