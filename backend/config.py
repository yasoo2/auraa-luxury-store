from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    APP_NAME: str = "Auraa Luxury API"
    ENV: str = "production"

    # Mongo
    MONGODB_URI: Optional[str] = None
    MONGO_URL: Optional[str] = None  # fallback
    MONGO_DB_NAME: str = "auraa_luxury_db"

    # CORS
    CORS_ORIGINS: str = ""  # Comma-separated string
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    CORS_ALLOW_METHODS: List[str] = ["*"]

    # Keys
    CJ_API_KEY: Optional[str] = None
    CJ_DROPSHIP_API_KEY: Optional[str] = None
    
    # JWT
    JWT_SECRET_KEY: Optional[str] = None
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    
    # Email
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"  # Allow extra fields from .env
    
    def get_cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into list"""
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    def get_mongo_uri(self) -> str:
        """Get MongoDB URI with fallback"""
        return self.MONGODB_URI or self.MONGO_URL or "mongodb://localhost:27017"

settings = Settings()
