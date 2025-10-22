#!/usr/bin/env python3
"""
Review Request Backend Testing for Auraa Luxury e-commerce platform
Tests specific functionality requested in the review:
1. Authentication Flow with Super Admin credentials
2. Cart API with and without authentication
3. Admin Users Endpoint with Super Admin token
4. OAuth Google URL endpoint
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class ReviewRequestTester:
    def __init__(self):
        # Use environment variable from frontend/.env
        self.base_url = "https://cjdrop-import.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.super_admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"\n{status} - {test_name}")
        if details:
            print(f"   Details: {details}")
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"test": test_name, "details": details})
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, params: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if self.super_admin_token:
            default_headers['Authorization'] = f'Bearer {self.super_admin_token}'
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=default_headers, params=params, timeout=15)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=default_headers, params=params, timeout=15)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, params=params, timeout=15)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=default_headers, params=params, timeout=15)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0
    
    def test_super_admin_authentication(self):
        """Test login with Super Admin credentials: younes.sowady2011@gmail.com / younes2025"""
        print("\n🔐 TESTING SUPER ADMIN AUTHENTICATION FLOW")
        
        # Test super admin login with provided credentials
        super_admin_credentials = {
            "identifier": "younes.sowady2011@gmail.com",
            "password": "younes2025"
        }
        
        success, data, status = self.make_request('POST', '/auth/login', super_admin_credentials)
        
        if success and data.get('access_token'):
            self.super_admin_token = data['access_token']
            user_data = data.get('user', {})
            is_admin = user_data.get('is_admin', False)
            is_super_admin = user_data.get('is_super_admin', False)
            
            # Verify response includes required flags
            if is_super_admin and is_admin:
                self.log_test("Super Admin Login", True, 
                            f"✅ Login successful - is_admin: {is_admin}, is_super_admin: {is_super_admin}")
                
                # Verify JWT token is returned
                if len(self.super_admin_token) > 50:  # JWT tokens are typically long
                    self.log_test("JWT Token Returned", True, 
                                f"Token length: {len(self.super_admin_token)} characters")
                else:
                    self.log_test("JWT Token Returned", False, 
                                f"Token seems too short: {len(self.super_admin_token)} characters")
                
                return True
            else:
                self.log_test("Super Admin Login", False, 
                            f"❌ User flags incorrect - is_admin: {is_admin}, is_super_admin: {is_super_admin}")
                return False
        else:
            self.log_test("Super Admin Login", False, 
                        f"❌ Login failed - Status: {status}, Response: {data}")
            return False
    
    def test_cart_api_without_authentication(self):
        """Test GET /api/cart without authentication (should return 401 or empty cart)"""
        print("\n🛒 TESTING CART API WITHOUT AUTHENTICATION")
        
        # Temporarily remove token
        original_token = self.super_admin_token
        self.super_admin_token = None
        
        success, data, status = self.make_request('GET', '/cart')
        
        # Restore token
        self.super_admin_token = original_token
        
        if status == 401:
            self.log_test("Cart API - No Auth (401)", True, 
                        f"✅ Properly returns 401 Unauthorized")
        elif success and 'items' in data:
            # Some implementations return empty cart instead of 401
            self.log_test("Cart API - No Auth (Empty Cart)", True, 
                        f"✅ Returns empty cart structure: {data}")
        else:
            self.log_test("Cart API - No Auth", False, 
                        f"❌ Unexpected response - Status: {status}, Data: {data}")
    
    def test_cart_api_with_authentication(self):
        """Test GET /api/cart with valid token"""
        print("\n🛒 TESTING CART API WITH AUTHENTICATION")
        
        if not self.super_admin_token:
            self.log_test("Cart API - With Auth", False, "❌ No super admin token available")
            return
        
        success, data, status = self.make_request('GET', '/cart')
        
        if success and 'items' in data:
            items = data.get('items', [])
            total_amount = data.get('total_amount', 0)
            user_id = data.get('user_id', '')
            
            self.log_test("Cart API - With Auth", True, 
                        f"✅ Cart retrieved - Items: {len(items)}, Total: {total_amount}, User ID: {user_id}")
            
            # Verify response structure includes items array
            if isinstance(items, list):
                self.log_test("Cart Response Structure", True, 
                            f"✅ Response includes 'items' array with {len(items)} items")
            else:
                self.log_test("Cart Response Structure", False, 
                            f"❌ 'items' is not an array: {type(items)}")
        else:
            self.log_test("Cart API - With Auth", False, 
                        f"❌ Failed to retrieve cart - Status: {status}, Response: {data}")
    
    def test_admin_users_endpoint(self):
        """Test GET /api/admin/users/all with Super Admin token"""
        print("\n👥 TESTING ADMIN USERS ENDPOINT")
        
        if not self.super_admin_token:
            self.log_test("Admin Users Endpoint", False, "❌ No super admin token available")
            return
        
        success, data, status = self.make_request('GET', '/admin/users/all')
        
        if success:
            # Check if it returns list of users and admins
            if isinstance(data, list):
                users_count = len(data)
                admin_count = len([user for user in data if user.get('is_admin', False)])
                super_admin_count = len([user for user in data if user.get('is_super_admin', False)])
                
                self.log_test("Admin Users Endpoint", True, 
                            f"✅ Retrieved {users_count} users ({admin_count} admins, {super_admin_count} super admins)")
                
                # Verify endpoint is accessible only to Super Admins by testing without token
                original_token = self.super_admin_token
                self.super_admin_token = None
                
                success_no_auth, data_no_auth, status_no_auth = self.make_request('GET', '/admin/users/all')
                
                if not success_no_auth and status_no_auth in [401, 403]:
                    self.log_test("Admin Users Access Control", True, 
                                f"✅ Properly blocked unauthenticated access ({status_no_auth})")
                else:
                    self.log_test("Admin Users Access Control", False, 
                                f"❌ Should block unauthenticated access, got {status_no_auth}")
                
                # Restore token
                self.super_admin_token = original_token
                
            elif isinstance(data, dict) and 'users' in data:
                # Alternative response format
                users = data.get('users', [])
                self.log_test("Admin Users Endpoint", True, 
                            f"✅ Retrieved {len(users)} users in 'users' field")
            else:
                self.log_test("Admin Users Endpoint", False, 
                            f"❌ Unexpected response format: {type(data)}")
        else:
            self.log_test("Admin Users Endpoint", False, 
                        f"❌ Failed to retrieve users - Status: {status}, Response: {data}")
    
    def test_oauth_google_url(self):
        """Test GET /api/auth/oauth/google/url with a redirect URL parameter"""
        print("\n🔗 TESTING OAUTH GOOGLE URL ENDPOINT")
        
        # Test with redirect URL parameter
        redirect_url = "https://cjdrop-import.preview.emergentagent.com/auth/callback"
        params = {"redirect_url": redirect_url}
        
        success, data, status = self.make_request('GET', '/auth/oauth/google/url', params=params)
        
        if success:
            oauth_url = data.get('url', '')
            provider = data.get('provider', '')
            
            # Verify it returns a valid authorization URL
            if oauth_url and 'google' in oauth_url.lower() and oauth_url.startswith('https://'):
                self.log_test("OAuth Google URL", True, 
                            f"✅ Valid Google OAuth URL returned - Provider: {provider}")
                self.log_test("OAuth URL Format", True, 
                            f"✅ URL: {oauth_url[:100]}...")
            else:
                self.log_test("OAuth Google URL", False, 
                            f"❌ Invalid OAuth URL: {oauth_url}")
        else:
            self.log_test("OAuth Google URL", False, 
                        f"❌ Failed to get OAuth URL - Status: {status}, Response: {data}")
        
        # Test without redirect URL parameter (should handle gracefully)
        success_no_param, data_no_param, status_no_param = self.make_request('GET', '/auth/oauth/google/url')
        
        if success_no_param or status_no_param == 400:
            self.log_test("OAuth Google URL - No Redirect", True, 
                        f"✅ Handles missing redirect URL properly (Status: {status_no_param})")
        else:
            self.log_test("OAuth Google URL - No Redirect", False, 
                        f"❌ Unexpected response without redirect URL - Status: {status_no_param}")
    
    def test_backend_url_configuration(self):
        """Verify we're testing against the correct backend URL"""
        print("\n🌐 TESTING BACKEND URL CONFIGURATION")
        
        # Test API root endpoint to verify connection
        success, data, status = self.make_request('GET', '/')
        
        if success:
            message = data.get('message', '')
            if 'API' in message:
                self.log_test("Backend URL Configuration", True, 
                            f"✅ Connected to {self.base_url} - Message: {message}")
            else:
                self.log_test("Backend URL Configuration", False, 
                            f"❌ Unexpected API response: {message}")
        else:
            self.log_test("Backend URL Configuration", False, 
                        f"❌ Cannot connect to {self.base_url} - Status: {status}")
    
    def run_all_tests(self):
        """Run all review request tests"""
        print("=" * 80)
        print("🧪 AURAA LUXURY BACKEND TESTING - REVIEW REQUEST")
        print("=" * 80)
        print(f"Backend URL: {self.base_url}")
        print(f"API URL: {self.api_url}")
        print("=" * 80)
        
        # Test backend URL configuration first
        self.test_backend_url_configuration()
        
        # Test Super Admin authentication
        auth_success = self.test_super_admin_authentication()
        
        # Test Cart API without authentication
        self.test_cart_api_without_authentication()
        
        # Test Cart API with authentication (only if login succeeded)
        if auth_success:
            self.test_cart_api_with_authentication()
        
        # Test Admin Users Endpoint (only if login succeeded)
        if auth_success:
            self.test_admin_users_endpoint()
        
        # Test OAuth Google URL
        self.test_oauth_google_url()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['test']}")
                if test['details']:
                    print(f"   {test['details']}")
        
        print("=" * 80)
        
        return self.tests_passed, len(self.failed_tests)

def main():
    """Main function to run the tests"""
    tester = ReviewRequestTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()