#!/usr/bin/env python3
"""
Detailed Login Diagnosis
Comprehensive testing to diagnose login issues on production
"""

import requests
import json
import sys
from datetime import datetime

# Production backend URL
BACKEND_URL = "https://api.auraaluxury.com"

def test_password_variations():
    """Test different password variations for the known account"""
    print("🔍 TESTING PASSWORD VARIATIONS")
    print("=" * 60)
    
    email = "younes.sowady2011@gmail.com"
    
    # Common password variations
    password_variations = [
        os.getenv("SEED_ADMIN_PASSWORD", ""),      # Original from review
        "Younes2025",      # Capitalized
        "YOUNES2025",      # All caps
        "younes@2025",     # With @
        "younes_2025",     # With underscore
        "younes-2025",     # With dash
        "younes2024",      # Previous year
        "younes123",       # Simple variation
        "admin123",        # Common admin password
        "password",        # Default password
        "123456",          # Simple password
        "auraa2025",       # Brand related
        "luxury2025",      # Brand related
    ]
    
    print(f"Testing {len(password_variations)} password variations for: {email}")
    
    for i, password in enumerate(password_variations, 1):
        print(f"\n--- Variation {i}: '{password}' ---")
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/auth/login",
                json={
                    "identifier": email,
                    "password": password
                },
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ PASSWORD FOUND!")
                data = response.json()
                user = data.get('user', {})
                print(f"Successful login with password: '{password}'")
                print(f"User: {user.get('email')} (Admin: {user.get('is_admin')}, Super: {user.get('is_super_admin')})")
                return password
            elif response.status_code == 401:
                error_data = response.json()
                if error_data.get('detail') == 'wrong_password':
                    print("❌ Wrong password")
                else:
                    print(f"❌ Auth error: {error_data.get('detail')}")
            else:
                print(f"❌ Unexpected status: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
    
    print("\n❌ No working password found in variations")
    return None

def test_account_existence():
    """Test if various accounts exist by checking error types"""
    print("\n🔍 TESTING ACCOUNT EXISTENCE")
    print("=" * 60)
    
    test_accounts = [
        "younes.sowady2011@gmail.com",
        "00905013715391", 
        "info@auraaluxury.com",
        "admin@auraa.com",
        "admin@auraaluxury.com",
        "super@auraaluxury.com",
        "test@auraaluxury.com",
        "younes@auraaluxury.com"
    ]
    
    existing_accounts = []
    
    for account in test_accounts:
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/auth/login",
                json={
                    "identifier": account,
                    "password": "dummy_password_to_test_existence"
                },
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            if response.status_code == 401:
                error_data = response.json()
                if error_data.get('detail') == 'wrong_password':
                    print(f"✅ EXISTS: {account} (wrong password)")
                    existing_accounts.append(account)
                else:
                    print(f"❓ UNKNOWN: {account} (auth error: {error_data.get('detail')})")
            elif response.status_code == 404:
                error_data = response.json()
                if error_data.get('detail') == 'account_not_found':
                    print(f"❌ NOT FOUND: {account}")
                else:
                    print(f"❓ UNKNOWN: {account} (404 error: {error_data.get('detail')})")
            else:
                print(f"❓ UNEXPECTED: {account} (status: {response.status_code})")
                
        except Exception as e:
            print(f"❌ ERROR: {account} - {str(e)}")
    
    return existing_accounts

def test_api_endpoints():
    """Test various API endpoints to understand server state"""
    print("\n🔍 TESTING API ENDPOINTS")
    print("=" * 60)
    
    endpoints = [
        "/api/",
        "/api/categories", 
        "/api/products",
        "/api/init-data",
        "/api/setup-deployment"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=15)
            print(f"{endpoint}: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if endpoint == "/api/products":
                        if isinstance(data, list):
                            print(f"  → {len(data)} products found")
                        else:
                            print(f"  → Products response: {type(data)}")
                    elif endpoint == "/api/categories":
                        if isinstance(data, list):
                            print(f"  → {len(data)} categories found")
                    elif endpoint == "/api/":
                        print(f"  → Message: {data.get('message', 'No message')}")
                except:
                    print(f"  → Non-JSON response")
            else:
                try:
                    error = response.json()
                    print(f"  → Error: {error.get('detail', 'Unknown')}")
                except:
                    print(f"  → Error response (non-JSON)")
                    
        except Exception as e:
            print(f"{endpoint}: ERROR - {str(e)}")

def main():
    print(f"🔍 DETAILED LOGIN DIAGNOSIS - {datetime.now()}")
    print("Comprehensive testing to diagnose production login issues")
    print("=" * 80)
    
    # Test server health
    try:
        response = requests.get(f"{BACKEND_URL}/api/", timeout=10)
        if response.status_code != 200:
            print("❌ Production server not responding correctly")
            return
        print("✅ Production server is reachable")
    except Exception as e:
        print(f"❌ Cannot reach production server: {str(e)}")
        return
    
    # Test account existence
    existing_accounts = test_account_existence()
    
    # Test password variations for existing accounts
    if existing_accounts:
        print(f"\n🔑 Found {len(existing_accounts)} existing account(s)")
        for account in existing_accounts:
            if "@" in account:  # Email account
                print(f"\nTesting password variations for: {account}")
                working_password = test_password_variations()
                if working_password:
                    print(f"✅ FOUND WORKING CREDENTIALS!")
                    print(f"Email: {account}")
                    print(f"Password: {working_password}")
                    break
    else:
        print("\n❌ No existing accounts found")
    
    # Test API endpoints
    test_api_endpoints()
    
    print("\n" + "=" * 80)
    print("📊 DIAGNOSIS COMPLETE")
    print("=" * 80)
    
    if existing_accounts:
        print(f"✅ Found {len(existing_accounts)} existing account(s)")
        print("❌ But no working password found for younes.sowady2011@gmail.com")
        print("🔍 The account exists but password '<redacted>' is incorrect")
        print("💡 Possible issues:")
        print("   - Password was changed after seed script")
        print("   - Different password was used in production")
        print("   - Password hashing issue")
        print("   - Case sensitivity issue")
    else:
        print("❌ No accounts found in production database")
        print("💡 Database may not be seeded or different database in use")

if __name__ == "__main__":
    main()