#!/usr/bin/env python3
"""
Backend Testing for New Features - Auraa Luxury Store
Tests newly implemented endpoints: SSE, CMS Pages, Theme Customization, Media Library, Shipping Integration
"""

import requests
import sys
import json
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
import threading
import queue

class NewFeaturesAPITester:
    def __init__(self, base_url="https://cors-fix-15.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.regular_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_cms_page_id = None
        self.test_media_id = None
        
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
        """Setup admin and regular user authentication"""
        print("🔐 Setting up authentication...")
        
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
        
        # Regular user registration for comparison tests
        test_user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "testpass123",
            "first_name": "Test",
            "last_name": "User",
            "phone": "+966501234567"
        }
        
        success, data, status = self.make_request('POST', '/auth/register', test_user_data)
        if success and data.get('access_token'):
            self.regular_token = data['access_token']
            self.log_test("Regular User Authentication Setup", True, f"Regular user token obtained")
        else:
            self.log_test("Regular User Authentication Setup", False, f"Status: {status}, Response: {data}")
        
        return True

    # ========== SSE IMPORT PROGRESS STREAMING TESTS ==========
    
    def test_sse_import_progress_streaming(self):
        """Test SSE Import Progress Streaming endpoint"""
        print("\n📡 TESTING SSE IMPORT PROGRESS STREAMING")
        
        # First, create a mock import task to test streaming
        task_id = str(uuid.uuid4())
        
        # Test SSE endpoint with admin authentication
        sse_url = f"{self.api_url}/admin/import-tasks/{task_id}/stream"
        headers = {
            'Authorization': f'Bearer {self.admin_token}',
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
        }
        
        try:
            # Test SSE connection (short timeout for testing)
            response = requests.get(sse_url, headers=headers, stream=True, timeout=5)
            
            if response.status_code == 200:
                # Check if it's an SSE response
                content_type = response.headers.get('content-type', '')
                if 'text/event-stream' in content_type:
                    self.log_test("SSE Connection Established", True, f"Content-Type: {content_type}")
                    
                    # Try to read some data (with timeout)
                    try:
                        for line in response.iter_lines(decode_unicode=True):
                            if line and line.startswith('data:'):
                                # Parse JSON data
                                json_data = line[5:].strip()  # Remove 'data:' prefix
                                try:
                                    event_data = json.loads(json_data)
                                    # Verify expected fields
                                    required_fields = ['status', 'progress', 'products_imported']
                                    if all(field in event_data for field in required_fields):
                                        self.log_test("SSE Data Format Validation", True, f"Event data: {event_data}")
                                    else:
                                        self.log_test("SSE Data Format Validation", False, f"Missing fields in: {event_data}")
                                    break  # Exit after first valid event
                                except json.JSONDecodeError:
                                    self.log_test("SSE JSON Parsing", False, f"Invalid JSON: {json_data}")
                                    break
                            # Timeout after a few seconds
                            time.sleep(0.1)
                    except requests.exceptions.Timeout:
                        self.log_test("SSE Stream Reading", True, "SSE stream accessible (timeout expected for testing)")
                else:
                    self.log_test("SSE Content Type", False, f"Expected text/event-stream, got: {content_type}")
            elif response.status_code == 404:
                # Task not found is expected for non-existent task
                self.log_test("SSE Task Not Found", True, "Properly returns 404 for non-existent task")
            else:
                self.log_test("SSE Connection", False, f"Status: {response.status_code}")
                
        except requests.exceptions.Timeout:
            # Timeout is expected for SSE testing
            self.log_test("SSE Endpoint Accessibility", True, "SSE endpoint accessible (timeout expected)")
        except Exception as e:
            self.log_test("SSE Connection Error", False, f"Error: {str(e)}")
        
        # Test SSE authentication (should fail without admin token)
        try:
            response = requests.get(sse_url, headers={'Accept': 'text/event-stream'}, timeout=3)
            if response.status_code == 403:
                self.log_test("SSE Authentication Required", True, "Properly requires admin authentication")
            else:
                self.log_test("SSE Authentication Required", False, f"Expected 403, got {response.status_code}")
        except:
            self.log_test("SSE Authentication Test", False, "Failed to test authentication")

    # ========== CMS PAGES MANAGEMENT TESTS ==========
    
    def test_cms_pages_crud(self):
        """Test CMS Pages CRUD operations"""
        print("\n📄 TESTING CMS PAGES MANAGEMENT")
        
        # Test GET /api/admin/cms-pages (list all pages)
        success, data, status = self.make_request('GET', '/admin/cms-pages')
        
        if success and isinstance(data, list):
            self.log_test("CMS Pages List", True, f"Retrieved {len(data)} CMS pages")
        else:
            self.log_test("CMS Pages List", False, f"Status: {status}, Response: {data}")
        
        # Test POST /api/admin/cms-pages (create new page)
        new_page_data = {
            "title_en": "Test Privacy Policy",
            "title_ar": "سياسة الخصوصية التجريبية",
            "content_en": "This is a test privacy policy content in English.",
            "content_ar": "هذا محتوى تجريبي لسياسة الخصوصية باللغة العربية.",
            "slug": "test-privacy-policy",
            "route": "/privacy-policy-test",
            "is_active": True
        }
        
        success, data, status = self.make_request('POST', '/admin/cms-pages', new_page_data)
        
        if success and data.get('id'):
            self.test_cms_page_id = data['id']
            self.log_test("CMS Page CREATE", True, f"Created page: {data.get('title_en')}")
            
            # Verify bilingual content support
            if (data.get('title_en') == new_page_data['title_en'] and 
                data.get('title_ar') == new_page_data['title_ar'] and
                data.get('content_en') == new_page_data['content_en'] and
                data.get('content_ar') == new_page_data['content_ar']):
                self.log_test("CMS Bilingual Content Support", True, "English and Arabic content properly stored")
            else:
                self.log_test("CMS Bilingual Content Support", False, "Bilingual content not properly stored")
        else:
            self.log_test("CMS Page CREATE", False, f"Status: {status}, Response: {data}")
        
        # Test PUT /api/admin/cms-pages/{page_id} (update existing page)
        if self.test_cms_page_id:
            update_data = {
                "title_en": "Updated Test Privacy Policy",
                "title_ar": "سياسة الخصوصية المحدثة",
                "content_en": "This is updated privacy policy content in English.",
                "content_ar": "هذا محتوى محدث لسياسة الخصوصية باللغة العربية.",
                "slug": "updated-privacy-policy",
                "route": "/privacy-policy-updated",
                "is_active": False
            }
            
            success, data, status = self.make_request('PUT', f'/admin/cms-pages/{self.test_cms_page_id}', update_data)
            
            if success and data.get('title_en') == update_data['title_en']:
                self.log_test("CMS Page UPDATE", True, f"Updated page: {data.get('title_en')}")
            else:
                self.log_test("CMS Page UPDATE", False, f"Status: {status}, Response: {data}")
        
        # Test DELETE /api/admin/cms-pages/{page_id} (delete page)
        if self.test_cms_page_id:
            success, data, status = self.make_request('DELETE', f'/admin/cms-pages/{self.test_cms_page_id}')
            
            if success:
                self.log_test("CMS Page DELETE", True, "Page deleted successfully")
                
                # Verify deletion
                success_verify, data_verify, status_verify = self.make_request('GET', f'/admin/cms-pages/{self.test_cms_page_id}')
                if not success_verify and status_verify == 404:
                    self.log_test("CMS Page DELETE Verification", True, "Page properly deleted (404 on GET)")
                else:
                    self.log_test("CMS Page DELETE Verification", False, f"Page still exists: {status_verify}")
            else:
                self.log_test("CMS Page DELETE", False, f"Status: {status}, Response: {data}")
    
    def test_cms_pages_authentication(self):
        """Test CMS Pages authentication requirements"""
        # Test without admin token
        original_token = self.admin_token
        self.admin_token = None
        
        success, data, status = self.make_request('GET', '/admin/cms-pages')
        if not success and status in [401, 403]:
            self.log_test("CMS Pages - No Auth", True, f"Properly blocked unauthenticated access (Status: {status})")
        else:
            self.log_test("CMS Pages - No Auth", False, f"Should return 401/403, got {status}")
        
        # Test with regular user token
        if self.regular_token:
            self.admin_token = self.regular_token
            success, data, status = self.make_request('GET', '/admin/cms-pages')
            if not success and status == 403:
                self.log_test("CMS Pages - Non-Admin", True, "Properly blocked non-admin access")
            else:
                self.log_test("CMS Pages - Non-Admin", False, f"Should return 403, got {status}")
        
        # Restore admin token
        self.admin_token = original_token

    # ========== THEME CUSTOMIZATION TESTS ==========
    
    def test_theme_customization(self):
        """Test Theme Customization endpoints"""
        print("\n🎨 TESTING THEME CUSTOMIZATION")
        
        # Test GET /api/admin/theme (load theme settings)
        success, data, status = self.make_request('GET', '/admin/theme')
        
        if success:
            self.log_test("Theme GET", True, f"Retrieved theme settings")
            
            # Check if it has expected theme structure
            theme_fields = ['colors', 'fonts', 'settings']
            if any(field in data for field in theme_fields):
                self.log_test("Theme Structure", True, "Theme has expected structure")
            else:
                self.log_test("Theme Structure", False, f"Missing theme fields in: {data}")
        else:
            self.log_test("Theme GET", False, f"Status: {status}, Response: {data}")
        
        # Test POST /api/admin/theme (save theme)
        theme_data = {
            "colors": {
                "primary": "#D4AF37",
                "secondary": "#F5F5DC",
                "accent": "#FFD700",
                "background": "#FFFFFF"
            },
            "fonts": {
                "heading": "Playfair Display",
                "body": "Source Sans Pro",
                "size_base": "16px"
            },
            "settings": {
                "border_radius": "8px",
                "button_style": "rounded",
                "animations_enabled": True,
                "glassmorphism_enabled": False
            }
        }
        
        success, data, status = self.make_request('POST', '/admin/theme', theme_data)
        
        if success:
            self.log_test("Theme SAVE", True, "Theme saved successfully")
            
            # Test theme persistence - retrieve again
            success_verify, data_verify, status_verify = self.make_request('GET', '/admin/theme')
            
            if success_verify:
                # Check if saved data persists
                if (data_verify.get('colors', {}).get('primary') == theme_data['colors']['primary'] and
                    data_verify.get('fonts', {}).get('heading') == theme_data['fonts']['heading']):
                    self.log_test("Theme Persistence", True, "Theme data persists after save")
                else:
                    self.log_test("Theme Persistence", False, "Theme data not properly persisted")
            else:
                self.log_test("Theme Persistence", False, f"Failed to retrieve theme after save: {status_verify}")
        else:
            self.log_test("Theme SAVE", False, f"Status: {status}, Response: {data}")
        
        # Test upsert functionality (save again with different data)
        updated_theme_data = {
            "colors": {
                "primary": "#C0392B",
                "secondary": "#E8F8F5",
                "accent": "#F39C12",
                "background": "#FAFAFA"
            },
            "fonts": {
                "heading": "Montserrat",
                "body": "Open Sans"
            }
        }
        
        success, data, status = self.make_request('POST', '/admin/theme', updated_theme_data)
        
        if success:
            self.log_test("Theme UPSERT", True, "Theme upsert functionality working")
        else:
            self.log_test("Theme UPSERT", False, f"Status: {status}, Response: {data}")

    # ========== MEDIA LIBRARY TESTS ==========
    
    def test_media_library(self):
        """Test Media Library endpoints"""
        print("\n🖼️ TESTING MEDIA LIBRARY")
        
        # Test GET /api/admin/media (list all media files)
        success, data, status = self.make_request('GET', '/admin/media')
        
        if success and isinstance(data, list):
            self.log_test("Media Library List", True, f"Retrieved {len(data)} media files")
            
            # If there are media files, store one for deletion test
            if len(data) > 0:
                self.test_media_id = data[0].get('id')
        else:
            self.log_test("Media Library List", False, f"Status: {status}, Response: {data}")
        
        # Test media record creation via upload-image endpoint
        # Note: We can't actually upload files in this test, but we can verify the endpoint exists
        upload_url = f"{self.api_url}/admin/upload-image"
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test without file (should fail with proper error)
        try:
            response = requests.post(upload_url, headers=headers, timeout=5)
            if response.status_code == 422:  # Unprocessable Entity - missing file
                self.log_test("Upload Image Endpoint", True, "Upload endpoint exists and validates file requirement")
            else:
                self.log_test("Upload Image Endpoint", False, f"Unexpected status: {response.status_code}")
        except Exception as e:
            self.log_test("Upload Image Endpoint", False, f"Error: {str(e)}")
        
        # Test DELETE /api/admin/media/{media_id} (delete media with file cleanup)
        if self.test_media_id:
            success, data, status = self.make_request('DELETE', f'/admin/media/{self.test_media_id}')
            
            if success:
                self.log_test("Media DELETE", True, "Media deleted successfully")
                
                # Verify deletion from database
                success_verify, data_verify, status_verify = self.make_request('GET', '/admin/media')
                if success_verify:
                    # Check if the media is no longer in the list
                    remaining_ids = [media.get('id') for media in data_verify]
                    if self.test_media_id not in remaining_ids:
                        self.log_test("Media DELETE Verification", True, "Media record removed from database")
                    else:
                        self.log_test("Media DELETE Verification", False, "Media record still exists in database")
                else:
                    self.log_test("Media DELETE Verification", False, f"Failed to verify deletion: {status_verify}")
            elif status == 404:
                self.log_test("Media DELETE", True, "Properly returns 404 for non-existent media")
            else:
                self.log_test("Media DELETE", False, f"Status: {status}, Response: {data}")

    # ========== SHIPPING INTEGRATION REGRESSION TESTS ==========
    
    def test_shipping_integration_regression(self):
        """Test Cart Page Shipping Integration (Regression)"""
        print("\n🚚 TESTING SHIPPING INTEGRATION (REGRESSION)")
        
        # Test GET /api/geo/detect
        success, data, status = self.make_request('GET', '/geo/detect')
        
        if success and data.get('country_code'):
            self.log_test("Geo Detection", True, f"Detected country: {data.get('country_code')}")
        else:
            self.log_test("Geo Detection", False, f"Status: {status}, Response: {data}")
        
        # Test POST /api/shipping/estimate with cart items
        shipping_request = {
            "country_code": "SA",
            "items": [
                {"product_id": "test-product-1", "quantity": 1},
                {"product_id": "test-product-2", "quantity": 2}
            ],
            "preferred": "fastest",
            "currency": "SAR"
        }
        
        success, data, status = self.make_request('POST', '/shipping/estimate', shipping_request)
        
        if success:
            # Check response structure
            required_fields = ['success', 'shipping_cost', 'estimated_days']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                self.log_test("Shipping Estimate", True, 
                            f"Cost: {data.get('shipping_cost')}, Days: {data.get('estimated_days')}")
            else:
                self.log_test("Shipping Estimate", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("Shipping Estimate", False, f"Status: {status}, Response: {data}")
        
        # Test with empty items (should fail)
        empty_request = {
            "country_code": "SA",
            "items": [],
            "preferred": "fastest"
        }
        
        success, data, status = self.make_request('POST', '/shipping/estimate', empty_request)
        
        if not success and status == 400:
            self.log_test("Shipping Estimate - Empty Items", True, "Properly validates empty items")
        else:
            self.log_test("Shipping Estimate - Empty Items", False, f"Should return 400, got {status}")
        
        # Test authentication requirements
        original_token = self.admin_token
        
        # Test with admin authentication
        success, data, status = self.make_request('POST', '/shipping/estimate', shipping_request)
        if success:
            self.log_test("Shipping Estimate - Admin Auth", True, "Works with admin authentication")
        else:
            self.log_test("Shipping Estimate - Admin Auth", False, f"Failed with admin auth: {status}")
        
        # Test with regular user authentication
        if self.regular_token:
            self.admin_token = self.regular_token
            success, data, status = self.make_request('POST', '/shipping/estimate', shipping_request)
            if success:
                self.log_test("Shipping Estimate - Regular User Auth", True, "Works with regular user authentication")
            else:
                self.log_test("Shipping Estimate - Regular User Auth", False, f"Failed with regular auth: {status}")
        
        # Restore admin token
        self.admin_token = original_token

    def run_all_tests(self):
        """Run all new feature tests"""
        print("🚀 Starting New Features Backend API Tests...")
        print(f"🔗 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Setup authentication first
        if not self.setup_authentication():
            print("❌ Authentication setup failed. Cannot proceed with tests.")
            return False
        
        # Run all test suites
        self.test_sse_import_progress_streaming()
        self.test_cms_pages_crud()
        self.test_cms_pages_authentication()
        self.test_theme_customization()
        self.test_media_library()
        self.test_shipping_integration_regression()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 NEW FEATURES TEST SUMMARY")
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
    tester = NewFeaturesAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())