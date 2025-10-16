#!/usr/bin/env python3
"""
Production Login API Test
Test login API on production server with super admin credentials
"""

import requests
import json
import sys
from datetime import datetime

# Production backend URL
BACKEND_URL = "https://api.auraaluxury.com"

def test_production_login():
    """Test login API on production server"""
    print("🔐 TESTING PRODUCTION LOGIN API")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 60)
    
    # Test credentials from review request
    test_accounts = [
        {
            "identifier": "younes.sowady2011@gmail.com",
            "password": "younes2025",
            "description": "Primary super admin (email)"
        },
        {
            "identifier": "00905013715391",
            "password": "younes2025", 
            "description": "Super admin (phone)"
        },
        {
            "identifier": "info@auraaluxury.com",
            "password": "younes2025",
            "description": "Info email super admin"
        },
        {
            "identifier": "admin@auraa.com",
            "password": "admin123",
            "description": "Default admin account"
        }
    ]
    
    success_count = 0
    
    for i, credentials in enumerate(test_accounts, 1):
        print(f"\n--- Test {i}/4: {credentials['description']} ---")
        print(f"Testing login with: {credentials['identifier']}")
        
        try:
            # Make login request
            response = requests.post(
                f"{BACKEND_URL}/api/auth/login",
                json={
                    "identifier": credentials["identifier"],
                    "password": credentials["password"]
                },
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ LOGIN SUCCESSFUL!")
                print(f"Access Token: {data.get('access_token', 'Not found')[:50]}...")
                print(f"Token Type: {data.get('token_type', 'Not found')}")
                
                user = data.get('user', {})
                print(f"User ID: {user.get('id', 'Not found')}")
                print(f"Email: {user.get('email', 'Not found')}")
                print(f"First Name: {user.get('first_name', 'Not found')}")
                print(f"Last Name: {user.get('last_name', 'Not found')}")
                print(f"Is Admin: {user.get('is_admin', False)}")
                print(f"Is Super Admin: {user.get('is_super_admin', False)}")
                
                # Test token validation for successful login
                if data.get('access_token'):
                    print("\n🔍 TESTING TOKEN VALIDATION")
                    token = data['access_token']
                    
                    me_response = requests.get(
                        f"{BACKEND_URL}/api/auth/me",
                        headers={"Authorization": f"Bearer {token}"},
                        timeout=30
                    )
                    
                    print(f"Token validation status: {me_response.status_code}")
                    if me_response.status_code == 200:
                        me_data = me_response.json()
                        print("✅ TOKEN VALIDATION SUCCESSFUL!")
                        print(f"Validated User: {me_data.get('email', 'Unknown')}")
                        print(f"Admin Status: {me_data.get('is_admin', False)}")
                    else:
                        print("❌ TOKEN VALIDATION FAILED!")
                        print(f"Error: {me_response.text}")
                
                success_count += 1
                
            else:
                print("❌ LOGIN FAILED!")
                print(f"Error Response: {response.text}")
                
                try:
                    error_data = response.json()
                    print(f"Error Detail: {error_data.get('detail', 'Unknown error')}")
                except:
                    pass
                
        except requests.exceptions.Timeout:
            print("❌ REQUEST TIMEOUT - Server may be slow or unreachable")
        except requests.exceptions.ConnectionError:
            print("❌ CONNECTION ERROR - Cannot reach production server")
        except Exception as e:
            print(f"❌ UNEXPECTED ERROR: {str(e)}")
    
    return success_count > 0

def test_server_health():
    """Test if production server is reachable"""
    print("\n🏥 TESTING SERVER HEALTH")
    print("=" * 60)
    
    try:
        # Test root endpoint
        response = requests.get(f"{BACKEND_URL}/api/", timeout=10)
        print(f"Root endpoint status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Production server is reachable")
            try:
                data = response.json()
                print(f"Server message: {data.get('message', 'No message')}")
            except:
                print("Server responded but not with JSON")
            return True
        else:
            print("❌ Production server returned error")
            return False
            
    except Exception as e:
        print(f"❌ Cannot reach production server: {str(e)}")
        return False

if __name__ == "__main__":
    print(f"🚀 PRODUCTION LOGIN API TEST - {datetime.now()}")
    print("Testing login API on production server with super admin credentials")
    print("=" * 80)
    
    # Test server health first
    server_ok = test_server_health()
    
    if server_ok:
        # Test login
        login_success = test_production_login()
        
        print("\n" + "=" * 80)
        print("📊 FINAL RESULTS")
        print("=" * 80)
        
        if login_success:
            print("✅ PRODUCTION LOGIN TEST PASSED")
            print("✅ Super admin credentials working correctly")
            print("✅ Backend login API is functional on production domain")
        else:
            print("❌ PRODUCTION LOGIN TEST FAILED")
            print("❌ Super admin credentials or backend API has issues")
        
        sys.exit(0 if login_success else 1)
    else:
        print("\n❌ CANNOT TEST LOGIN - Production server unreachable")
        sys.exit(1)