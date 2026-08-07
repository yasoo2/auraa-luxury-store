"""
Which origins this API trusts.

Lives here rather than in server.py because two unrelated places need the same
answer: the CORS middleware, and the OAuth route — which must refuse to build a
sign-in URL that would send the customer back to somebody else's site.
"""

import logging
import os
import re
from typing import Optional
from urllib.parse import urlsplit

logger = logging.getLogger(__name__)

DEFAULT_ORIGINS = [
    "https://auraaluxury.com",
    "https://www.auraaluxury.com",
    "https://api.auraaluxury.com",
    "http://localhost:3000",
    "http://localhost:8001",
]

# Preview deployments. Previously any origin merely *containing* ".vercel.app"
# was allowed with credentials, so https://evil.vercel.app — or even
# https://vercel.app.attacker.com — could read authenticated responses on
# behalf of a signed-in user. This anchors the match to the project's own
# preview subdomains and requires a full-host match.
DEFAULT_PREVIEW_PATTERN = r'^https://[a-z0-9-]*auraa[a-z0-9-]*\.vercel\.app$'

# Localhost on any port, for local development only.
LOCALHOST_RE = re.compile(r'^http://(localhost|127\.0\.0\.1)(:\d+)?$')


def _load_origins() -> list:
    raw = os.getenv('CORS_ORIGINS', '')
    origins = [o.strip() for o in raw.split(',') if o.strip()]
    return origins or list(DEFAULT_ORIGINS)


def _load_preview_re():
    pattern = os.getenv('CORS_PREVIEW_REGEX', DEFAULT_PREVIEW_PATTERN)
    try:
        return re.compile(pattern), pattern
    except re.error as e:
        logger.error(f"Invalid CORS_PREVIEW_REGEX ({e}); preview origins disabled")
        return None, pattern


allowed_origins = _load_origins()
PREVIEW_ORIGIN_RE, _preview_pattern = _load_preview_re()

logger.info(
    f"✅ CORS: {len(allowed_origins)} exact origins, "
    f"preview pattern={_preview_pattern!r}"
)


def is_origin_allowed(origin: Optional[str]) -> bool:
    """Exact-match an origin, or match the anchored preview/localhost patterns."""
    if not origin:
        return False
    if origin in allowed_origins:
        return True
    if PREVIEW_ORIGIN_RE and PREVIEW_ORIGIN_RE.match(origin):
        return True
    return bool(LOCALHOST_RE.match(origin))


def is_url_on_allowed_origin(url: Optional[str]) -> bool:
    """
    Same question for a full URL rather than a bare origin — used to vet the
    OAuth return address before it is handed to Google.
    """
    if not url:
        return False
    parts = urlsplit(url)
    if not parts.scheme or not parts.netloc:
        return False
    return is_origin_allowed(f"{parts.scheme}://{parts.netloc}")
