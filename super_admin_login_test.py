#!/usr/bin/env python3
"""
Super Admin Login Testing for Auraa Luxury Store
Tests backend login API with super admin credentials created by seed script
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class SuperAdminLoginTester:
    def __init__(self, base_url="https://luxury-ecom-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
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
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code, response_headers)"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=default_headers, timeout=15)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=15)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=15)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=15)
            else:
                return False, {"error": "Unsupported method"}, 400, {}
            
            # Try to parse JSON response
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code, dict(response.headers)
            
        except requests.exceptions.Timeout:
            return False, {"error": "Request timeout"}, 408, {}
        except requests.exceptions.ConnectionError:
            return False, {"error": "Connection error"}, 503, {}
        except Exception as e:
            return False, {"error": str(e)}, 500, {}
    
    def test_super_admin_login(self, identifier: str, password: str, credential_type: str):
        """Test super admin login with specific credentials"""
        print(f"\n🔐 TESTING SUPER ADMIN LOGIN - {credential_type.upper()}")
        print(f"   Identifier: {identifier}")
        print(f"   Backend URL: {self.api_url}")
        
        # Test login
        login_data = {
            "identifier": identifier,
            "password": password
        }
        
        success, data, status, headers = self.make_request('POST', '/auth/login', login_data)
        
        test_name = f"Super Admin Login ({credential_type}: {identifier})"
        
        if success and status == 200:
            # Check for required fields in response
            access_token = data.get('access_token')
            token_type = data.get('token_type')
            user_data = data.get('user', {})
            
            if access_token and token_type == 'bearer':
                is_admin = user_data.get('is_admin', False)
                is_super_admin = user_data.get('is_super_admin', False)
                user_email = user_data.get('email', '')
                user_id = user_data.get('id', '')
                
                if is_admin and is_super_admin:
                    self.log_test(test_name, True, 
                        f"Login successful - Token: {access_token[:20]}..., "
                        f"User ID: {user_id}, Email: {user_email}, "
                        f"is_admin: {is_admin}, is_super_admin: {is_super_admin}")
                    
                    # Test token validation with /auth/me
                    self.test_token_validation(access_token, identifier)
                    
                    # Check for cookie in response headers
                    self.check_cookie_setting(headers, identifier)
                    
                    return access_token
                else:
                    self.log_test(test_name, False, 
                        f"User flags incorrect - is_admin: {is_admin}, is_super_admin: {is_super_admin}")
            else:
                self.log_test(test_name, False, 
                    f"Missing access_token or incorrect token_type. Token: {access_token}, Type: {token_type}")
        else:
            error_detail = data.get('detail', 'Unknown error')
            self.log_test(test_name, False, 
                f"HTTP {status} - {error_detail}")
        
        return None
    
    def test_token_validation(self, token: str, identifier: str):
        """Test token validation using /auth/me endpoint"""
        headers = {'Authorization': f'Bearer {token}'}
        success, data, status, _ = self.make_request('GET', '/auth/me', headers=headers)
        
        test_name = f"Token Validation for {identifier}"
        
        if success and status == 200:
            is_admin = data.get('is_admin', False)
            is_super_admin = data.get('is_super_admin', False)
            user_email = data.get('email', '')
            
            if is_admin and is_super_admin:
                self.log_test(test_name, True, 
                    f"Token valid - Email: {user_email}, is_admin: {is_admin}, is_super_admin: {is_super_admin}")
            else:
                self.log_test(test_name, False, 
                    f"Token valid but incorrect flags - is_admin: {is_admin}, is_super_admin: {is_super_admin}")
        else:
            error_detail = data.get('detail', 'Unknown error')
            self.log_test(test_name, False, f"HTTP {status} - {error_detail}")
    
    def check_cookie_setting(self, headers: Dict, identifier: str):
        """Check if cookie is set correctly in response headers"""
        test_name = f"Cookie Setting for {identifier}"
        
        set_cookie = headers.get('set-cookie', '')
        if 'access_token' in set_cookie:
            # Parse cookie attributes
            cookie_attrs = []
            if 'httponly' in set_cookie.lower():
                cookie_attrs.append('HttpOnly')
            if 'secure' in set_cookie.lower():
                cookie_attrs.append('Secure')
            if 'samesite' in set_cookie.lower():
                cookie_attrs.append('SameSite')
            if 'domain=' in set_cookie.lower():
                cookie_attrs.append('Domain')
            
            self.log_test(test_name, True, 
                f"Cookie set with attributes: {', '.join(cookie_attrs)}")
        else:
            self.log_test(test_name, False, "No access_token cookie found in response headers")
    
    def test_wrong_password(self, identifier: str):
        """Test login with wrong password to verify error handling"""
        print(f"\n🔒 TESTING WRONG PASSWORD - {identifier}")
        
        login_data = {
            "identifier": identifier,
            "password": "wrong_password_123"
        }
        
        success, data, status, _ = self.make_request('POST', '/auth/login', login_data)
        
        test_name = f"Wrong Password Test for {identifier}"
        
        if not success and status == 401:
            error_detail = data.get('detail', '')
            if error_detail == 'wrong_password':
                self.log_test(test_name, True, "Correctly returned 401 with 'wrong_password' error")
            else:
                self.log_test(test_name, True, f"Correctly returned 401 with error: {error_detail}")
        else:
            self.log_test(test_name, False, 
                f"Expected 401 but got HTTP {status} - {data}")
    
    def run_comprehensive_super_admin_tests(self):
        """Run all super admin login tests as requested"""
        print("=" * 80)
        print("🎯 SUPER ADMIN LOGIN COMPREHENSIVE TESTING")
        print("=" * 80)
        print(f"Backend URL: {self.api_url}")
        print(f"Testing Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test credentials as specified in the review request
        super_admin_credentials = [
            ("younes.sowady2011@gmail.com", "younes2025", "Email 1"),
            ("00905013715391", "younes2025", "Phone"),
            ("info@auraaluxury.com", "younes2025", "Email 2")
        ]
        
        valid_tokens = []
        
        # Test each super admin credential
        for identifier, password, cred_type in super_admin_credentials:
            token = self.test_super_admin_login(identifier, password, cred_type)
            if token:
                valid_tokens.append((identifier, token))
            
            # Test wrong password for each credential
            self.test_wrong_password(identifier)
            
            print("-" * 60)
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 SUPER ADMIN LOGIN TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if valid_tokens:
            print(f"\n✅ WORKING SUPER ADMIN ACCOUNTS: {len(valid_tokens)}")
            for identifier, token in valid_tokens:
                print(f"   - {identifier}: Token obtained successfully")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for i, failed_test in enumerate(self.failed_tests, 1):
                print(f"   {i}. {failed_test['test']}")
                print(f"      {failed_test['details']}")
        
        # Final assessment
        if len(valid_tokens) == 3:
            print("\n🎉 CONCLUSION: All super admin accounts are working perfectly!")
        elif len(valid_tokens) > 0:
            print(f"\n⚠️  CONCLUSION: {len(valid_tokens)}/3 super admin accounts working. Some issues found.")
        else:
            print("\n🚨 CONCLUSION: No super admin accounts are working. Critical authentication issue!")
        
        return self.tests_passed, self.tests_run, self.failed_tests

def main():
    """Main test execution"""
    # Use the backend URL from frontend/.env as specified in the review
    backend_url = "https://luxury-ecom-4.preview.emergentagent.com"
    
    print("🚀 Starting Super Admin Login Testing...")
    print(f"Backend URL: {backend_url}")
    
    tester = SuperAdminLoginTester(backend_url)
    
    try:
        passed, total, failed = tester.run_comprehensive_super_admin_tests()
        
        # Exit with appropriate code
        if len(failed) == 0:
            print("\n✅ All tests passed!")
            sys.exit(0)
        else:
            print(f"\n❌ {len(failed)} tests failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️ Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Testing failed with error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()