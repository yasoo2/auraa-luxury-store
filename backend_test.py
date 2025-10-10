#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Auraa Luxury Store
Tests all endpoints including authentication, products, cart, and orders
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class AuraaLuxuryAPITester:
    def __init__(self, base_url="https://auraa-boutique.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.admin_token = None
        self.test_product_id = None
        
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
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=10)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0
    
    def test_root_endpoint(self):
        """Test API root endpoint"""
        success, data, status = self.make_request('GET', '/')
        expected_message = "Welcome to Auraa Luxury API"
        
        if success and data.get('message') == expected_message:
            self.log_test("API Root Endpoint", True, f"Status: {status}")
        else:
            self.log_test("API Root Endpoint", False, f"Status: {status}, Response: {data}")
    
    def test_initialize_sample_data(self):
        """Initialize sample data"""
        success, data, status = self.make_request('POST', '/init-data')
        
        if success:
            self.log_test("Initialize Sample Data", True, f"Status: {status}")
        else:
            self.log_test("Initialize Sample Data", False, f"Status: {status}, Response: {data}")
    
    def test_get_categories(self):
        """Test categories endpoint"""
        success, data, status = self.make_request('GET', '/categories')
        
        if success and isinstance(data, list) and len(data) > 0:
            categories = [cat.get('id') for cat in data]
            expected_categories = ['earrings', 'necklaces', 'bracelets', 'rings', 'watches', 'sets']
            
            if all(cat in categories for cat in expected_categories):
                self.log_test("Get Categories", True, f"Found {len(data)} categories")
            else:
                self.log_test("Get Categories", False, f"Missing expected categories. Got: {categories}")
        else:
            self.log_test("Get Categories", False, f"Status: {status}, Response: {data}")
    
    def test_get_products(self):
        """Test products endpoint"""
        success, data, status = self.make_request('GET', '/products')
        
        if success and isinstance(data, list):
            if len(data) > 0:
                # Store first product ID for later tests
                self.test_product_id = data[0].get('id')
                self.log_test("Get Products", True, f"Found {len(data)} products")
                
                # Test product structure
                product = data[0]
                required_fields = ['id', 'name', 'description', 'price', 'category', 'images']
                missing_fields = [field for field in required_fields if field not in product]
                
                if not missing_fields:
                    self.log_test("Product Structure Validation", True, "All required fields present")
                else:
                    self.log_test("Product Structure Validation", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Get Products", False, "No products found")
        else:
            self.log_test("Get Products", False, f"Status: {status}, Response: {data}")
    
    def test_get_single_product(self):
        """Test single product endpoint"""
        if not self.test_product_id:
            self.log_test("Get Single Product", False, "No product ID available for testing")
            return
        
        success, data, status = self.make_request('GET', f'/products/{self.test_product_id}')
        
        if success and data.get('id') == self.test_product_id:
            self.log_test("Get Single Product", True, f"Retrieved product: {data.get('name')}")
        else:
            self.log_test("Get Single Product", False, f"Status: {status}, Response: {data}")
    
    def test_product_filtering(self):
        """Test product filtering"""
        # Test category filter
        success, data, status = self.make_request('GET', '/products?category=necklaces')
        
        if success and isinstance(data, list):
            if all(product.get('category') == 'necklaces' for product in data):
                self.log_test("Product Category Filter", True, f"Found {len(data)} necklaces")
            else:
                self.log_test("Product Category Filter", False, "Category filter not working properly")
        else:
            self.log_test("Product Category Filter", False, f"Status: {status}")
        
        # Test search filter
        success, data, status = self.make_request('GET', '/products?search=ذهبية')
        
        if success and isinstance(data, list):
            self.log_test("Product Search Filter", True, f"Search returned {len(data)} results")
        else:
            self.log_test("Product Search Filter", False, f"Status: {status}")
    
    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "testpass123",
            "first_name": "Test",
            "last_name": "User",
            "phone": "+966501234567"
        }
        
        success, data, status = self.make_request('POST', '/auth/register', test_user_data)
        
        if success and data.get('access_token'):
            self.token = data['access_token']
            self.user_id = data.get('user', {}).get('id')
            self.log_test("User Registration", True, f"User registered with ID: {self.user_id}")
        else:
            self.log_test("User Registration", False, f"Status: {status}, Response: {data}")
    
    def test_admin_authentication_flow(self):
        """Test complete admin authentication flow as requested"""
        print("\n🔐 ADMIN AUTHENTICATION FLOW TESTING")
        
        # Test admin login with specific credentials
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
                self.log_test("Admin Login with admin@auraa.com", True, f"Admin logged in successfully, is_admin: {is_admin}")
                
                # Test token validation for admin routes
                original_token = self.token
                self.token = self.admin_token
                
                success_validate, data_validate, status_validate = self.make_request('GET', '/auth/me')
                if success_validate and data_validate.get('is_admin'):
                    self.log_test("Admin Token Validation", True, f"Token validated, user: {data_validate.get('email')}")
                else:
                    self.log_test("Admin Token Validation", False, f"Token validation failed: {status_validate}")
                
                # Restore original token
                self.token = original_token
            else:
                self.log_test("Admin Login with admin@auraa.com", False, f"User is not admin, is_admin: {is_admin}")
        else:
            self.log_test("Admin Login with admin@auraa.com", False, f"Status: {status}, Response: {data}")
    
    def test_admin_login(self):
        """Test admin login (legacy method for compatibility)"""
        # This now calls the comprehensive admin authentication flow
        self.test_admin_authentication_flow()
    
    def test_user_profile(self):
        """Test user profile endpoint"""
        if not self.token:
            self.log_test("Get User Profile", False, "No authentication token available")
            return
        
        success, data, status = self.make_request('GET', '/auth/me')
        
        if success and data.get('id') == self.user_id:
            self.log_test("Get User Profile", True, f"Profile retrieved for: {data.get('email')}")
        else:
            self.log_test("Get User Profile", False, f"Status: {status}, Response: {data}")
    
    def test_cart_operations(self):
        """Test cart operations"""
        if not self.token or not self.test_product_id:
            self.log_test("Cart Operations", False, "Missing token or product ID")
            return
        
        # Get empty cart
        success, data, status = self.make_request('GET', '/cart')
        if success:
            self.log_test("Get Empty Cart", True, f"Cart total: {data.get('total_amount', 0)}")
        else:
            self.log_test("Get Empty Cart", False, f"Status: {status}")
        
        # Add item to cart
        success, data, status = self.make_request('POST', f'/cart/add?product_id={self.test_product_id}&quantity=2')
        if success:
            self.log_test("Add to Cart", True, "Item added successfully")
        else:
            self.log_test("Add to Cart", False, f"Status: {status}, Response: {data}")
        
        # Get cart with items
        success, data, status = self.make_request('GET', '/cart')
        if success and len(data.get('items', [])) > 0:
            self.log_test("Get Cart with Items", True, f"Cart has {len(data['items'])} items")
        else:
            self.log_test("Get Cart with Items", False, f"Status: {status}")
        
        # Remove item from cart
        success, data, status = self.make_request('DELETE', f'/cart/remove/{self.test_product_id}')
        if success:
            self.log_test("Remove from Cart", True, "Item removed successfully")
        else:
            self.log_test("Remove from Cart", False, f"Status: {status}")
    
    def test_order_creation(self):
        """Test order creation"""
        if not self.token or not self.test_product_id:
            self.log_test("Order Creation", False, "Missing token or product ID")
            return
        
        # First add item to cart
        self.make_request('POST', f'/cart/add?product_id={self.test_product_id}&quantity=1')
        
        # Create order - need to send as query parameters based on FastAPI signature
        shipping_address = {
            "firstName": "Test",
            "lastName": "User",
            "email": "test@test.com",
            "phone": "+966501234567",
            "street": "Test Street 123",
            "city": "Riyadh",
            "state": "Riyadh",
            "zipCode": "12345",
            "country": "SA"
        }
        
        # The endpoint expects both as body parameters according to the function signature
        order_data = {
            "shipping_address": shipping_address,
            "payment_method": "cod"
        }
        
        success, data, status = self.make_request('POST', '/orders', order_data)
        
        if success and data.get('id'):
            self.log_test("Order Creation", True, f"Order created with ID: {data['id']}")
        else:
            self.log_test("Order Creation", False, f"Status: {status}, Response: {data}")
    
    def test_get_orders(self):
        """Test get orders endpoint"""
        if not self.token:
            self.log_test("Get Orders", False, "No authentication token")
            return
        
        success, data, status = self.make_request('GET', '/orders')
        
        if success and isinstance(data, list):
            self.log_test("Get Orders", True, f"Found {len(data)} orders")
        else:
            self.log_test("Get Orders", False, f"Status: {status}")
    
    def test_admin_product_crud(self):
        """Test complete admin product CRUD operations"""
        if not self.admin_token:
            self.log_test("Admin Product CRUD", False, "No admin token available")
            return
        
        # Temporarily use admin token
        original_token = self.token
        self.token = self.admin_token
        
        # CREATE - Test admin product creation
        new_product = {
            "name": "منتج تجريبي للاختبار الإداري",
            "description": "هذا منتج تجريبي تم إنشاؤه لاختبار العمليات الإدارية",
            "price": 199.99,
            "original_price": 299.99,
            "discount_percentage": 33,
            "category": "rings",
            "images": ["https://images.unsplash.com/photo-1606623546924-a4f3ae5ea3e8"],
            "stock_quantity": 25,
            "external_url": "https://example.com/admin-test"
        }
        
        success, data, status = self.make_request('POST', '/products', new_product)
        
        if success and data.get('id'):
            created_product_id = data['id']
            self.log_test("Admin Product CREATE", True, f"Product created: {data['name']}")
            
            # UPDATE - Test admin product update
            update_data = {
                "name": "منتج محدث للاختبار الإداري",
                "description": "تم تحديث هذا المنتج بواسطة المدير",
                "price": 249.99,
                "original_price": 349.99,
                "discount_percentage": 28,
                "category": "rings",
                "images": ["https://images.unsplash.com/photo-1606623546924-a4f3ae5ea3e8"],
                "stock_quantity": 15,
                "external_url": "https://example.com/admin-test-updated"
            }
            
            success_update, data_update, status_update = self.make_request('PUT', f'/products/{created_product_id}', update_data)
            
            if success_update and data_update.get('name') == update_data['name']:
                self.log_test("Admin Product UPDATE", True, f"Product updated: {data_update['name']}")
            else:
                self.log_test("Admin Product UPDATE", False, f"Status: {status_update}, Response: {data_update}")
            
            # DELETE - Test admin product deletion
            success_delete, data_delete, status_delete = self.make_request('DELETE', f'/products/{created_product_id}')
            
            if success_delete:
                self.log_test("Admin Product DELETE", True, "Product deleted successfully")
                
                # Verify deletion by trying to get the product
                success_verify, data_verify, status_verify = self.make_request('GET', f'/products/{created_product_id}')
                if not success_verify and status_verify == 404:
                    self.log_test("Admin Product DELETE Verification", True, "Product properly deleted (404 on GET)")
                else:
                    self.log_test("Admin Product DELETE Verification", False, f"Product still exists after deletion: {status_verify}")
            else:
                self.log_test("Admin Product DELETE", False, f"Status: {status_delete}, Response: {data_delete}")
        else:
            self.log_test("Admin Product CREATE", False, f"Status: {status}, Response: {data}")
        
        # Restore original token
        self.token = original_token
    
    def test_admin_dashboard_security(self):
        """Test admin dashboard security - all /api/admin/* endpoints require admin authentication"""
        
        # Test 1: No authentication token
        original_token = self.token
        self.token = None
        
        success, data, status = self.make_request('GET', '/admin/integrations')
        if not success and status in [401, 403]:
            self.log_test("Admin Endpoint - No Token", True, f"Properly blocked unauthenticated access (Status: {status})")
        else:
            self.log_test("Admin Endpoint - No Token", False, f"Should return 401/403, got {status}")
        
        # Test 2: Non-admin user token
        if original_token:  # Regular user token
            self.token = original_token
            success, data, status = self.make_request('GET', '/admin/integrations')
            if not success and status == 403:
                self.log_test("Admin Endpoint - Non-Admin User", True, "Properly blocked non-admin access (403)")
            else:
                self.log_test("Admin Endpoint - Non-Admin User", False, f"Should return 403, got {status}")
        
        # Test 3: Admin user token should work
        if self.admin_token:
            self.token = self.admin_token
            success, data, status = self.make_request('GET', '/admin/integrations')
            if success:
                self.log_test("Admin Endpoint - Admin User", True, "Admin user can access admin endpoints")
            else:
                self.log_test("Admin Endpoint - Admin User", False, f"Admin access failed: {status}")
        
        # Test 4: Product CRUD security (admin-protected endpoints)
        self.token = None
        
        # Test unauthorized product creation
        success, data, status = self.make_request('POST', '/products', {"name": "test"})
        if not success and status in [401, 403]:
            self.log_test("Product CREATE - No Auth", True, f"Properly blocked unauthorized product creation (Status: {status})")
        else:
            self.log_test("Product CREATE - No Auth", False, f"Should return 401/403, got {status}")
        
        # Test unauthorized product update
        success, data, status = self.make_request('PUT', '/products/test-id', {"name": "test"})
        if not success and status in [401, 403]:
            self.log_test("Product UPDATE - No Auth", True, f"Properly blocked unauthorized product update (Status: {status})")
        else:
            self.log_test("Product UPDATE - No Auth", False, f"Should return 401/403, got {status}")
        
        # Test unauthorized product deletion
        success, data, status = self.make_request('DELETE', '/products/test-id')
        if not success and status in [401, 403]:
            self.log_test("Product DELETE - No Auth", True, f"Properly blocked unauthorized product deletion (Status: {status})")
        else:
            self.log_test("Product DELETE - No Auth", False, f"Should return 401/403, got {status}")
        
        # Test with non-admin user
        if original_token:
            self.token = original_token
            success, data, status = self.make_request('POST', '/products', {"name": "test"})
            if not success and status == 403:
                self.log_test("Product CREATE - Non-Admin", True, "Properly blocked non-admin product creation (403)")
            else:
                self.log_test("Product CREATE - Non-Admin", False, f"Should return 403, got {status}")
        
        # Restore token
        self.token = original_token

    def test_admin_integrations_get(self):
        """Test GET /api/admin/integrations with admin token"""
        if not self.admin_token:
            self.log_test("Admin Integrations GET", False, "No admin token available")
            return
        
        # Use admin token
        original_token = self.token
        self.token = self.admin_token
        
        success, data, status = self.make_request('GET', '/admin/integrations')
        
        if success and data.get('type') == 'integrations' and data.get('id'):
            # Check if ID is UUID string
            import uuid
            try:
                uuid.UUID(data['id'])
                self.log_test("Admin Integrations GET", True, f"Retrieved IntegrationSettings with ID: {data['id']}")
            except ValueError:
                self.log_test("Admin Integrations GET", False, f"ID is not a valid UUID: {data['id']}")
        else:
            self.log_test("Admin Integrations GET", False, f"Status: {status}, Response: {data}")
        
        # Restore token
        self.token = original_token

    def test_admin_integrations_post(self):
        """Test POST /api/admin/integrations with specific payload"""
        if not self.admin_token:
            self.log_test("Admin Integrations POST", False, "No admin token available")
            return
        
        # Use admin token
        original_token = self.token
        self.token = self.admin_token
        
        payload = {
            "aliexpress_app_key": "AK_TEST",
            "aliexpress_app_secret": "SECRET_TEST_VALUE",
            "aliexpress_refresh_token": "REFRESH_TOKEN_TEST",
            "amazon_access_key": "AMZ_ACCESS",
            "amazon_secret_key": "AMZ_SECRET",
            "amazon_partner_tag": "partner-20",
            "amazon_region": "us-east-1"
        }
        
        success, data, status = self.make_request('POST', '/admin/integrations', payload)
        
        if success and data.get('type') == 'integrations':
            # Check if all fields are saved (no masking in POST response expected)
            if (data.get('aliexpress_app_key') == 'AK_TEST' and 
                data.get('aliexpress_app_secret') == 'SECRET_TEST_VALUE' and
                data.get('amazon_access_key') == 'AMZ_ACCESS'):
                self.log_test("Admin Integrations POST", True, "Settings saved successfully")
                
                # Now test GET to verify masking
                get_success, get_data, get_status = self.make_request('GET', '/admin/integrations')
                if get_success:
                    # Check if secrets are masked in GET response
                    if ('***' in str(get_data.get('aliexpress_app_secret', '')) and
                        '***' in str(get_data.get('amazon_secret_key', ''))):
                        self.log_test("Admin Integrations GET Masking", True, "Secrets properly masked in GET response")
                    else:
                        self.log_test("Admin Integrations GET Masking", False, f"Secrets not properly masked: {get_data}")
                else:
                    self.log_test("Admin Integrations GET Masking", False, f"GET failed after POST: {get_status}")
            else:
                self.log_test("Admin Integrations POST", False, f"Data not saved correctly: {data}")
        else:
            self.log_test("Admin Integrations POST", False, f"Status: {status}, Response: {data}")
        
        # Restore token
        self.token = original_token

    def test_integrations_permissions(self):
        """Test permissions for integrations endpoints"""
        # Test without token
        original_token = self.token
        self.token = None
        
        success, data, status = self.make_request('GET', '/admin/integrations')
        if not success and status in [401, 403]:
            self.log_test("Integrations No Token", True, "Properly blocked access without token")
        else:
            self.log_test("Integrations No Token", False, f"Should return 401/403, got {status}")
        
        # Test with non-admin token (regular user)
        if original_token:  # Use regular user token
            self.token = original_token
            success, data, status = self.make_request('GET', '/admin/integrations')
            if not success and status == 403:
                self.log_test("Integrations Non-Admin Token", True, "Properly blocked non-admin access")
            else:
                self.log_test("Integrations Non-Admin Token", False, f"Should return 403, got {status}")
        
        # Restore token
        self.token = original_token

    def test_regression_categories(self):
        """Regression test: GET /api/categories returns 6 categories"""
        success, data, status = self.make_request('GET', '/categories')
        
        if success and isinstance(data, list) and len(data) == 6:
            self.log_test("Regression Categories", True, f"Returns exactly 6 categories")
        else:
            self.log_test("Regression Categories", False, f"Expected 6 categories, got {len(data) if isinstance(data, list) else 'invalid response'}")

    def test_regression_products(self):
        """Regression test: GET /api/products returns > 0 products"""
        success, data, status = self.make_request('GET', '/products')
        
        if success and isinstance(data, list) and len(data) > 0:
            self.log_test("Regression Products", True, f"Returns {len(data)} products")
            
            # Test limit parameter
            success_limit, data_limit, status_limit = self.make_request('GET', '/products?limit=6')
            if success_limit and isinstance(data_limit, list) and len(data_limit) <= 6:
                self.log_test("Regression Products Limit", True, f"Limit works, returned {len(data_limit)} products")
            else:
                self.log_test("Regression Products Limit", False, f"Limit not working properly")
        else:
            self.log_test("Regression Products", False, f"Expected > 0 products, got {len(data) if isinstance(data, list) else 'invalid response'}")

    def test_regression_cart_flow(self):
        """Regression test: Cart flow with admin token"""
        if not self.admin_token:
            self.log_test("Regression Cart Flow", False, "Missing admin token")
            return
        
        # Get a product ID if we don't have one
        if not self.test_product_id:
            success, data, status = self.make_request('GET', '/products?limit=1')
            if success and len(data) > 0:
                self.test_product_id = data[0]['id']
            else:
                self.log_test("Regression Cart Flow", False, "No products available for testing")
                return
        
        # Use admin token
        original_token = self.token
        self.token = self.admin_token
        
        # GET /api/cart (creates if missing)
        success, data, status = self.make_request('GET', '/cart')
        if success:
            initial_total = data.get('total_amount', 0)
            self.log_test("Regression Cart GET", True, f"Cart retrieved, total: {initial_total}")
            
            # POST /api/cart/add
            success_add, data_add, status_add = self.make_request('POST', f'/cart/add?product_id={self.test_product_id}&quantity=2')
            if success_add:
                self.log_test("Regression Cart ADD", True, "Item added to cart")
                
                # Check cart total updated
                success_check, data_check, status_check = self.make_request('GET', '/cart')
                if success_check and data_check.get('total_amount', 0) > initial_total:
                    self.log_test("Regression Cart Total Update", True, f"Total updated to: {data_check.get('total_amount')}")
                    
                    # DELETE /api/cart/remove
                    success_remove, data_remove, status_remove = self.make_request('DELETE', f'/cart/remove/{self.test_product_id}')
                    if success_remove:
                        self.log_test("Regression Cart REMOVE", True, "Item removed from cart")
                        
                        # Check total updated after removal
                        success_final, data_final, status_final = self.make_request('GET', '/cart')
                        if success_final and data_final.get('total_amount', 0) < data_check.get('total_amount', 0):
                            self.log_test("Regression Cart Total After Remove", True, f"Total updated to: {data_final.get('total_amount')}")
                        else:
                            self.log_test("Regression Cart Total After Remove", False, "Total not updated after removal")
                    else:
                        self.log_test("Regression Cart REMOVE", False, f"Remove failed: {status_remove}")
                else:
                    self.log_test("Regression Cart Total Update", False, "Total not updated after add")
            else:
                self.log_test("Regression Cart ADD", False, f"Add failed: {status_add}")
        else:
            self.log_test("Regression Cart GET", False, f"Cart GET failed: {status}")
        
        # Restore token
        self.token = original_token

    def test_integration_updated_at(self):
        """Edge check: Verify IntegrationSettings updated_at changes on POST update"""
        if not self.admin_token:
            self.log_test("Integration Updated At", False, "No admin token available")
            return
        
        # Use admin token
        original_token = self.token
        self.token = self.admin_token
        
        # Get initial updated_at
        success, data, status = self.make_request('GET', '/admin/integrations')
        if success:
            initial_updated_at = data.get('updated_at')
            
            # Wait a moment and update
            import time
            time.sleep(1)
            
            update_payload = {
                "aliexpress_app_key": "UPDATED_KEY"
            }
            
            success_update, data_update, status_update = self.make_request('POST', '/admin/integrations', update_payload)
            if success_update:
                # Get updated data
                success_check, data_check, status_check = self.make_request('GET', '/admin/integrations')
                if success_check:
                    new_updated_at = data_check.get('updated_at')
                    if new_updated_at != initial_updated_at:
                        self.log_test("Integration Updated At", True, "updated_at field changes on POST update")
                    else:
                        self.log_test("Integration Updated At", False, "updated_at field not updated")
                else:
                    self.log_test("Integration Updated At", False, "Failed to get updated data")
            else:
                self.log_test("Integration Updated At", False, f"Update failed: {status_update}")
        else:
            self.log_test("Integration Updated At", False, f"Initial GET failed: {status}")
        
        # Restore token
        self.token = original_token

    # ========== AUTO-UPDATE API TESTS ==========
    
    def test_auto_update_status(self):
        """Test GET /api/auto-update/status endpoint"""
        if not self.admin_token:
            self.log_test("Auto-Update Status", False, "No admin token available")
            return
        
        # Use admin token
        original_token = self.token
        self.token = self.admin_token
        
        success, data, status = self.make_request('GET', '/auto-update/status')
        
        if success:
            # Check required fields in response
            required_fields = ['currency_service', 'scheduler', 'auto_updates_enabled']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                currency_service = data.get('currency_service', {})
                scheduler = data.get('scheduler', {})
                
                # Validate currency service status
                if ('supported_currencies' in currency_service and 
                    'cache_duration_hours' in currency_service):
                    
                    # Validate scheduler status
                    if 'status' in scheduler:
                        self.log_test("Auto-Update Status", True, 
                                    f"Status: {scheduler.get('status')}, "
                                    f"Currencies: {len(currency_service.get('supported_currencies', []))}, "
                                    f"Auto-updates: {data.get('auto_updates_enabled')}")
                    else:
                        self.log_test("Auto-Update Status", False, "Missing scheduler status")
                else:
                    self.log_test("Auto-Update Status", False, "Invalid currency service data")
            else:
                self.log_test("Auto-Update Status", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("Auto-Update Status", False, f"Status: {status}, Response: {data}")
        
        # Restore token
        self.token = original_token

    def test_currency_rates_endpoint(self):
        """Test GET /api/auto-update/currency-rates endpoint"""
        success, data, status = self.make_request('GET', '/auto-update/currency-rates')
        
        if success:
            # Check required fields
            required_fields = ['base_currency', 'rates', 'last_updated']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                base_currency = data.get('base_currency')
                rates = data.get('rates', {})
                
                if base_currency == 'USD' and isinstance(rates, dict):
                    self.log_test("Currency Rates Endpoint", True, 
                                f"Base: {base_currency}, Rates: {len(rates)} currencies")
                else:
                    self.log_test("Currency Rates Endpoint", False, 
                                f"Invalid data structure: base={base_currency}, rates_type={type(rates)}")
            else:
                self.log_test("Currency Rates Endpoint", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("Currency Rates Endpoint", False, f"Status: {status}, Response: {data}")

    def test_trigger_currency_update(self):
        """Test POST /api/auto-update/trigger-currency-update endpoint"""
        if not self.admin_token:
            self.log_test("Trigger Currency Update", False, "No admin token available")
            return
        
        # Use admin token
        original_token = self.token
        self.token = self.admin_token
        
        success, data, status = self.make_request('POST', '/auto-update/trigger-currency-update')
        
        if success:
            message = data.get('message', '')
            if 'currency rates updated' in message.lower():
                self.log_test("Trigger Currency Update", True, f"Message: {message}")
            else:
                self.log_test("Trigger Currency Update", False, f"Unexpected message: {message}")
        else:
            self.log_test("Trigger Currency Update", False, f"Status: {status}, Response: {data}")
        
        # Restore token
        self.token = original_token

    def test_convert_currency_endpoint(self):
        """Test POST /api/auto-update/convert-currency endpoint"""
        test_conversion = {
            "amount": 100.0,
            "from_currency": "USD",
            "to_currency": "SAR"
        }
        
        success, data, status = self.make_request('POST', '/auto-update/convert-currency', test_conversion)
        
        if success:
            # Check required fields in response
            required_fields = ['original_amount', 'from_currency', 'to_currency', 'converted_amount', 'formatted_result']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                original = data.get('original_amount')
                converted = data.get('converted_amount')
                formatted = data.get('formatted_result')
                
                if (original == 100.0 and 
                    isinstance(converted, (int, float)) and converted > 0 and
                    isinstance(formatted, str)):
                    self.log_test("Convert Currency Endpoint", True, 
                                f"Converted {original} USD to {converted} SAR ({formatted})")
                else:
                    self.log_test("Convert Currency Endpoint", False, 
                                f"Invalid conversion data: {original} -> {converted}")
            else:
                self.log_test("Convert Currency Endpoint", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("Convert Currency Endpoint", False, f"Status: {status}, Response: {data}")

    def test_sync_products_endpoint(self):
        """Test POST /api/auto-update/sync-products endpoint"""
        if not self.admin_token:
            self.log_test("Sync Products Endpoint", False, "No admin token available")
            return
        
        # Use admin token
        original_token = self.token
        self.token = self.admin_token
        
        # Test AliExpress sync
        aliexpress_params = {
            "source": "aliexpress",
            "search_query": "luxury accessories",
            "limit": 5
        }
        
        success, data, status = self.make_request('POST', '/auto-update/sync-products', aliexpress_params)
        
        if success:
            required_fields = ['message', 'products_found', 'products_added', 'source']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                products_found = data.get('products_found', 0)
                products_added = data.get('products_added', 0)
                source = data.get('source')
                
                if source == 'aliexpress' and products_found >= 0 and products_added >= 0:
                    self.log_test("Sync Products - AliExpress", True, 
                                f"Found: {products_found}, Added: {products_added}")
                else:
                    self.log_test("Sync Products - AliExpress", False, 
                                f"Invalid data: source={source}, found={products_found}, added={products_added}")
            else:
                self.log_test("Sync Products - AliExpress", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("Sync Products - AliExpress", False, f"Status: {status}, Response: {data}")
        
        # Test Amazon sync
        success, data, status = self.make_request('POST', '/auto-update/sync-products?source=amazon&search_query=designer jewelry&limit=3')
        
        if success:
            source = data.get('source')
            products_found = data.get('products_found', 0)
            products_added = data.get('products_added', 0)
            
            if source == 'amazon' and products_found >= 0 and products_added >= 0:
                self.log_test("Sync Products - Amazon", True, 
                            f"Found: {products_found}, Added: {products_added}")
            else:
                self.log_test("Sync Products - Amazon", False, 
                            f"Invalid data: source={source}, found={products_found}, added={products_added}")
        else:
            self.log_test("Sync Products - Amazon", False, f"Status: {status}, Response: {data}")
        
        # Restore token
        self.token = original_token

    def test_bulk_import_tasks_endpoint(self):
        """Test GET /api/auto-update/bulk-import-tasks endpoint"""
        if not self.admin_token:
            self.log_test("Bulk Import Tasks", False, "No admin token available")
            return
        
        # Use admin token
        original_token = self.token
        self.token = self.admin_token
        
        success, data, status = self.make_request('GET', '/auto-update/bulk-import-tasks')
        
        if success:
            if isinstance(data, list):
                self.log_test("Bulk Import Tasks", True, f"Retrieved {len(data)} bulk import tasks")
                
                # If there are tasks, validate structure
                if len(data) > 0:
                    task = data[0]
                    expected_fields = ['_id', 'type', 'status', 'created_at']
                    missing_fields = [field for field in expected_fields if field not in task]
                    
                    if not missing_fields:
                        self.log_test("Bulk Import Task Structure", True, "Task structure is valid")
                    else:
                        self.log_test("Bulk Import Task Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Bulk Import Tasks", False, f"Expected list, got {type(data)}")
        else:
            self.log_test("Bulk Import Tasks", False, f"Status: {status}, Response: {data}")
        
        # Restore token
        self.token = original_token

    def test_scheduled_task_logs_endpoint(self):
        """Test GET /api/auto-update/scheduled-task-logs endpoint"""
        if not self.admin_token:
            self.log_test("Scheduled Task Logs", False, "No admin token available")
            return
        
        # Use admin token
        original_token = self.token
        self.token = self.admin_token
        
        success, data, status = self.make_request('GET', '/auto-update/scheduled-task-logs')
        
        if success:
            if isinstance(data, list):
                self.log_test("Scheduled Task Logs", True, f"Retrieved {len(data)} task logs")
                
                # If there are logs, validate structure
                if len(data) > 0:
                    log_entry = data[0]
                    expected_fields = ['task_type', 'status', 'message', 'timestamp']
                    missing_fields = [field for field in expected_fields if field not in log_entry]
                    
                    if not missing_fields:
                        self.log_test("Task Log Structure", True, "Log structure is valid")
                    else:
                        self.log_test("Task Log Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Scheduled Task Logs", False, f"Expected list, got {type(data)}")
        else:
            self.log_test("Scheduled Task Logs", False, f"Status: {status}, Response: {data}")
        
        # Test with task_type filter
        success, data, status = self.make_request('GET', '/auto-update/scheduled-task-logs?task_type=currency_update')
        
        if success:
            if isinstance(data, list):
                self.log_test("Scheduled Task Logs - Filtered", True, f"Retrieved {len(data)} currency update logs")
            else:
                self.log_test("Scheduled Task Logs - Filtered", False, f"Expected list, got {type(data)}")
        else:
            self.log_test("Scheduled Task Logs - Filtered", False, f"Status: {status}")
        
        # Restore token
        self.token = original_token

    def test_update_all_prices_endpoint(self):
        """Test POST /api/auto-update/update-all-prices endpoint"""
        if not self.admin_token:
            self.log_test("Update All Prices", False, "No admin token available")
            return
        
        # Use admin token
        original_token = self.token
        self.token = self.admin_token
        
        success, data, status = self.make_request('POST', '/auto-update/update-all-prices')
        
        if success:
            required_fields = ['message', 'updated_count']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                updated_count = data.get('updated_count', 0)
                message = data.get('message', '')
                
                if isinstance(updated_count, int) and updated_count >= 0:
                    self.log_test("Update All Prices", True, 
                                f"Updated {updated_count} products. Message: {message}")
                else:
                    self.log_test("Update All Prices", False, 
                                f"Invalid updated_count: {updated_count}")
            else:
                self.log_test("Update All Prices", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("Update All Prices", False, f"Status: {status}, Response: {data}")
        
        # Restore token
        self.token = original_token

    def test_auto_update_authentication(self):
        """Test authentication requirements for auto-update endpoints"""
        # Test endpoints that require admin authentication
        admin_endpoints = [
            '/auto-update/status',
            '/auto-update/trigger-currency-update',
            '/auto-update/sync-products',
            '/auto-update/bulk-import-tasks',
            '/auto-update/scheduled-task-logs',
            '/auto-update/update-all-prices'
        ]
        
        # Test without token
        original_token = self.token
        self.token = None
        
        for endpoint in admin_endpoints:
            method = 'POST' if endpoint in ['/auto-update/trigger-currency-update', 
                                          '/auto-update/sync-products', 
                                          '/auto-update/update-all-prices'] else 'GET'
            
            success, data, status = self.make_request(method, endpoint)
            if not success and status in [401, 403]:
                self.log_test(f"Auth Check - {endpoint} (No Token)", True, f"Properly blocked (Status: {status})")
            else:
                self.log_test(f"Auth Check - {endpoint} (No Token)", False, f"Should return 401/403, got {status}")
        
        # Test with non-admin token (if available)
        if original_token:  # Regular user token
            self.token = original_token
            
            for endpoint in admin_endpoints:
                method = 'POST' if endpoint in ['/auto-update/trigger-currency-update', 
                                              '/auto-update/sync-products', 
                                              '/auto-update/update-all-prices'] else 'GET'
                
                success, data, status = self.make_request(method, endpoint)
                if not success and status == 403:
                    self.log_test(f"Auth Check - {endpoint} (Non-Admin)", True, "Properly blocked non-admin access")
                else:
                    self.log_test(f"Auth Check - {endpoint} (Non-Admin)", False, f"Should return 403, got {status}")
        
        # Test public endpoints (should work without authentication)
        public_endpoints = [
            '/auto-update/currency-rates',
            '/auto-update/convert-currency'
        ]
        
        self.token = None
        
        for endpoint in public_endpoints:
            if endpoint == '/auto-update/convert-currency':
                test_data = {"amount": 100, "from_currency": "USD", "to_currency": "SAR"}
                success, data, status = self.make_request('POST', endpoint, test_data)
            else:
                success, data, status = self.make_request('GET', endpoint)
            
            if success:
                self.log_test(f"Public Access - {endpoint}", True, "Public endpoint accessible without auth")
            else:
                self.log_test(f"Public Access - {endpoint}", False, f"Public endpoint failed: {status}")
        
        # Restore token
        self.token = original_token
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Auraa Luxury API Tests...")
        print(f"🔗 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Basic API tests
        self.test_root_endpoint()
        self.test_initialize_sample_data()
        
        # Authentication tests (need to be early for tokens)
        self.test_user_registration()
        self.test_admin_login()
        self.test_user_profile()
        
        # AUTO-UPDATE API TESTS (Priority for this review)
        print("\n🔄 AUTO-UPDATE API TESTS (NEW FEATURES)")
        self.test_auto_update_status()
        self.test_currency_rates_endpoint()
        self.test_trigger_currency_update()
        self.test_convert_currency_endpoint()
        self.test_sync_products_endpoint()
        self.test_bulk_import_tasks_endpoint()
        self.test_scheduled_task_logs_endpoint()
        self.test_update_all_prices_endpoint()
        self.test_auto_update_authentication()
        
        # INTEGRATION TESTS (Existing)
        print("\n🔧 INTEGRATION TESTS")
        self.test_admin_integrations_get()
        self.test_admin_integrations_post()
        self.test_integrations_permissions()
        self.test_integration_updated_at()
        
        # REGRESSION TESTS
        print("\n🔄 REGRESSION TESTS")
        self.test_regression_categories()
        self.test_regression_products()
        self.test_regression_cart_flow()
        
        # Product tests
        self.test_get_products()
        self.test_get_single_product()
        self.test_product_filtering()
        
        # Cart and order tests
        self.test_cart_operations()
        self.test_order_creation()
        self.test_get_orders()
        
        # ADMIN DASHBOARD TESTS
        print("\n🔐 ADMIN DASHBOARD TESTS")
        self.test_admin_product_crud()
        self.test_admin_dashboard_security()
        
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
                    print(f"   → {test['details']}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = AuraaLuxuryAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())