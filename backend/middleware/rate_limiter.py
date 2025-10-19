"""
Rate Limiting Middleware for Authentication Endpoints
Prevents brute force attacks by limiting login attempts
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta
from collections import defaultdict
import asyncio

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 5, window_seconds: int = 300):
        super().__init__(app)
        self.max_requests = max_requests  # Maximum requests allowed
        self.window_seconds = window_seconds  # Time window in seconds (5 minutes default)
        self.requests = defaultdict(list)  # Store requests by IP
        self.lock = asyncio.Lock()
    
    async def dispatch(self, request: Request, call_next):
        # Only apply rate limiting to auth endpoints
        if not request.url.path.startswith("/api/auth/login") and \
           not request.url.path.startswith("/api/auth/register"):
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host
        current_time = datetime.now()
        
        async with self.lock:
            # Clean old requests outside the time window
            self.requests[client_ip] = [
                req_time for req_time in self.requests[client_ip]
                if current_time - req_time < timedelta(seconds=self.window_seconds)
            ]
            
            # Check if rate limit exceeded
            if len(self.requests[client_ip]) >= self.max_requests:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "too_many_requests",
                        "message": "تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول. يرجى المحاولة بعد 5 دقائق.",
                        "retry_after": self.window_seconds
                    }
                )
            
            # Add current request
            self.requests[client_ip].append(current_time)
        
        # Process the request
        response = await call_next(request)
        return response

