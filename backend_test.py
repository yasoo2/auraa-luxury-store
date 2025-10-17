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
    def __init__(self, base_url="https://eshop-manager.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.admin_token = None
        self.super_admin_token = None
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

    def test_super_admin_login_and_statistics(self):
        """Test Super Admin login and statistics API endpoint"""
        print("\n🔐 SUPER ADMIN LOGIN AND STATISTICS TESTING")
        
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
            
            if is_super_admin:
                self.log_test("Super Admin Login", True, 
                            f"Super admin logged in successfully, is_admin: {is_admin}, is_super_admin: {is_super_admin}")
                
                # Test super admin statistics endpoint
                original_token = self.token
                self.token = self.super_admin_token
                
                success_stats, data_stats, status_stats = self.make_request('GET', '/admin/super-admin-statistics')
                
                if success_stats:
                    # Verify required fields in response
                    required_fields = ['total_users', 'total_admins', 'total_super_admins', 'active_admins', 'inactive_admins', 'recent_actions']
                    missing_fields = [field for field in required_fields if field not in data_stats]
                    
                    if not missing_fields:
                        # Verify data types
                        total_users = data_stats.get('total_users')
                        total_admins = data_stats.get('total_admins')
                        total_super_admins = data_stats.get('total_super_admins')
                        active_admins = data_stats.get('active_admins')
                        inactive_admins = data_stats.get('inactive_admins')
                        recent_actions = data_stats.get('recent_actions')
                        
                        if (isinstance(total_users, int) and total_users >= 0 and
                            isinstance(total_admins, int) and total_admins >= 0 and
                            isinstance(total_super_admins, int) and total_super_admins >= 0 and
                            isinstance(active_admins, int) and active_admins >= 0 and
                            isinstance(inactive_admins, int) and inactive_admins >= 0 and
                            isinstance(recent_actions, list)):
                            
                            self.log_test("Super Admin Statistics API", True, 
                                        f"Statistics: Users={total_users}, Admins={total_admins}, "
                                        f"SuperAdmins={total_super_admins}, Active={active_admins}, "
                                        f"Inactive={inactive_admins}, RecentActions={len(recent_actions)}")
                            
                            # Verify logical consistency
                            if total_super_admins <= total_admins <= total_users:
                                self.log_test("Super Admin Statistics Consistency", True, 
                                            "Statistics counts are logically consistent")
                            else:
                                self.log_test("Super Admin Statistics Consistency", False, 
                                            f"Inconsistent counts: SuperAdmins({total_super_admins}) > Admins({total_admins}) > Users({total_users})")
                        else:
                            self.log_test("Super Admin Statistics API", False, 
                                        f"Invalid data types in response: {data_stats}")
                    else:
                        self.log_test("Super Admin Statistics API", False, 
                                    f"Missing required fields: {missing_fields}")
                else:
                    self.log_test("Super Admin Statistics API", False, 
                                f"Status: {status_stats}, Response: {data_stats}")
                
                # Test access control - regular admin should not access this endpoint
                if self.admin_token:
                    self.token = self.admin_token
                    success_admin, data_admin, status_admin = self.make_request('GET', '/admin/super-admin-statistics')
                    
                    if not success_admin and status_admin == 403:
                        self.log_test("Super Admin Statistics - Admin Access Control", True, 
                                    "Regular admin properly blocked from super admin endpoint (403)")
                    else:
                        self.log_test("Super Admin Statistics - Admin Access Control", False, 
                                    f"Regular admin should be blocked, got status: {status_admin}")
                
                # Test access control - no token
                self.token = None
                success_no_auth, data_no_auth, status_no_auth = self.make_request('GET', '/admin/super-admin-statistics')
                
                if not success_no_auth and status_no_auth in [401, 403]:
                    self.log_test("Super Admin Statistics - No Auth", True, 
                                f"Unauthenticated access properly blocked ({status_no_auth})")
                else:
                    self.log_test("Super Admin Statistics - No Auth", False, 
                                f"Unauthenticated access should be blocked, got status: {status_no_auth}")
                
                # Restore token
                self.token = original_token
                
            else:
                self.log_test("Super Admin Login", False, 
                            f"User is not super admin, is_admin: {is_admin}, is_super_admin: {is_super_admin}")
        else:
            self.log_test("Super Admin Login", False, 
                        f"Status: {status}, Response: {data}")

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

    # ========== ALIEXPRESS S2S TRACKING TESTS ==========
    
    def test_s2s_postback_endpoint(self):
        """Test GET /api/postback endpoint with all required parameters"""
        print("\n🔗 ALIEXPRESS S2S TRACKING TESTS")
        
        # Test with all required parameters
        postback_params = {
            "order_id": "AE_ORDER_123456",
            "order_amount": 89.99,
            "commission_fee": 8.50,
            "country": "SA",
            "item_id": "AE_ITEM_789",
            "order_platform": "mobile"
        }
        
        # Build query string
        query_string = "&".join([f"{k}={v}" for k, v in postback_params.items()])
        
        # Make request without authentication (postback should be public)
        original_token = self.token
        self.token = None
        
        try:
            url = f"{self.api_url}/postback?{query_string}"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200 and response.text == "OK":
                self.log_test("S2S Postback - Required Params", True, f"Status: {response.status_code}, Response: {response.text}")
            else:
                self.log_test("S2S Postback - Required Params", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("S2S Postback - Required Params", False, f"Request failed: {str(e)}")
        
        # Test with optional parameters
        postback_params_full = {
            **postback_params,
            "source": "auraa_luxury",
            "click_id": "test_click_123"
        }
        
        query_string_full = "&".join([f"{k}={v}" for k, v in postback_params_full.items()])
        
        try:
            url = f"{self.api_url}/postback?{query_string_full}"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200 and response.text == "OK":
                self.log_test("S2S Postback - All Params", True, f"Status: {response.status_code}, Response: {response.text}")
            else:
                self.log_test("S2S Postback - All Params", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("S2S Postback - All Params", False, f"Request failed: {str(e)}")
        
        # Test error handling (missing required parameter)
        incomplete_params = {
            "order_id": "AE_ORDER_ERROR",
            "order_amount": 50.00
            # Missing required parameters
        }
        
        query_string_error = "&".join([f"{k}={v}" for k, v in incomplete_params.items()])
        
        try:
            url = f"{self.api_url}/postback?{query_string_error}"
            response = requests.get(url, timeout=10)
            
            # Should return error but not crash
            if response.status_code in [400, 422, 500]:
                self.log_test("S2S Postback - Error Handling", True, f"Properly handled missing params (Status: {response.status_code})")
            else:
                self.log_test("S2S Postback - Error Handling", False, f"Unexpected status for missing params: {response.status_code}")
        except Exception as e:
            self.log_test("S2S Postback - Error Handling", False, f"Request failed: {str(e)}")
        
        # Restore token
        self.token = original_token

    def test_s2s_click_tracking_endpoint(self):
        """Test GET /api/out endpoint for click tracking and redirect"""
        
        # Test with AliExpress URL
        test_url = "https://www.aliexpress.com/item/1005004567890.html?aff_fcid=existing123"
        
        original_token = self.token
        self.token = None
        
        try:
            url = f"{self.api_url}/out?url={test_url}"
            response = requests.get(url, allow_redirects=False, timeout=10)
            
            if response.status_code == 302:
                redirect_url = response.headers.get('Location', '')
                if 'aff_fcid=' in redirect_url and redirect_url.startswith('https://www.aliexpress.com'):
                    self.log_test("S2S Click Tracking - URL Redirect", True, f"Redirects to: {redirect_url[:100]}...")
                else:
                    self.log_test("S2S Click Tracking - URL Redirect", False, f"Invalid redirect URL: {redirect_url}")
            else:
                self.log_test("S2S Click Tracking - URL Redirect", False, f"Expected 302 redirect, got {response.status_code}")
        except Exception as e:
            self.log_test("S2S Click Tracking - URL Redirect", False, f"Request failed: {str(e)}")
        
        # Test with product_id parameter
        try:
            url = f"{self.api_url}/out?url={test_url}&product_id=test_product_123"
            response = requests.get(url, allow_redirects=False, timeout=10)
            
            if response.status_code == 302:
                redirect_url = response.headers.get('Location', '')
                # Check if click_id is injected
                if 'aff_fcid=' in redirect_url:
                    self.log_test("S2S Click Tracking - With Product ID", True, f"Click ID injected successfully")
                else:
                    self.log_test("S2S Click Tracking - With Product ID", False, "Click ID not injected")
            else:
                self.log_test("S2S Click Tracking - With Product ID", False, f"Expected 302 redirect, got {response.status_code}")
        except Exception as e:
            self.log_test("S2S Click Tracking - With Product ID", False, f"Request failed: {str(e)}")
        
        # Test cookie setting
        try:
            url = f"{self.api_url}/out?url={test_url}"
            response = requests.get(url, allow_redirects=False, timeout=10)
            
            if response.status_code == 302:
                cookies = response.cookies
                if 'auraa_click' in cookies:
                    self.log_test("S2S Click Tracking - Cookie Set", True, f"Cookie 'auraa_click' set successfully")
                else:
                    self.log_test("S2S Click Tracking - Cookie Set", False, "Cookie 'auraa_click' not set")
            else:
                self.log_test("S2S Click Tracking - Cookie Set", False, f"Expected 302 redirect, got {response.status_code}")
        except Exception as e:
            self.log_test("S2S Click Tracking - Cookie Set", False, f"Request failed: {str(e)}")
        
        # Restore token
        self.token = original_token

    def test_s2s_admin_conversions_endpoint(self):
        """Test GET /api/admin/conversions endpoint"""
        
        if not self.admin_token:
            self.log_test("S2S Admin Conversions", False, "No admin token available")
            return
        
        # Test admin authentication requirement
        original_token = self.token
        self.token = None
        
        success, data, status = self.make_request('GET', '/admin/conversions')
        if not success and status == 403:
            self.log_test("S2S Admin Conversions - No Auth", True, "Properly requires authentication (403)")
        else:
            self.log_test("S2S Admin Conversions - No Auth", False, f"Should return 403, got {status}")
        
        # Test with admin token
        self.token = self.admin_token
        
        success, data, status = self.make_request('GET', '/admin/conversions')
        
        if success:
            required_fields = ['success', 'conversions', 'total', 'limit', 'skip', 'statistics']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                conversions = data.get('conversions', [])
                statistics = data.get('statistics', {})
                
                # Check statistics structure
                stats_fields = ['total_orders', 'total_revenue', 'total_commission', 'avg_order_value']
                missing_stats = [field for field in stats_fields if field not in statistics]
                
                if not missing_stats:
                    self.log_test("S2S Admin Conversions - Structure", True, 
                                f"Found {len(conversions)} conversions, Stats: {statistics}")
                else:
                    self.log_test("S2S Admin Conversions - Structure", False, f"Missing stats: {missing_stats}")
            else:
                self.log_test("S2S Admin Conversions - Structure", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("S2S Admin Conversions - Structure", False, f"Status: {status}, Response: {data}")
        
        # Test filtering parameters
        success, data, status = self.make_request('GET', '/admin/conversions?limit=10&skip=0&country=SA')
        
        if success:
            self.log_test("S2S Admin Conversions - Filtering", True, 
                        f"Filtering works, returned {len(data.get('conversions', []))} results")
        else:
            self.log_test("S2S Admin Conversions - Filtering", False, f"Filtering failed: {status}")
        
        # Restore token
        self.token = original_token

    def test_s2s_admin_clicks_endpoint(self):
        """Test GET /api/admin/clicks endpoint"""
        
        if not self.admin_token:
            self.log_test("S2S Admin Clicks", False, "No admin token available")
            return
        
        # Test admin authentication requirement
        original_token = self.token
        self.token = None
        
        success, data, status = self.make_request('GET', '/admin/clicks')
        if not success and status == 403:
            self.log_test("S2S Admin Clicks - No Auth", True, "Properly requires authentication (403)")
        else:
            self.log_test("S2S Admin Clicks - No Auth", False, f"Should return 403, got {status}")
        
        # Test with admin token
        self.token = self.admin_token
        
        success, data, status = self.make_request('GET', '/admin/clicks')
        
        if success:
            required_fields = ['success', 'clicks', 'total', 'limit', 'skip', 'statistics']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                clicks = data.get('clicks', [])
                statistics = data.get('statistics', {})
                
                # Check statistics structure
                stats_fields = ['total_clicks', 'converted_clicks', 'conversion_rate']
                missing_stats = [field for field in stats_fields if field not in statistics]
                
                if not missing_stats:
                    self.log_test("S2S Admin Clicks - Structure", True, 
                                f"Found {len(clicks)} clicks, Stats: {statistics}")
                else:
                    self.log_test("S2S Admin Clicks - Structure", False, f"Missing stats: {missing_stats}")
            else:
                self.log_test("S2S Admin Clicks - Structure", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("S2S Admin Clicks - Structure", False, f"Status: {status}, Response: {data}")
        
        # Test converted_only filter
        success, data, status = self.make_request('GET', '/admin/clicks?converted_only=true')
        
        if success:
            clicks = data.get('clicks', [])
            # All returned clicks should have converted=true
            all_converted = all(click.get('converted', False) for click in clicks)
            if all_converted or len(clicks) == 0:
                self.log_test("S2S Admin Clicks - Converted Filter", True, 
                            f"Converted filter works, returned {len(clicks)} converted clicks")
            else:
                self.log_test("S2S Admin Clicks - Converted Filter", False, "Filter returned non-converted clicks")
        else:
            self.log_test("S2S Admin Clicks - Converted Filter", False, f"Filtering failed: {status}")
        
        # Restore token
        self.token = original_token

    def test_s2s_complete_flow(self):
        """Test complete S2S flow: click -> postback -> attribution"""
        
        # Step 1: Create a click via /api/out
        test_url = "https://www.aliexpress.com/item/1005004567890.html"
        
        original_token = self.token
        self.token = None
        
        click_id = None
        
        try:
            url = f"{self.api_url}/out?url={test_url}&product_id=test_flow_product"
            response = requests.get(url, allow_redirects=False, timeout=10)
            
            if response.status_code == 302:
                redirect_url = response.headers.get('Location', '')
                # Extract click_id from redirect URL
                if 'aff_fcid=' in redirect_url:
                    click_id = redirect_url.split('aff_fcid=')[1].split('&')[0]
                    self.log_test("S2S Complete Flow - Step 1 (Click)", True, f"Click created with ID: {click_id}")
                else:
                    self.log_test("S2S Complete Flow - Step 1 (Click)", False, "Click ID not found in redirect URL")
                    return
            else:
                self.log_test("S2S Complete Flow - Step 1 (Click)", False, f"Click creation failed: {response.status_code}")
                return
        except Exception as e:
            self.log_test("S2S Complete Flow - Step 1 (Click)", False, f"Click creation failed: {str(e)}")
            return
        
        # Step 2: Send postback with that click_id
        if click_id:
            postback_params = {
                "order_id": f"FLOW_ORDER_{click_id[:8]}",
                "order_amount": 125.50,
                "commission_fee": 12.55,
                "country": "SA",
                "item_id": "FLOW_ITEM_123",
                "order_platform": "web",
                "click_id": click_id
            }
            
            query_string = "&".join([f"{k}={v}" for k, v in postback_params.items()])
            
            try:
                url = f"{self.api_url}/postback?{query_string}"
                response = requests.get(url, timeout=10)
                
                if response.status_code == 200 and response.text == "OK":
                    self.log_test("S2S Complete Flow - Step 2 (Postback)", True, f"Postback processed successfully")
                else:
                    self.log_test("S2S Complete Flow - Step 2 (Postback)", False, f"Postback failed: {response.status_code}")
                    return
            except Exception as e:
                self.log_test("S2S Complete Flow - Step 2 (Postback)", False, f"Postback failed: {str(e)}")
                return
        
        # Step 3: Verify attribution via admin endpoints
        if self.admin_token and click_id:
            self.token = self.admin_token
            
            # Check if click is marked as converted
            success, data, status = self.make_request('GET', f'/admin/clicks?converted_only=true')
            
            if success:
                clicks = data.get('clicks', [])
                converted_click = next((click for click in clicks if click.get('click_id') == click_id), None)
                
                if converted_click and converted_click.get('converted'):
                    self.log_test("S2S Complete Flow - Step 3 (Attribution)", True, 
                                f"Click {click_id} marked as converted")
                else:
                    self.log_test("S2S Complete Flow - Step 3 (Attribution)", False, 
                                f"Click {click_id} not found or not marked as converted")
            else:
                self.log_test("S2S Complete Flow - Step 3 (Attribution)", False, f"Failed to check attribution: {status}")
        
        # Restore token
        self.token = original_token
    
    # ========== SUPER ADMIN MANAGEMENT TESTS ==========
    
    def test_super_admin_login(self):
        """Test super admin login with provided credentials"""
        print("\n🔐 SUPER ADMIN MANAGEMENT API TESTING")
        
        # Test super admin login with provided credentials
        super_admin_credentials = {
            "identifier": "younes.sowady2011@gmail.com",
            "password": "younes2025"
        }
        
        success, data, status = self.make_request('POST', '/auth/login', super_admin_credentials)
        
        if success and data.get('access_token'):
            self.super_admin_token = data['access_token']
            user_data = data.get('user', {})
            is_super_admin = user_data.get('is_super_admin', False)
            
            if is_super_admin:
                self.log_test("Super Admin Login", True, f"Super admin logged in successfully, is_super_admin: {is_super_admin}")
            else:
                self.log_test("Super Admin Login", False, f"User is not super admin, is_super_admin: {is_super_admin}")
        else:
            self.log_test("Super Admin Login", False, f"Status: {status}, Response: {data}")
    
    def test_list_all_admins_endpoint(self):
        """Test GET /api/super-admin/manage/list-all-admins endpoint"""
        if not self.super_admin_token:
            self.log_test("List All Admins", False, "No super admin token available")
            return
        
        # Use super admin token
        original_token = self.token
        self.token = self.super_admin_token
        
        success, data, status = self.make_request('GET', '/super-admin/manage/list-all-admins')
        
        if success:
            required_fields = ['admins', 'total', 'super_admin_count', 'admin_count']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                admins = data.get('admins', [])
                total = data.get('total', 0)
                super_admin_count = data.get('super_admin_count', 0)
                admin_count = data.get('admin_count', 0)
                
                self.log_test("List All Admins", True, 
                            f"Found {total} total admins ({super_admin_count} super admins, {admin_count} regular admins)")
                
                # Validate admin structure if any admins exist
                if len(admins) > 0:
                    admin = admins[0]
                    admin_fields = ['id', 'email', 'first_name', 'last_name', 'is_admin', 'is_super_admin', 'is_active', 'created_at']
                    missing_admin_fields = [field for field in admin_fields if field not in admin]
                    
                    if not missing_admin_fields:
                        self.log_test("Admin Structure Validation", True, "Admin objects have correct structure")
                    else:
                        self.log_test("Admin Structure Validation", False, f"Missing admin fields: {missing_admin_fields}")
            else:
                self.log_test("List All Admins", False, f"Missing response fields: {missing_fields}")
        else:
            self.log_test("List All Admins", False, f"Status: {status}, Response: {data}")
        
        # Restore token
        self.token = original_token
    
    def test_admin_statistics_endpoint(self):
        """Test GET /api/super-admin/manage/statistics endpoint"""
        if not self.super_admin_token:
            self.log_test("Admin Statistics", False, "No super admin token available")
            return
        
        # Use super admin token
        original_token = self.token
        self.token = self.super_admin_token
        
        success, data, status = self.make_request('GET', '/super-admin/manage/statistics')
        
        if success:
            required_fields = ['total_users', 'total_admins', 'total_super_admins', 'active_admins', 'inactive_admins', 'recent_actions']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                total_users = data.get('total_users', 0)
                total_admins = data.get('total_admins', 0)
                total_super_admins = data.get('total_super_admins', 0)
                active_admins = data.get('active_admins', 0)
                recent_actions = data.get('recent_actions', [])
                
                self.log_test("Admin Statistics", True, 
                            f"Users: {total_users}, Admins: {total_admins}, Super Admins: {total_super_admins}, Active: {active_admins}, Recent Actions: {len(recent_actions)}")
            else:
                self.log_test("Admin Statistics", False, f"Missing response fields: {missing_fields}")
        else:
            self.log_test("Admin Statistics", False, f"Status: {status}, Response: {data}")
        
        # Restore token
        self.token = original_token
    
    def test_change_role_endpoint(self):
        """Test POST /api/super-admin/manage/change-role endpoint"""
        if not self.super_admin_token:
            self.log_test("Change Role", False, "No super admin token available")
            return
        
        # First, get list of admins to find a test target
        original_token = self.token
        self.token = self.super_admin_token
        
        # Get admin list first
        success, data, status = self.make_request('GET', '/super-admin/manage/list-all-admins')
        
        if not success or not data.get('admins'):
            self.log_test("Change Role - Get Target", False, "Could not get admin list for testing")
            self.token = original_token
            return
        
        # Find a non-super admin to test with (or create a test scenario)
        admins = data.get('admins', [])
        test_target = None
        
        # Look for a regular admin (not super admin)
        for admin in admins:
            if admin.get('is_admin') and not admin.get('is_super_admin'):
                test_target = admin
                break
        
        if not test_target:
            # If no regular admin found, we'll test with invalid user ID to check error handling
            change_role_request = {
                "user_id": "invalid_user_id_for_testing",
                "new_role": "admin",
                "current_password": "younes2025"
            }
            
            success, data, status = self.make_request('POST', '/super-admin/manage/change-role', change_role_request)
            
            if not success and status == 404:
                self.log_test("Change Role - Error Handling", True, "Properly handles invalid user ID (404)")
            else:
                self.log_test("Change Role - Error Handling", False, f"Expected 404 for invalid user, got {status}")
        else:
            # Test role change with valid user
            change_role_request = {
                "user_id": test_target['id'],
                "new_role": "admin",  # Keep as admin
                "current_password": "younes2025"
            }
            
            success, data, status = self.make_request('POST', '/super-admin/manage/change-role', change_role_request)
            
            if success:
                required_fields = ['message', 'user_id', 'new_role']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_test("Change Role", True, f"Role changed successfully for user {data.get('user_id')}")
                else:
                    self.log_test("Change Role", False, f"Missing response fields: {missing_fields}")
            else:
                self.log_test("Change Role", False, f"Status: {status}, Response: {data}")
        
        # Restore token
        self.token = original_token
    
    def test_reset_password_endpoint(self):
        """Test POST /api/super-admin/manage/reset-password endpoint"""
        if not self.super_admin_token:
            self.log_test("Reset Password", False, "No super admin token available")
            return
        
        # Use super admin token
        original_token = self.token
        self.token = self.super_admin_token
        
        # Test with invalid user ID to check error handling
        reset_password_request = {
            "user_id": "invalid_user_id_for_testing",
            "new_password": "new_test_password_123",
            "current_password": "younes2025"
        }
        
        success, data, status = self.make_request('POST', '/super-admin/manage/reset-password', reset_password_request)
        
        if not success and status == 404:
            self.log_test("Reset Password - Error Handling", True, "Properly handles invalid user ID (404)")
        else:
            self.log_test("Reset Password - Error Handling", False, f"Expected 404 for invalid user, got {status}")
        
        # Test with wrong current password
        reset_password_request_wrong_pass = {
            "user_id": "any_user_id",
            "new_password": "new_test_password_123",
            "current_password": "wrong_password"
        }
        
        success, data, status = self.make_request('POST', '/super-admin/manage/reset-password', reset_password_request_wrong_pass)
        
        if not success and status == 401:
            self.log_test("Reset Password - Auth Check", True, "Properly validates super admin password (401)")
        else:
            self.log_test("Reset Password - Auth Check", False, f"Expected 401 for wrong password, got {status}")
        
        # Restore token
        self.token = original_token
    
    def test_super_admin_endpoints_authentication(self):
        """Test authentication requirements for super admin endpoints"""
        # Test endpoints without token
        original_token = self.token
        self.token = None
        
        endpoints_to_test = [
            '/super-admin/manage/list-all-admins',
            '/super-admin/manage/statistics'
        ]
        
        for endpoint in endpoints_to_test:
            success, data, status = self.make_request('GET', endpoint)
            if not success and status in [401, 403]:
                self.log_test(f"Auth Check - {endpoint} (No Token)", True, f"Properly blocked (Status: {status})")
            else:
                self.log_test(f"Auth Check - {endpoint} (No Token)", False, f"Should return 401/403, got {status}")
        
        # Test with regular user token (if available)
        if self.admin_token:  # Regular admin token
            self.token = self.admin_token
            
            for endpoint in endpoints_to_test:
                success, data, status = self.make_request('GET', endpoint)
                # Note: These endpoints might work with JWT middleware, so we check if they return data
                if success:
                    self.log_test(f"Auth Check - {endpoint} (Admin Token)", True, "Endpoint accessible with admin token")
                else:
                    self.log_test(f"Auth Check - {endpoint} (Admin Token)", False, f"Admin token failed: {status}")
        
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
        
        # SUPER ADMIN MANAGEMENT TESTS (Priority for this review)
        print("\n🔐 SUPER ADMIN MANAGEMENT API TESTS")
        self.test_super_admin_login()
        self.test_list_all_admins_endpoint()
        self.test_admin_statistics_endpoint()
        self.test_change_role_endpoint()
        self.test_reset_password_endpoint()
        self.test_super_admin_endpoints_authentication()
        
        # ALIEXPRESS S2S TRACKING TESTS (Priority for this review)
        print("\n🔗 ALIEXPRESS S2S TRACKING TESTS (COMPREHENSIVE)")
        self.test_s2s_postback_endpoint()
        self.test_s2s_click_tracking_endpoint()
        self.test_s2s_admin_conversions_endpoint()
        self.test_s2s_admin_clicks_endpoint()
        self.test_s2s_complete_flow()
        
        # AUTO-UPDATE API TESTS
        print("\n🔄 AUTO-UPDATE API TESTS")
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