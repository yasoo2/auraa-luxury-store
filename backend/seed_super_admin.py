#!/usr/bin/env python3
"""
Seed Initial Super Admin Accounts for Auraa Luxury
"""

import sys
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from passlib.context import CryptContext

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def seed_super_admins():
    """Seed initial super admin accounts"""
    
    print("="*60)
    print("   Auraa Luxury - Super Admin Setup")
    print("="*60)
    print()
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    print(f"🔄 Connecting to MongoDB...")
    print(f"   URL: {mongo_url}")
    print(f"   Database: {db_name}")
    
    try:
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
        client.server_info()
        print("✅ Connected to MongoDB successfully!")
        
        db = client[db_name]
        super_admins_collection = db['super_admins']
        audit_logs_collection = db['admin_audit_logs']
        
        # Check if super admins already exist
        existing_count = super_admins_collection.count_documents({})
        
        if existing_count > 0:
            print(f"\n⚠️  {existing_count} Super Admin(s) already exist!")
            response = input("\n❓ Do you want to replace them? (yes/no): ").lower().strip()
            
            if response != 'yes':
                print("\n❌ Operation cancelled.")
                return
            
            # Delete existing super admins
            super_admins_collection.delete_many({})
            print("✅ Existing Super Admins deleted.")
        
        # Create initial super admin accounts
        print("\n🔨 Creating initial Super Admin accounts...")
        
        password = "younes2025"
        password_hash = hash_password(password)
        
        super_admins = [
            {
                "id": str(uuid.uuid4()),
                "identifier": "younes.sowady2011@gmail.com",
                "type": "email",
                "password_hash": password_hash,
                "role": "super_admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system",
                "is_active": True,
                "last_login": None
            },
            {
                "id": str(uuid.uuid4()),
                "identifier": "00905013715391",
                "type": "phone",
                "password_hash": password_hash,
                "role": "super_admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system",
                "is_active": True,
                "last_login": None
            },
            {
                "id": str(uuid.uuid4()),
                "identifier": "info@auraaluxury.com",
                "type": "email",
                "password_hash": password_hash,
                "role": "super_admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system",
                "is_active": True,
                "last_login": None
            }
        ]
        
        # Insert super admins
        result = super_admins_collection.insert_many(super_admins)
        
        if result.inserted_ids:
            print(f"\n✅ {len(result.inserted_ids)} Super Admin accounts created!")
            
            print("\n" + "="*60)
            print("📧 Super Admin Credentials:")
            print("="*60)
            
            for admin in super_admins:
                print(f"\n   {admin['type'].upper()}: {admin['identifier']}")
                print(f"   Password: {password}")
            
            print("\n" + "="*60)
            print("\n⚠️  IMPORTANT:")
            print("   1. Change passwords after first login!")
            print("   2. Keep these credentials secure")
            print("   3. Delete this script after setup")
            print("="*60)
            
            # Create audit log
            audit_logs_collection.insert_one({
                "id": str(uuid.uuid4()),
                "action": "super_admin_seeded",
                "performed_by": "system",
                "details": {
                    "count": len(super_admins),
                    "identifiers": [admin["identifier"] for admin in super_admins]
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            print("\n✅ Setup complete!")
            print(f"\n🎉 You can now login at: https://auraaluxury.com/auth")
            
        else:
            print("\n❌ Failed to create Super Admin accounts!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    
    finally:
        if 'client' in locals():
            client.close()
            print("\n🔌 Connection closed.")

if __name__ == "__main__":
    seed_super_admins()
