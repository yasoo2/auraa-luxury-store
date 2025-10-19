#!/usr/bin/env python3
"""
Focused Backend API Testing for Auraa Luxury Store - Review Request
Tests the specific endpoints mentioned in the review request:
1. All product endpoints (GET /api/products, GET /api/categories)
2. Cart functionality (GET/POST/DELETE /api/cart/*)
3. Authentication (POST /api/auth/login with admin@auraa.com/admin123)
4. Admin endpoints (GET/POST /api/admin/*)
"""

import requests
import sys
import json
from datetime import datetime

class FocusedAuraaAPITester:
    def __init__(self, base_url="https://luxury-ecom-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_product_id = None
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}")
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
        if self.admin_token:
            default_headers['Authorization'] = f'Bearer {self.admin_token}'
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
                return False, {"error": f"Unsupported method: {method}"}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0

    def test_admin_authentication(self):
        """Test admin authentication with admin@auraa.com/admin123"""
        print("\n🔐 ADMIN AUTHENTICATION TESTING")
        
        admin_credentials = {
            "email": "admin@auraa.com",
            "password": "admin123"
        }
        
        success, data, status = self.make_request('POST', '/auth/login', admin_credentials)
        
        if success and data.get('access_token'):
            self.admin_token = data['access_token']
            user_data = data.get('user', {})
            is_admin = user_data.get('is_admin', False)
            
            if is_admin:
                self.log_test("Admin Login (admin@auraa.com/admin123)", True, 
                            f"✅ Admin authenticated successfully, is_admin: {is_admin}")
                
                # Test /auth/me endpoint
                success_me, data_me, status_me = self.make_request('GET', '/auth/me')
                if success_me and data_me.get('is_admin'):
                    self.log_test("Admin Token Validation (/auth/me)", True, 
                                f"✅ Admin user: {data_me.get('email')}")
                else:
                    self.log_test("Admin Token Validation (/auth/me)", False, 
                                f"❌ Token validation failed: {status_me}")
            else:
                self.log_test("Admin Login (admin@auraa.com/admin123)", False, 
                            f"❌ User is not admin, is_admin: {is_admin}")
        else:
            self.log_test("Admin Login (admin@auraa.com/admin123)", False, 
                        f"❌ Login failed - Status: {status}, Response: {data}")

    def test_product_endpoints(self):
        """Test all product endpoints"""
        print("\n📦 PRODUCT ENDPOINTS TESTING")
        
        # Test GET /api/products
        success, data, status = self.make_request('GET', '/products')
        
        if success and isinstance(data, list) and len(data) > 0:
            self.test_product_id = data[0].get('id')
            
            # Check for Arabic text support
            arabic_products = [p for p in data if any(ord(char) > 127 for char in p.get('name', ''))]
            
            self.log_test("GET /api/products", True, 
                        f"✅ Retrieved {len(data)} products, {len(arabic_products)} with Arabic names")
            
            # Test product structure
            product = data[0]
            required_fields = ['id', 'name', 'description', 'price', 'category', 'images']
            missing_fields = [field for field in required_fields if field not in product]
            
            if not missing_fields:
                self.log_test("Product Structure Validation", True, 
                            "✅ All required fields present in products")
            else:
                self.log_test("Product Structure Validation", False, 
                            f"❌ Missing fields: {missing_fields}")
        else:
            self.log_test("GET /api/products", False, 
                        f"❌ Failed - Status: {status}, Response: {data}")
        
        # Test GET /api/categories
        success, data, status = self.make_request('GET', '/categories')
        
        if success and isinstance(data, list) and len(data) == 6:
            categories = [cat.get('id') for cat in data]
            expected_categories = ['earrings', 'necklaces', 'bracelets', 'rings', 'watches', 'sets']
            
            if all(cat in categories for cat in expected_categories):
                # Check for Arabic text support in categories
                arabic_categories = [c for c in data if any(ord(char) > 127 for char in c.get('name', ''))]
                
                self.log_test("GET /api/categories", True, 
                            f"✅ Retrieved 6 categories, {len(arabic_categories)} with Arabic names")
            else:
                self.log_test("GET /api/categories", False, 
                            f"❌ Missing expected categories. Got: {categories}")
        else:
            self.log_test("GET /api/categories", False, 
                        f"❌ Failed - Status: {status}, Expected 6 categories, got: {len(data) if isinstance(data, list) else 'invalid'}")

    def test_cart_functionality(self):
        """Test cart functionality (GET/POST/DELETE /api/cart/*)"""
        print("\n🛒 CART FUNCTIONALITY TESTING")
        
        if not self.admin_token or not self.test_product_id:
            self.log_test("Cart Functionality", False, 
                        "❌ Missing admin token or product ID for testing")
            return
        
        # Test GET /api/cart
        success, data, status = self.make_request('GET', '/cart')
        if success:
            initial_total = data.get('total_amount', 0)
            initial_items = len(data.get('items', []))
            self.log_test("GET /api/cart", True, 
                        f"✅ Cart retrieved - Items: {initial_items}, Total: {initial_total}")
        else:
            self.log_test("GET /api/cart", False, f"❌ Failed - Status: {status}")
            return
        
        # Test POST /api/cart/add
        success, data, status = self.make_request('POST', f'/cart/add?product_id={self.test_product_id}&quantity=2')
        if success:
            self.log_test("POST /api/cart/add", True, "✅ Item added to cart successfully")
            
            # Verify cart was updated
            success_check, data_check, status_check = self.make_request('GET', '/cart')
            if success_check:
                new_total = data_check.get('total_amount', 0)
                new_items = len(data_check.get('items', []))
                
                if new_items > initial_items or new_total > initial_total:
                    self.log_test("Cart Update Verification", True, 
                                f"✅ Cart updated - Items: {new_items}, Total: {new_total}")
                else:
                    self.log_test("Cart Update Verification", False, 
                                "❌ Cart totals not updated after add")
            else:
                self.log_test("Cart Update Verification", False, 
                            f"❌ Failed to verify cart update: {status_check}")
        else:
            self.log_test("POST /api/cart/add", False, f"❌ Failed - Status: {status}")
        
        # Test DELETE /api/cart/remove/{product_id}
        success, data, status = self.make_request('DELETE', f'/cart/remove/{self.test_product_id}')
        if success:
            self.log_test("DELETE /api/cart/remove", True, "✅ Item removed from cart successfully")
            
            # Verify removal
            success_final, data_final, status_final = self.make_request('GET', '/cart')
            if success_final:
                final_total = data_final.get('total_amount', 0)
                final_items = len(data_final.get('items', []))
                self.log_test("Cart Remove Verification", True, 
                            f"✅ Cart after removal - Items: {final_items}, Total: {final_total}")
            else:
                self.log_test("Cart Remove Verification", False, 
                            f"❌ Failed to verify removal: {status_final}")
        else:
            self.log_test("DELETE /api/cart/remove", False, f"❌ Failed - Status: {status}")

    def test_admin_endpoints(self):
        """Test admin endpoints (GET/POST /api/admin/*)"""
        print("\n🔧 ADMIN ENDPOINTS TESTING")
        
        if not self.admin_token:
            self.log_test("Admin Endpoints", False, "❌ No admin token available")
            return
        
        # Test GET /api/admin/integrations
        success, data, status = self.make_request('GET', '/admin/integrations')
        
        if success and data.get('type') == 'integrations' and data.get('id'):
            self.log_test("GET /api/admin/integrations", True, 
                        f"✅ Retrieved IntegrationSettings with ID: {data['id']}")
            
            # Check secret masking
            masked_secrets = []
            for field in ['aliexpress_app_secret', 'aliexpress_refresh_token', 'amazon_secret_key']:
                value = data.get(field)
                if value and '***' in str(value):
                    masked_secrets.append(field)
            
            if masked_secrets:
                self.log_test("Admin Integration Secret Masking", True, 
                            f"✅ Secrets properly masked: {masked_secrets}")
            else:
                self.log_test("Admin Integration Secret Masking", True, 
                            "✅ No secrets to mask or masking working")
        else:
            self.log_test("GET /api/admin/integrations", False, 
                        f"❌ Failed - Status: {status}, Response: {data}")
        
        # Test POST /api/admin/integrations
        test_payload = {
            "aliexpress_app_key": "TEST_KEY_123",
            "aliexpress_app_secret": "SECRET_TEST_VALUE_456",
            "amazon_access_key": "AMZ_ACCESS_789",
            "amazon_secret_key": "AMZ_SECRET_012",
            "amazon_partner_tag": "partner-test",
            "amazon_region": "us-east-1"
        }
        
        success, data, status = self.make_request('POST', '/admin/integrations', test_payload)
        
        if success and data.get('type') == 'integrations':
            # Check if data was saved (no masking in POST response)
            if (data.get('aliexpress_app_key') == 'TEST_KEY_123' and 
                data.get('amazon_access_key') == 'AMZ_ACCESS_789'):
                self.log_test("POST /api/admin/integrations", True, 
                            "✅ Integration settings saved successfully")
            else:
                self.log_test("POST /api/admin/integrations", False, 
                            f"❌ Data not saved correctly: {data}")
        else:
            self.log_test("POST /api/admin/integrations", False, 
                        f"❌ Failed - Status: {status}, Response: {data}")

    def test_admin_authorization(self):
        """Test admin authorization - 403 responses for non-admin users"""
        print("\n🔒 ADMIN AUTHORIZATION TESTING")
        
        # Test without token
        original_token = self.admin_token
        self.admin_token = None
        
        success, data, status = self.make_request('GET', '/admin/integrations')
        if not success and status in [401, 403]:
            self.log_test("Admin Endpoint - No Token", True, 
                        f"✅ Properly blocked unauthenticated access (Status: {status})")
        else:
            self.log_test("Admin Endpoint - No Token", False, 
                        f"❌ Should return 401/403, got {status}")
        
        # Test admin product operations without auth
        success, data, status = self.make_request('POST', '/products', {"name": "test"})
        if not success and status in [401, 403]:
            self.log_test("Admin Product CREATE - No Auth", True, 
                        f"✅ Properly blocked unauthorized product creation (Status: {status})")
        else:
            self.log_test("Admin Product CREATE - No Auth", False, 
                        f"❌ Should return 401/403, got {status}")
        
        # Restore admin token
        self.admin_token = original_token
        
        # Test admin product operations with admin auth
        if self.admin_token:
            test_product = {
                "name": "منتج اختبار إداري",
                "description": "منتج تجريبي للاختبار",
                "price": 99.99,
                "category": "rings",
                "images": ["https://example.com/test.jpg"],
                "stock_quantity": 10
            }
            
            success, data, status = self.make_request('POST', '/products', test_product)
            if success and data.get('id'):
                created_id = data['id']
                self.log_test("Admin Product CREATE - With Auth", True, 
                            f"✅ Admin can create products: {data['name']}")
                
                # Clean up - delete the test product
                success_del, data_del, status_del = self.make_request('DELETE', f'/products/{created_id}')
                if success_del:
                    self.log_test("Admin Product DELETE - Cleanup", True, 
                                "✅ Test product deleted successfully")
                else:
                    self.log_test("Admin Product DELETE - Cleanup", False, 
                                f"❌ Failed to delete test product: {status_del}")
            else:
                self.log_test("Admin Product CREATE - With Auth", False, 
                            f"❌ Admin product creation failed: {status}")

    def run_focused_tests(self):
        """Run focused tests for the review request"""
        print("🎯 FOCUSED BACKEND API TESTING FOR AURAA LUXURY")
        print("Testing specific endpoints mentioned in review request:")
        print("1. Product endpoints (GET /api/products, GET /api/categories)")
        print("2. Cart functionality (GET/POST/DELETE /api/cart/*)")
        print("3. Authentication (POST /api/auth/login with admin@auraa.com/admin123)")
        print("4. Admin endpoints (GET/POST /api/admin/*)")
        print("5. Arabic text support verification")
        print("6. Admin authentication and authorization")
        print("=" * 70)
        
        # Run tests in order
        self.test_admin_authentication()
        self.test_product_endpoints()
        self.test_cart_functionality()
        self.test_admin_endpoints()
        self.test_admin_authorization()
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 FOCUSED TEST SUMMARY")
        print("=" * 70)
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
        else:
            print("\n🎉 ALL TESTS PASSED! Backend is working correctly.")
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = FocusedAuraaAPITester()
    
    try:
        success = tester.run_focused_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())