from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

logger = logging.getLogger(__name__)

# MongoDB Client (Async)
_mongo_uri = settings.get_mongo_uri()
_db_name = settings.MONGO_DB_NAME

logger.info(f"🔌 Connecting to MongoDB: {_db_name}")

_client = AsyncIOMotorClient(_mongo_uri)
db = _client[_db_name]

# Health check
async def ping_db():
    """Check if database is accessible"""
    try:
        await _client.admin.command('ping')
        logger.info("✅ MongoDB connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        return False

# Graceful shutdown
async def close_db():
    """Close MongoDB connection"""
    _client.close()
    logger.info("🔒 MongoDB connection closed")
