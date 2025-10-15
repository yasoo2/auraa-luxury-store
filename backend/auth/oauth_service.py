"""
OAuth Service for Google and Facebook Login
Using Emergent Auth Integration
"""

import os
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
from urllib.parse import quote

class OAuthService:
    def __init__(self):
        self.emergent_auth_url = "https://auth.emergentagent.com"
        self.session_api_url = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
        
    def get_oauth_url(self, provider: str, redirect_url: str) -> str:
        """
        Get OAuth URL for Google or Facebook
        Provider: 'google' or 'facebook'
        """
        if provider not in ['google', 'facebook']:
            raise ValueError(f"Unsupported provider: {provider}")
        
        # Emergent Auth URL (works for both Google and Facebook)
        oauth_url = f"{self.emergent_auth_url}/?redirect={quote(redirect_url)}"
        
        return oauth_url
    
    async def get_user_from_session(self, session_id: str) -> Optional[Dict]:
        """
        Exchange session_id for user data
        Returns: {id, email, name, picture, session_token}
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.session_api_url,
                    headers={"X-Session-ID": session_id},
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return None
        except Exception as e:
            print(f"OAuth session error: {e}")
            return None

oauth_service = OAuthService()
