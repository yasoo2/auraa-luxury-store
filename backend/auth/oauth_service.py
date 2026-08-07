"""
Google sign-in, talking to Google directly.

This used to route through a third-party broker that shipped with the project
template: the browser was sent to auth.emergentagent.com and the session was
then exchanged at demobackend.emergentagent.com. That meant every customer's
sign-in — and their email address — passed through somebody else's demo
service, and when that service stopped honouring the exchange the button
started bouncing users back to the store still signed out.

The store now owns the flow end to end: an OAuth client in the store's own
Google Cloud project, the client secret held server-side and never sent to the
browser, and nothing between the customer and accounts.google.com.
"""

import os
import logging
from typing import Dict, Optional
from urllib.parse import urlencode

import httpx

logger = logging.getLogger(__name__)

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"
SCOPES = "openid email profile"

SUPPORTED_PROVIDERS = ("google",)


class OAuthNotConfigured(RuntimeError):
    """Raised when the store has no Google OAuth credentials set."""


class OAuthExchangeError(RuntimeError):
    """Raised when Google refuses the authorization code or the profile call."""


class GoogleOAuthService:
    # Read from the environment on each access rather than at import time, so a
    # credential added in the Render dashboard takes effect on restart without
    # any code change, and so the tests can set them per-case.
    @property
    def client_id(self) -> str:
        return (os.getenv("GOOGLE_CLIENT_ID") or "").strip()

    @property
    def client_secret(self) -> str:
        return (os.getenv("GOOGLE_CLIENT_SECRET") or "").strip()

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def build_auth_url(self, provider: str, redirect_uri: str, state: str) -> str:
        """
        The URL to send the browser to. `redirect_uri` must be one of the URIs
        registered on the OAuth client in Google Cloud — Google rejects
        anything else, which is what stops an attacker steering the callback
        at their own site.
        """
        if provider not in SUPPORTED_PROVIDERS:
            raise ValueError(f"Unsupported provider: {provider}")
        if not self.is_configured():
            raise OAuthNotConfigured("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set")

        return AUTH_ENDPOINT + "?" + urlencode({
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": SCOPES,
            "state": state,
            "access_type": "online",
            # Show the account chooser instead of silently reusing whichever
            # Google account the browser happens to be signed into — on a
            # shared device that would sign the wrong person in.
            "prompt": "select_account",
        })

    async def exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Optional[str]]:
        """
        Trade the one-time authorization code for the user's profile.

        Returns {sub, email, email_verified, name, picture}. The code is spent
        server-side with the client secret, so possession of the code alone —
        it does travel through the browser's address bar — is not enough to
        impersonate anyone.
        """
        if not self.is_configured():
            raise OAuthNotConfigured("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set")

        async with httpx.AsyncClient(timeout=15.0) as client:
            token_res = await client.post(TOKEN_ENDPOINT, data={
                "code": code,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            })

            if token_res.status_code != 200:
                # Google's body names the actual problem (redirect_uri_mismatch,
                # invalid_client, invalid_grant). Log it — it is the difference
                # between a five-minute fix and an afternoon of guessing — but
                # don't hand it to the browser.
                logger.error(
                    "Google token exchange failed (%s): %s",
                    token_res.status_code, token_res.text[:400],
                )
                raise OAuthExchangeError("Google rejected the authorization code")

            access_token = token_res.json().get("access_token")
            if not access_token:
                raise OAuthExchangeError("Google returned no access token")

            profile_res = await client.get(
                USERINFO_ENDPOINT,
                headers={"Authorization": f"Bearer {access_token}"},
            )

        if profile_res.status_code != 200:
            logger.error(
                "Google userinfo failed (%s): %s",
                profile_res.status_code, profile_res.text[:400],
            )
            raise OAuthExchangeError("Could not read the Google profile")

        profile = profile_res.json()
        return {
            "sub": profile.get("sub"),
            "email": profile.get("email"),
            "email_verified": bool(profile.get("email_verified")),
            "name": profile.get("name"),
            "picture": profile.get("picture"),
        }


oauth_service = GoogleOAuthService()
