#!/usr/bin/env python3
"""
Super Admin Statistics API Test
Tests the specific endpoint requested in the review: /api/admin/super-admin-statistics
"""

import requests
import sys
import json
from datetime import datetime

class SuperAdminStatisticsTest:
    def __init__(self):
        # Use the backend URL from frontend/.env
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
    
    def make_request(self, method: str, endpoint: str, data: dict = None, headers: dict = None) -> tuple:
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
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0
    
    def test_super_admin_login(self):
        """Test Super Admin login with provided credentials"""
        print("🔐 TESTING SUPER ADMIN LOGIN")
        
        # Use the exact credentials from the review request
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
            user_id = user_data.get('id', 'N/A')
            email = user_data.get('email', 'N/A')
            
            if is_super_admin:
                self.log_test("Super Admin Login", True, 
                            f"✅ Login successful! User: {email}, ID: {user_id}, is_admin: {is_admin}, is_super_admin: {is_super_admin}")
                return True
            else:
                self.log_test("Super Admin Login", False, 
                            f"❌ User is not super admin. is_admin: {is_admin}, is_super_admin: {is_super_admin}")
                return False
        else:
            self.log_test("Super Admin Login", False, 
                        f"❌ Login failed. Status: {status}, Response: {data}")
            return False
    
    def test_super_admin_statistics_api(self):
        """Test the Super Admin Statistics API endpoint"""
        print("\n📊 TESTING SUPER ADMIN STATISTICS API")
        
        if not self.super_admin_token:
            self.log_test("Super Admin Statistics API", False, "❌ No super admin token available")
            return False
        
        # Test GET /api/admin/super-admin-statistics
        success, data, status = self.make_request('GET', '/admin/super-admin-statistics')
        
        if not success:
            self.log_test("Super Admin Statistics API", False, 
                        f"❌ API call failed. Status: {status}, Response: {data}")
            return False
        
        # Verify response structure
        required_fields = ['total_users', 'total_admins', 'total_super_admins', 'active_admins', 'inactive_admins', 'recent_actions']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            self.log_test("Super Admin Statistics API", False, 
                        f"❌ Missing required fields: {missing_fields}")
            return False
        
        # Extract values
        total_users = data.get('total_users')
        total_admins = data.get('total_admins')
        total_super_admins = data.get('total_super_admins')
        active_admins = data.get('active_admins')
        inactive_admins = data.get('inactive_admins')
        recent_actions = data.get('recent_actions')
        
        # Verify data types
        if not (isinstance(total_users, int) and total_users >= 0):
            self.log_test("Super Admin Statistics API", False, 
                        f"❌ total_users should be non-negative integer, got: {total_users} ({type(total_users)})")
            return False
        
        if not (isinstance(total_admins, int) and total_admins >= 0):
            self.log_test("Super Admin Statistics API", False, 
                        f"❌ total_admins should be non-negative integer, got: {total_admins} ({type(total_admins)})")
            return False
        
        if not (isinstance(total_super_admins, int) and total_super_admins >= 0):
            self.log_test("Super Admin Statistics API", False, 
                        f"❌ total_super_admins should be non-negative integer, got: {total_super_admins} ({type(total_super_admins)})")
            return False
        
        if not (isinstance(active_admins, int) and active_admins >= 0):
            self.log_test("Super Admin Statistics API", False, 
                        f"❌ active_admins should be non-negative integer, got: {active_admins} ({type(active_admins)})")
            return False
        
        if not (isinstance(inactive_admins, int) and inactive_admins >= 0):
            self.log_test("Super Admin Statistics API", False, 
                        f"❌ inactive_admins should be non-negative integer, got: {inactive_admins} ({type(inactive_admins)})")
            return False
        
        if not isinstance(recent_actions, list):
            self.log_test("Super Admin Statistics API", False, 
                        f"❌ recent_actions should be array, got: {type(recent_actions)}")
            return False
        
        # Verify logical consistency
        if not (total_super_admins <= total_admins <= total_users):
            self.log_test("Super Admin Statistics API", False, 
                        f"❌ Inconsistent counts: SuperAdmins({total_super_admins}) should be <= Admins({total_admins}) should be <= Users({total_users})")
            return False
        
        if active_admins + inactive_admins != total_admins:
            self.log_test("Super Admin Statistics API", False, 
                        f"❌ Active + Inactive admins ({active_admins} + {inactive_admins} = {active_admins + inactive_admins}) should equal total admins ({total_admins})")
            return False
        
        # Success!
        self.log_test("Super Admin Statistics API", True, 
                    f"✅ All checks passed! Statistics: Users={total_users}, Admins={total_admins}, SuperAdmins={total_super_admins}, Active={active_admins}, Inactive={inactive_admins}, RecentActions={len(recent_actions)}")
        
        return True
    
    def test_no_500_errors(self):
        """Verify no 500 errors occur"""
        print("\n🚫 TESTING FOR 500 ERRORS")
        
        if not self.super_admin_token:
            self.log_test("No 500 Errors Test", False, "❌ No super admin token available")
            return False
        
        # Test the endpoint again to make sure no 500 errors
        success, data, status = self.make_request('GET', '/admin/super-admin-statistics')
        
        if status == 500:
            self.log_test("No 500 Errors Test", False, 
                        f"❌ Received 500 error! Response: {data}")
            return False
        elif status == 200:
            self.log_test("No 500 Errors Test", True, 
                        f"✅ No 500 errors - received status {status}")
            return True
        else:
            self.log_test("No 500 Errors Test", False, 
                        f"❌ Unexpected status code: {status}, Response: {data}")
            return False
    
    def test_access_control(self):
        """Test access control for the endpoint"""
        print("\n🔒 TESTING ACCESS CONTROL")
        
        # Test without authentication
        original_token = self.super_admin_token
        self.super_admin_token = None
        
        success, data, status = self.make_request('GET', '/admin/super-admin-statistics')
        
        if status in [401, 403]:
            self.log_test("Access Control - No Auth", True, 
                        f"✅ Properly blocked unauthenticated access (Status: {status})")
        else:
            self.log_test("Access Control - No Auth", False, 
                        f"❌ Should block unauthenticated access, got status: {status}")
        
        # Restore token
        self.super_admin_token = original_token
    
    def run_all_tests(self):
        """Run all tests for the Super Admin Statistics API"""
        print("🚀 SUPER ADMIN STATISTICS API TEST")
        print("=" * 60)
        print(f"🔗 Testing API at: {self.api_url}")
        print(f"📋 Review Requirements:")
        print("   1. Login as Super Admin (younes.sowady2011@gmail.com / younes2025)")
        print("   2. Test GET /api/admin/super-admin-statistics")
        print("   3. Verify response includes required fields")
        print("   4. Confirm no 500 errors")
        print("   5. Verify statistics counts are correct")
        print("=" * 60)
        
        # Run tests in sequence
        login_success = self.test_super_admin_login()
        
        if login_success:
            self.test_super_admin_statistics_api()
            self.test_no_500_errors()
            self.test_access_control()
        else:
            print("\n❌ Cannot proceed with API tests - Super Admin login failed")
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['test']}")
                print(f"   → {test['details']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED!")
        
        print("=" * 60)
        
        return len(self.failed_tests) == 0

if __name__ == "__main__":
    tester = SuperAdminStatisticsTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)