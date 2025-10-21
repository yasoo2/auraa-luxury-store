"""
Secure Refresh Token Management System
Implements token rotation, revocation, and device tracking
"""
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


class RefreshTokenManager:
    """Manages refresh tokens with security best practices"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.tokens_collection = db.refresh_tokens
    
    @staticmethod
    def generate_token() -> str:
        """Generate a cryptographically secure random token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_token(token: str) -> str:
        """Hash token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    async def create_refresh_token(
        self,
        user_id: str,
        device_info: Dict[str, Any],
        remember_me: bool = False,
        ttl_days: int = 30
    ) -> str:
        """
        Create a new refresh token
        
        Args:
            user_id: User's ID
            device_info: Device metadata (user_agent, ip, etc.)
            remember_me: If True, extend TTL
            ttl_days: Token validity in days
            
        Returns:
            token: Plain token (to be set in cookie)
        """
        token = self.generate_token()
        token_hash = self.hash_token(token)
        
        # Extend TTL if remember me is enabled
        if remember_me:
            ttl_days = 60  # 2 months
        
        expires_at = datetime.now(timezone.utc) + timedelta(days=ttl_days)
        
        token_doc = {
            "token_hash": token_hash,
            "user_id": user_id,
            "device_info": {
                "user_agent": device_info.get("user_agent", ""),
                "ip": device_info.get("ip", ""),
                "device_id": device_info.get("device_id", "")
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at.isoformat(),
            "last_used_at": datetime.now(timezone.utc).isoformat(),
            "is_revoked": False,
            "remember_me": remember_me
        }
        
        await self.tokens_collection.insert_one(token_doc)
        
        logger.info(f"✅ Created refresh token for user {user_id} (remember_me={remember_me}, ttl={ttl_days}d)")
        
        return token
    
    async def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate refresh token
        
        Returns:
            token_doc if valid, None otherwise
        """
        token_hash = self.hash_token(token)
        
        token_doc = await self.tokens_collection.find_one({
            "token_hash": token_hash,
            "is_revoked": False
        })
        
        if not token_doc:
            logger.warning("❌ Token not found or revoked")
            return None
        
        # Check expiration
        expires_at = datetime.fromisoformat(token_doc["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            logger.warning("❌ Token expired")
            await self.revoke_token(token)
            return None
        
        # Update last used
        await self.tokens_collection.update_one(
            {"token_hash": token_hash},
            {
                "$set": {
                    "last_used_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return token_doc
    
    async def rotate_token(
        self,
        old_token: str,
        device_info: Dict[str, Any]
    ) -> Optional[str]:
        """
        Rotate refresh token (revoke old, create new)
        
        Returns:
            new_token if successful, None otherwise
        """
        # Validate old token
        old_token_doc = await self.validate_token(old_token)
        
        if not old_token_doc:
            return None
        
        # Revoke old token
        await self.revoke_token(old_token)
        
        # Create new token with same settings
        new_token = await self.create_refresh_token(
            user_id=old_token_doc["user_id"],
            device_info=device_info,
            remember_me=old_token_doc.get("remember_me", False),
            ttl_days=30 if not old_token_doc.get("remember_me") else 60
        )
        
        logger.info(f"✅ Rotated refresh token for user {old_token_doc['user_id']}")
        
        return new_token
    
    async def revoke_token(self, token: str) -> bool:
        """Revoke a refresh token"""
        token_hash = self.hash_token(token)
        
        result = await self.tokens_collection.update_one(
            {"token_hash": token_hash},
            {
                "$set": {
                    "is_revoked": True,
                    "revoked_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info("✅ Revoked refresh token")
            return True
        
        return False
    
    async def revoke_all_user_tokens(self, user_id: str) -> int:
        """Revoke all refresh tokens for a user"""
        result = await self.tokens_collection.update_many(
            {"user_id": user_id, "is_revoked": False},
            {
                "$set": {
                    "is_revoked": True,
                    "revoked_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"✅ Revoked {result.modified_count} tokens for user {user_id}")
        
        return result.modified_count
    
    async def cleanup_expired_tokens(self) -> int:
        """Remove expired tokens from database (cleanup task)"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=90)
        
        result = await self.tokens_collection.delete_many({
            "created_at": {"$lt": cutoff_date.isoformat()}
        })
        
        logger.info(f"✅ Cleaned up {result.deleted_count} old tokens")
        
        return result.deleted_count
    
    async def get_user_tokens(self, user_id: str) -> list:
        """Get all active tokens for a user (for device management)"""
        cursor = self.tokens_collection.find({
            "user_id": user_id,
            "is_revoked": False
        }).sort("created_at", -1)
        
        tokens = await cursor.to_list(length=100)
        
        for token in tokens:
            token.pop("_id", None)
            token.pop("token_hash", None)  # Never expose hash
        
        return tokens
