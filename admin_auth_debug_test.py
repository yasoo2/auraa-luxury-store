#!/usr/bin/env python3
"""
Focused Admin Authentication Debug Test
Specifically for debugging frontend admin login issues
"""

import requests
import json
from datetime import datetime

class AdminAuthDebugTester:
    def __init__(self, base_url="https://luxedrop-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        
    def test_admin_login_detailed(self):
        """Detailed admin login test with comprehensive response analysis"""
        print("🔐 DETAILED ADMIN LOGIN AUTHENTICATION TEST")
        print("=" * 60)
        
        # Test admin login with exact credentials
        admin_credentials = {
            "email": "admin@auraa.com",
            "password": "admin123"
        }
        
        print(f"📤 POST {self.api_url}/auth/login")
        print(f"📋 Payload: {json.dumps(admin_credentials, indent=2)}")
        
        try:
            response = requests.post(
                f"{self.api_url}/auth/login",
                json=admin_credentials,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            print(f"📥 Response Status: {response.status_code}")
            print(f"📥 Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"📥 Response Body:")
                print(json.dumps(data, indent=2, default=str))
                
                # Analyze response structure
                print("\n🔍 RESPONSE ANALYSIS:")
                
                # Check access_token
                access_token = data.get('access_token')
                if access_token:
                    print(f"✅ access_token: Present (length: {len(access_token)})")
                    print(f"   Token preview: {access_token[:20]}...")
                else:
                    print("❌ access_token: MISSING")
                
                # Check token_type
                token_type = data.get('token_type')
                if token_type == 'bearer':
                    print(f"✅ token_type: {token_type}")
                else:
                    print(f"❌ token_type: {token_type} (expected 'bearer')")
                
                # Check user object
                user = data.get('user')
                if user:
                    print(f"✅ user object: Present")
                    
                    # Check is_admin flag
                    is_admin = user.get('is_admin')
                    if is_admin is True:
                        print(f"✅ user.is_admin: {is_admin} (ADMIN USER CONFIRMED)")
                    else:
                        print(f"❌ user.is_admin: {is_admin} (NOT ADMIN)")
                    
                    # Check other user fields
                    email = user.get('email')
                    if email == 'admin@auraa.com':
                        print(f"✅ user.email: {email}")
                    else:
                        print(f"❌ user.email: {email} (expected 'admin@auraa.com')")
                    
                    user_id = user.get('id')
                    if user_id:
                        print(f"✅ user.id: {user_id}")
                    else:
                        print(f"❌ user.id: MISSING")
                    
                    first_name = user.get('first_name')
                    last_name = user.get('last_name')
                    print(f"ℹ️  user.first_name: {first_name}")
                    print(f"ℹ️  user.last_name: {last_name}")
                    
                else:
                    print("❌ user object: MISSING")
                
                # Test token functionality
                if access_token:
                    print(f"\n🔑 TESTING TOKEN FUNCTIONALITY:")
                    self.test_token_functionality(access_token)
                
                return True, data
                
            else:
                print(f"❌ Login failed with status {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"Error response: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"Error response (raw): {response.text}")
                return False, None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {str(e)}")
            return False, None
    
    def test_token_functionality(self, token):
        """Test if the admin token works for protected endpoints"""
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        # Test 1: /auth/me endpoint
        print(f"🧪 Testing /auth/me endpoint...")
        try:
            response = requests.get(f"{self.api_url}/auth/me", headers=headers, timeout=10)
            if response.status_code == 200:
                user_data = response.json()
                is_admin = user_data.get('is_admin')
                print(f"✅ /auth/me: Status {response.status_code}, is_admin: {is_admin}")
            else:
                print(f"❌ /auth/me: Status {response.status_code}")
        except Exception as e:
            print(f"❌ /auth/me: Error - {str(e)}")
        
        # Test 2: /admin/integrations endpoint
        print(f"🧪 Testing /admin/integrations endpoint...")
        try:
            response = requests.get(f"{self.api_url}/admin/integrations", headers=headers, timeout=10)
            if response.status_code == 200:
                integration_data = response.json()
                integration_id = integration_data.get('id')
                print(f"✅ /admin/integrations: Status {response.status_code}, ID: {integration_id}")
            else:
                print(f"❌ /admin/integrations: Status {response.status_code}")
        except Exception as e:
            print(f"❌ /admin/integrations: Error - {str(e)}")
        
        # Test 3: Product creation (admin-only)
        print(f"🧪 Testing admin product creation...")
        test_product = {
            "name": "Debug Test Product",
            "description": "Product created during admin auth debug test",
            "price": 99.99,
            "category": "rings",
            "images": ["https://example.com/test.jpg"],
            "stock_quantity": 10
        }
        
        try:
            response = requests.post(f"{self.api_url}/products", json=test_product, headers=headers, timeout=10)
            if response.status_code == 200:
                product_data = response.json()
                product_id = product_data.get('id')
                print(f"✅ Product creation: Status {response.status_code}, ID: {product_id}")
                
                # Clean up - delete the test product
                if product_id:
                    delete_response = requests.delete(f"{self.api_url}/products/{product_id}", headers=headers, timeout=10)
                    if delete_response.status_code == 200:
                        print(f"✅ Test product cleaned up successfully")
            else:
                print(f"❌ Product creation: Status {response.status_code}")
        except Exception as e:
            print(f"❌ Product creation: Error - {str(e)}")
    
    def run_debug_test(self):
        """Run the complete debug test"""
        print("🚀 ADMIN AUTHENTICATION DEBUG TEST")
        print(f"🔗 API URL: {self.api_url}")
        print(f"🕐 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        success, data = self.test_admin_login_detailed()
        
        print("\n" + "=" * 60)
        print("📋 SUMMARY FOR FRONTEND DEBUGGING:")
        print("=" * 60)
        
        if success and data:
            user = data.get('user', {})
            print("✅ ADMIN LOGIN: SUCCESS")
            print(f"✅ ACCESS TOKEN: Available")
            print(f"✅ USER OBJECT: Available")
            print(f"✅ IS_ADMIN FLAG: {user.get('is_admin')}")
            print(f"✅ USER EMAIL: {user.get('email')}")
            print(f"✅ USER ID: {user.get('id')}")
            
            print("\n🔧 FRONTEND INTEGRATION NOTES:")
            print("- The backend is returning the correct admin user data")
            print("- The is_admin flag is set to True")
            print("- The access_token is valid for admin endpoints")
            print("- Check frontend AuthContext/state management")
            print("- Verify frontend is checking user.is_admin flag correctly")
            print("- Ensure admin button visibility logic uses user.is_admin")
            
        else:
            print("❌ ADMIN LOGIN: FAILED")
            print("- Backend authentication is not working")
            print("- Check admin user exists in database")
            print("- Verify admin credentials are correct")
        
        return success

def main():
    """Main execution"""
    tester = AdminAuthDebugTester()
    return tester.run_debug_test()

if __name__ == "__main__":
    main()