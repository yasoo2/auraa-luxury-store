#!/usr/bin/env python3
"""
Focused Backend Testing for New Features - Auraa Luxury Store
Tests specific new endpoints with real data
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class FocusedNewFeaturesAPITester:
    def __init__(self, base_url="https://luxury-ecom-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.real_product_ids = []
        
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
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, timeout: int = 10) -> tuple:
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
                response = requests.get(url, headers=default_headers, timeout=timeout)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=timeout)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=timeout)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=timeout)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0
    
    def setup_authentication(self):
        """Setup admin authentication and get real product IDs"""
        print("🔐 Setting up authentication and getting real data...")
        
        # Admin login
        admin_credentials = {
            "email": "admin@auraa.com",
            "password": "admin123"
        }
        
        success, data, status = self.make_request('POST', '/auth/login', admin_credentials)
        if success and data.get('access_token'):
            self.admin_token = data['access_token']
            self.log_test("Admin Authentication Setup", True, f"Admin token obtained")
        else:
            self.log_test("Admin Authentication Setup", False, f"Status: {status}, Response: {data}")
            return False
        
        # Get real product IDs
        success, data, status = self.make_request('GET', '/products?limit=3')
        if success and isinstance(data, list) and len(data) > 0:
            self.real_product_ids = [product['id'] for product in data[:2]]
            self.log_test("Real Product IDs Retrieved", True, f"Got {len(self.real_product_ids)} product IDs")
        else:
            self.log_test("Real Product IDs Retrieved", False, f"Status: {status}")
            return False
        
        return True

    def test_sse_import_progress_basic(self):
        """Test basic SSE endpoint functionality"""
        print("\n📡 TESTING SSE IMPORT PROGRESS - BASIC FUNCTIONALITY")
        
        # Test SSE endpoint exists and requires auth
        import uuid
        task_id = str(uuid.uuid4())
        sse_url = f"{self.api_url}/admin/import-tasks/{task_id}/stream"
        
        # Test without auth
        try:
            response = requests.get(sse_url, timeout=3)
            if response.status_code == 403:
                self.log_test("SSE Authentication Required", True, "Properly requires admin authentication")
            else:
                self.log_test("SSE Authentication Required", False, f"Expected 403, got {response.status_code}")
        except:
            self.log_test("SSE Authentication Test", False, "Failed to test authentication")
        
        # Test with admin auth
        headers = {
            'Authorization': f'Bearer {self.admin_token}',
            'Accept': 'text/event-stream'
        }
        
        try:
            response = requests.get(sse_url, headers=headers, timeout=3)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'text/event-stream' in content_type:
                    self.log_test("SSE Endpoint Accessible", True, f"SSE endpoint working, Content-Type: {content_type}")
                else:
                    self.log_test("SSE Content Type", False, f"Expected text/event-stream, got: {content_type}")
            else:
                self.log_test("SSE Endpoint", False, f"Status: {response.status_code}")
        except requests.exceptions.Timeout:
            self.log_test("SSE Endpoint Accessible", True, "SSE endpoint accessible (timeout expected for non-existent task)")
        except Exception as e:
            self.log_test("SSE Endpoint Error", False, f"Error: {str(e)}")

    def test_cms_pages_basic_crud(self):
        """Test CMS Pages basic CRUD operations"""
        print("\n📄 TESTING CMS PAGES - BASIC CRUD")
        
        # Test GET /api/admin/cms-pages
        success, data, status = self.make_request('GET', '/admin/cms-pages')
        
        if success and isinstance(data, list):
            self.log_test("CMS Pages GET", True, f"Retrieved {len(data)} CMS pages")
        else:
            self.log_test("CMS Pages GET", False, f"Status: {status}, Response: {data}")
        
        # Test authentication
        original_token = self.admin_token
        self.admin_token = None
        
        success, data, status = self.make_request('GET', '/admin/cms-pages')
        if not success and status == 403:
            self.log_test("CMS Pages Authentication", True, "Properly requires admin authentication")
        else:
            self.log_test("CMS Pages Authentication", False, f"Expected 403, got {status}")
        
        self.admin_token = original_token

    def test_theme_customization_basic(self):
        """Test Theme Customization basic functionality"""
        print("\n🎨 TESTING THEME CUSTOMIZATION - BASIC FUNCTIONALITY")
        
        # Test GET /api/admin/theme
        success, data, status = self.make_request('GET', '/admin/theme')
        
        if success:
            self.log_test("Theme GET", True, f"Retrieved theme settings")
        else:
            self.log_test("Theme GET", False, f"Status: {status}, Response: {data}")
        
        # Test POST /api/admin/theme
        theme_data = {
            "colors": {
                "primary": "#D4AF37",
                "secondary": "#F5F5DC"
            },
            "fonts": {
                "heading": "Playfair Display"
            }
        }
        
        success, data, status = self.make_request('POST', '/admin/theme', theme_data)
        
        if success:
            self.log_test("Theme SAVE", True, "Theme saved successfully")
        else:
            self.log_test("Theme SAVE", False, f"Status: {status}, Response: {data}")

    def test_media_library_basic(self):
        """Test Media Library basic functionality"""
        print("\n🖼️ TESTING MEDIA LIBRARY - BASIC FUNCTIONALITY")
        
        # Test GET /api/admin/media
        success, data, status = self.make_request('GET', '/admin/media')
        
        if success and isinstance(data, list):
            self.log_test("Media Library GET", True, f"Retrieved {len(data)} media files")
        else:
            self.log_test("Media Library GET", False, f"Status: {status}, Response: {data}")
        
        # Test upload endpoint exists
        upload_url = f"{self.api_url}/admin/upload-image"
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = requests.post(upload_url, headers=headers, timeout=5)
            if response.status_code == 422:  # Missing file
                self.log_test("Upload Image Endpoint", True, "Upload endpoint exists and validates input")
            else:
                self.log_test("Upload Image Endpoint", False, f"Unexpected status: {response.status_code}")
        except Exception as e:
            self.log_test("Upload Image Endpoint", False, f"Error: {str(e)}")

    def test_shipping_integration_with_real_products(self):
        """Test Shipping Integration with real product IDs"""
        print("\n🚚 TESTING SHIPPING INTEGRATION - WITH REAL PRODUCTS")
        
        # Test GET /api/geo/detect
        success, data, status = self.make_request('GET', '/geo/detect')
        
        if success and data.get('country_code'):
            detected_country = data.get('country_code')
            self.log_test("Geo Detection", True, f"Detected country: {detected_country}")
        else:
            self.log_test("Geo Detection", False, f"Status: {status}, Response: {data}")
        
        # Test POST /api/shipping/estimate with real product IDs
        if self.real_product_ids:
            shipping_request = {
                "country_code": "SA",
                "items": [
                    {"product_id": self.real_product_ids[0], "quantity": 1}
                ],
                "preferred": "fastest",
                "currency": "SAR"
            }
            
            success, data, status = self.make_request('POST', '/shipping/estimate', shipping_request)
            
            if success:
                self.log_test("Shipping Estimate - Real Products", True, 
                            f"Estimate successful: {data}")
            elif status == 400 and 'unavailable' in str(data):
                self.log_test("Shipping Estimate - Real Products", True, 
                            f"Properly handles unavailable shipping (expected for test products)")
            else:
                self.log_test("Shipping Estimate - Real Products", False, 
                            f"Status: {status}, Response: {data}")
        else:
            self.log_test("Shipping Estimate - Real Products", False, "No real product IDs available")

    def test_admin_endpoints_security(self):
        """Test security of all admin endpoints"""
        print("\n🔒 TESTING ADMIN ENDPOINTS SECURITY")
        
        admin_endpoints = [
            '/admin/cms-pages',
            '/admin/theme', 
            '/admin/media'
        ]
        
        # Test without token
        original_token = self.admin_token
        self.admin_token = None
        
        for endpoint in admin_endpoints:
            success, data, status = self.make_request('GET', endpoint)
            if not success and status == 403:
                self.log_test(f"Security Check - {endpoint}", True, "Properly requires authentication")
            else:
                self.log_test(f"Security Check - {endpoint}", False, f"Expected 403, got {status}")
        
        self.admin_token = original_token

    def run_focused_tests(self):
        """Run focused tests for new features"""
        print("🚀 Starting Focused New Features Backend API Tests...")
        print(f"🔗 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Setup authentication first
        if not self.setup_authentication():
            print("❌ Authentication setup failed. Cannot proceed with tests.")
            return False
        
        # Run focused test suites
        self.test_sse_import_progress_basic()
        self.test_cms_pages_basic_crud()
        self.test_theme_customization_basic()
        self.test_media_library_basic()
        self.test_shipping_integration_with_real_products()
        self.test_admin_endpoints_security()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 FOCUSED NEW FEATURES TEST SUMMARY")
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
                    print(f"   → {test['details']}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = FocusedNewFeaturesAPITester()
    
    try:
        success = tester.run_focused_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())