"""
Rate limiting for authentication endpoints.

Prevents password guessing. This module existed but was never registered on
the app, so /api/auth/login accepted unlimited attempts.
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta
from collections import defaultdict
import asyncio
import logging

logger = logging.getLogger(__name__)

# Paths that are rate limited, matched as prefixes.
PROTECTED_PATHS = (
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/oauth/session",
)


def client_ip(request: Request) -> str:
    """
    Best-effort real client IP.

    Behind Render/Cloudflare, request.client.host is the proxy, so keying on
    it would lump every user into one bucket and lock out the whole site after
    five failed logins from anyone.
    """
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Leftmost entry is the original client.
        return forwarded.split(",")[0].strip()

    return request.client.host if request.client else "unknown"


# Buckets live at module level so they can be inspected and cleared without a
# handle on the middleware instance (which Starlette builds internally).
_buckets = defaultdict(list)
_lock = asyncio.Lock()


def reset_rate_limits() -> None:
    """Clear all rate-limit state. Used by tests and for operational resets."""
    _buckets.clear()


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 10, window_seconds: int = 300):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = _buckets
        self.lock = _lock

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if not path.startswith(PROTECTED_PATHS):
            return await call_next(request)

        # Preflight carries no credentials and must not consume budget.
        if request.method == "OPTIONS":
            return await call_next(request)

        ip = client_ip(request)
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.window_seconds)

        async with self.lock:
            recent = [t for t in self.requests[ip] if t > cutoff]

            if len(recent) >= self.max_requests:
                self.requests[ip] = recent
                logger.warning(f"Rate limit hit for {ip} on {path}")
                # Returned rather than raised: HTTPException from middleware is
                # not handled by FastAPI's exception handlers and would surface
                # as a 500.
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": {
                            "error": "too_many_requests",
                            "message": "تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول. يرجى المحاولة بعد 5 دقائق.",
                            "retry_after": self.window_seconds,
                        }
                    },
                    headers={"Retry-After": str(self.window_seconds)},
                )

            recent.append(now)
            self.requests[ip] = recent

            # Bound memory: drop buckets that have fully aged out.
            if len(self.requests) > 10_000:
                for key in [k for k, v in self.requests.items() if not v or v[-1] <= cutoff]:
                    del self.requests[key]

        return await call_next(request)
