#!/usr/bin/env python3
"""
Script to create Admin User in MongoDB Atlas for AuraaLuxury
"""

import sys
import uuid
from datetime import datetime
from pymongo import MongoClient
import bcrypt

# MongoDB Atlas Connection String
MONGO_URI = os.getenv("MONGO_URL", "mongodb://localhost:27017")

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_admin_user():
    """Create admin user in MongoDB Atlas"""
    
    print("🔄 Connecting to MongoDB Atlas...")
    
    try:
        # Connect to MongoDB Atlas
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        
        # Test connection
        client.server_info()
        print("✅ Connected to MongoDB Atlas successfully!")
        
        # Get database
        db = client['auraaluxury']
        users_collection = db['users']
        
        # Check if admin already exists
        existing_admin = users_collection.find_one({"email": "admin@auraa.com"})
        
        if existing_admin:
            print("\n⚠️  Admin user already exists!")
            print(f"   Email: {existing_admin['email']}")
            print(f"   Name: {existing_admin['first_name']} {existing_admin['last_name']}")
            
            # Ask if user wants to reset password
            response = input("\n❓ Do you want to reset the password? (yes/no): ").lower().strip()
            
            if response == 'yes':
                new_password_hash = hash_password("admin123")
                users_collection.update_one(
                    {"email": "admin@auraa.com"},
                    {"$set": {"password": new_password_hash}}
                )
                print("\n✅ Admin password reset successfully!")
                print("   Email: admin@auraa.com")
                print("   Password: admin123")
            else:
                print("\n❌ Operation cancelled.")
            
            return
        
        # Create new admin user
        print("\n🔨 Creating new admin user...")
        
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@auraa.com",
            "password": hash_password("admin123"),
            "first_name": "Admin",
            "last_name": "Auraa",
            "phone": "00905013715391",
            "role": "admin",
            "is_admin": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insert admin user
        result = users_collection.insert_one(admin_user)
        
        if result.inserted_id:
            print("\n✅ Admin user created successfully!")
            print("\n" + "="*50)
            print("📧 Admin Credentials:")
            print("="*50)
            print(f"   Email:    admin@auraa.com")
            print(f"   Password: admin123")
            print(f"   Role:     admin")
            print("="*50)
            print("\n🎉 You can now login to the admin dashboard!")
            print(f"   URL: https://auraaluxury.com/admin")
            print("\n⚠️  IMPORTANT: Change the password after first login!")
        else:
            print("\n❌ Failed to create admin user!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Check MongoDB Atlas connection string")
        print("   2. Verify network access (IP whitelist)")
        print("   3. Ensure database user has write permissions")
        sys.exit(1)
    
    finally:
        if 'client' in locals():
            client.close()
            print("\n🔌 Connection closed.")

if __name__ == "__main__":
    print("="*50)
    print("   AuraaLuxury - Admin User Creator")
    print("="*50)
    print()
    
    create_admin_user()
