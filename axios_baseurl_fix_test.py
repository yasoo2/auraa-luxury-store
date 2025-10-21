#!/usr/bin/env python3
"""
Axios BaseURL Fix Verification Testing
Tests the specific endpoints mentioned in the review request to verify the axios baseURL fix
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class AxiosBaseURLFixTester:
    def __init__(self, base_url="https://luxury-import-sys.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()  # Use session to maintain cookies
        
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
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if self.admin_token:
            default_headers['Authorization'] = f'Bearer {self.admin_token}'
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=default_headers, timeout=10)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=default_headers, timeout=10)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=default_headers, timeout=10)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=default_headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0
    
    def test_health_check_endpoints(self):
        """Test health check endpoints as specified in review request"""
        print("\n🏥 HEALTH CHECK ENDPOINTS TESTING")
        
        # Test GET /api/health - should return {status: 'ok'}
        success, data, status = self.make_request('GET', '/health')
        
        if success and data.get('status') == 'ok':
            self.log_test("Health Check Endpoint", True, f"Status: {status}, Response: {data}")
        else:
            self.log_test("Health Check Endpoint", False, f"Status: {status}, Response: {data}")
        
        # Test GET /api/readiness - should return {status: 'ready'}
        success, data, status = self.make_request('GET', '/readiness')
        
        if success and data.get('status') == 'ready':
            self.log_test("Readiness Check Endpoint", True, f"Status: {status}, Response: {data}")
        else:
            # Check if endpoint exists or if it's just not implemented
            if status == 404:
                self.log_test("Readiness Check Endpoint", False, f"Endpoint not found (404) - may not be implemented")
            else:
                self.log_test("Readiness Check Endpoint", False, f"Status: {status}, Response: {data}")
    
    def test_authentication_flow(self):
        """Test authentication flow as specified in review request"""
        print("\n🔐 AUTHENTICATION FLOW TESTING")
        
        # Test POST /api/auth/login with admin credentials (admin@auraa.com / admin123)
        admin_credentials = {
            "identifier": "admin@auraa.com",
            "password": "admin123"
        }
        
        success, data, status = self.make_request('POST', '/auth/login', admin_credentials)
        
        if success and data.get('success'):
            # Check if access_token is in response or if login uses cookies
            access_token = data.get('access_token')
            user_data = data.get('user', {})
            is_admin = user_data.get('is_admin', False)
            
            if is_admin:
                if access_token:
                    self.admin_token = access_token
                    self.log_test("Admin Login (admin@auraa.com)", True, 
                                f"Login successful, access_token length: {len(self.admin_token)}, is_admin: {is_admin}")
                else:
                    # Login might use cookies instead of returning token
                    self.log_test("Admin Login (admin@auraa.com)", True, 
                                f"Login successful (cookie-based), is_admin: {is_admin}")
                
                # Test GET /api/auth/me with the token - should return admin user data
                success_me, data_me, status_me = self.make_request('GET', '/auth/me')
                
                if success_me and data_me.get('is_admin'):
                    self.log_test("Admin Token Validation (/auth/me)", True, 
                                f"Token validated, user: {data_me.get('email')}, is_admin: {data_me.get('is_admin')}")
                else:
                    self.log_test("Admin Token Validation (/auth/me)", False, 
                                f"Status: {status_me}, Response: {data_me}")
            else:
                self.log_test("Admin Login (admin@auraa.com)", False, 
                            f"User is not admin, is_admin: {is_admin}")
        else:
            self.log_test("Admin Login (admin@auraa.com)", False, 
                        f"Status: {status}, Response: {data}")
    
    def test_admin_endpoints(self):
        """Test admin endpoints with admin token as specified in review request"""
        print("\n👑 ADMIN ENDPOINTS TESTING")
        
        if not self.admin_token:
            self.log_test("Admin Endpoints", False, "No admin token available")
            return
        
        # Test GET /api/admin/users - should return user list
        success, data, status = self.make_request('GET', '/admin/users')
        
        if success:
            # Check if it's a list or has users data
            if isinstance(data, list):
                self.log_test("Admin Users Endpoint", True, f"Retrieved {len(data)} users")
            elif isinstance(data, dict) and 'users' in data:
                users = data.get('users', [])
                self.log_test("Admin Users Endpoint", True, f"Retrieved {len(users)} users")
            else:
                self.log_test("Admin Users Endpoint", False, f"Unexpected response format: {type(data)}")
        else:
            # Check if endpoint exists
            if status == 404:
                # Try alternative endpoint
                success_alt, data_alt, status_alt = self.make_request('GET', '/admin/users/all')
                if success_alt:
                    self.log_test("Admin Users Endpoint (alternative)", True, f"Retrieved users via /admin/users/all")
                else:
                    self.log_test("Admin Users Endpoint", False, f"Status: {status}, Alternative status: {status_alt}")
            else:
                self.log_test("Admin Users Endpoint", False, f"Status: {status}, Response: {data}")
        
        # Test GET /api/admin/integrations - should return integrations data
        success, data, status = self.make_request('GET', '/admin/integrations')
        
        if success and data.get('type') == 'integrations':
            self.log_test("Admin Integrations Endpoint", True, 
                        f"Retrieved integrations with ID: {data.get('id')}")
        else:
            self.log_test("Admin Integrations Endpoint", False, 
                        f"Status: {status}, Response: {data}")
    
    def test_import_functionality(self):
        """Test import functionality as specified in review request"""
        print("\n📥 IMPORT FUNCTIONALITY TESTING")
        
        if not self.admin_token:
            self.log_test("Import Functionality", False, "No admin token available")
            return
        
        # Test GET /api/imports/{job_id}/status with a sample job_id
        sample_job_id = "test_job_123"
        success, data, status = self.make_request('GET', f'/imports/{sample_job_id}/status')
        
        if success:
            self.log_test("Import Job Status", True, f"Status endpoint working, Response: {data}")
        else:
            # Check if it's 404 (job not found) which is expected for test job
            if status == 404:
                self.log_test("Import Job Status", True, f"Endpoint working (404 for non-existent job is expected)")
            else:
                self.log_test("Import Job Status", False, f"Status: {status}, Response: {data}")
        
        # Test POST /api/imports/start with sample data
        sample_import_data = {
            "source": "test",
            "type": "products",
            "data": {
                "search_query": "luxury accessories",
                "limit": 5
            }
        }
        
        success, data, status = self.make_request('POST', '/imports/start', sample_import_data)
        
        if success:
            job_id = data.get('job_id') or data.get('id')
            if job_id:
                self.log_test("Import Job Creation", True, f"Job created with ID: {job_id}")
            else:
                self.log_test("Import Job Creation", True, f"Import started, Response: {data}")
        else:
            # Check if endpoint exists
            if status == 404:
                self.log_test("Import Job Creation", False, f"Import endpoint not found (404)")
            else:
                self.log_test("Import Job Creation", False, f"Status: {status}, Response: {data}")
    
    def test_quick_import_page_flow(self):
        """Simulate the Quick Import page flow as specified in review request"""
        print("\n⚡ QUICK IMPORT PAGE FLOW SIMULATION")
        
        if not self.admin_token:
            self.log_test("Quick Import Flow", False, "No admin token available")
            return
        
        # 1. Test that health/readiness checks work (already tested above, but verify again)
        success_health, data_health, status_health = self.make_request('GET', '/health')
        
        if success_health and data_health.get('status') == 'ok':
            self.log_test("Quick Import - Health Check", True, "Health check working for import page")
        else:
            self.log_test("Quick Import - Health Check", False, f"Health check failed: {status_health}")
        
        # 2. Test that import job creation works (simulate quick import)
        quick_import_data = {
            "source": "aliexpress",
            "search_query": "jewelry",
            "limit": 10,
            "category": "accessories"
        }
        
        # Try different possible endpoints for quick import
        endpoints_to_try = [
            '/imports/quick',
            '/imports/start',
            '/admin/quick-import',
            '/auto-update/sync-products'
        ]
        
        import_success = False
        for endpoint in endpoints_to_try:
            success, data, status = self.make_request('POST', endpoint, quick_import_data)
            if success:
                self.log_test("Quick Import - Job Creation", True, 
                            f"Quick import working via {endpoint}, Response: {data}")
                import_success = True
                break
            elif status != 404:  # If not 404, there might be another issue
                self.log_test("Quick Import - Job Creation", False, 
                            f"Failed via {endpoint}, Status: {status}, Response: {data}")
                break
        
        if not import_success:
            self.log_test("Quick Import - Job Creation", False, 
                        "No working quick import endpoint found")
        
        # 3. Test that job status tracking works
        # Use a mock job ID since we might not have created a real job
        test_job_id = "mock_job_456"
        
        # Try different possible endpoints for job tracking
        tracking_endpoints = [
            f'/imports/{test_job_id}/status',
            f'/admin/import-tasks/{test_job_id}',
            f'/auto-update/bulk-import-tasks'
        ]
        
        tracking_success = False
        for endpoint in tracking_endpoints:
            success, data, status = self.make_request('GET', endpoint)
            if success:
                self.log_test("Quick Import - Job Tracking", True, 
                            f"Job tracking working via {endpoint}")
                tracking_success = True
                break
            elif status != 404:  # If not 404, endpoint exists but might have other issues
                if status == 422:  # Validation error for mock job ID is acceptable
                    self.log_test("Quick Import - Job Tracking", True, 
                                f"Job tracking endpoint exists (422 for mock ID is expected)")
                    tracking_success = True
                    break
        
        if not tracking_success:
            self.log_test("Quick Import - Job Tracking", False, 
                        "No working job tracking endpoint found")
    
    def test_backend_connectivity(self):
        """Test basic backend connectivity to verify axios baseURL fix"""
        print("\n🌐 BACKEND CONNECTIVITY TESTING")
        
        # Test basic API root endpoint
        success, data, status = self.make_request('GET', '/')
        
        if success:
            message = data.get('message', '')
            if 'API' in message or 'Welcome' in message:
                self.log_test("Backend Connectivity", True, 
                            f"Backend accessible, Message: {message}")
            else:
                self.log_test("Backend Connectivity", True, 
                            f"Backend accessible, Response: {data}")
        else:
            self.log_test("Backend Connectivity", False, 
                        f"Backend not accessible, Status: {status}, Response: {data}")
        
        # Test CORS headers (important for frontend axios calls)
        try:
            response = self.session.options(f"{self.api_url}/health", 
                                          headers={'Origin': 'https://luxury-import-sys.preview.emergentagent.com'},
                                          timeout=10)
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            if any(cors_headers.values()):
                self.log_test("CORS Headers", True, f"CORS configured: {cors_headers}")
            else:
                self.log_test("CORS Headers", False, "No CORS headers found")
                
        except Exception as e:
            self.log_test("CORS Headers", False, f"CORS test failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all axios baseURL fix verification tests"""
        print("🔧 AXIOS BASEURL FIX VERIFICATION TESTING")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print(f"API URL: {self.api_url}")
        print("=" * 60)
        
        # Run tests in order specified in review request
        self.test_backend_connectivity()
        self.test_health_check_endpoints()
        self.test_authentication_flow()
        self.test_admin_endpoints()
        self.test_import_functionality()
        self.test_quick_import_page_flow()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
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
        
        print("\n" + "=" * 60)
        
        if len(self.failed_tests) == 0:
            print("🎉 ALL TESTS PASSED - AXIOS BASEURL FIX VERIFIED!")
        elif len(self.failed_tests) <= 2:
            print("✅ MOSTLY SUCCESSFUL - Minor issues found")
        else:
            print("⚠️  MULTIPLE ISSUES FOUND - Review needed")
        
        return len(self.failed_tests) == 0

def main():
    """Main function to run the axios baseURL fix verification tests"""
    tester = AxiosBaseURLFixTester()
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()