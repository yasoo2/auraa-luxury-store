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
    def __init__(self, base_url="https://auraa-luxury.preview.emergentagent.com"):
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
    
    def test_admin_login(self):
        """Test admin login"""
        admin_credentials = {
            "email": "admin@auraa.com",
            "password": "admin123"
        }
        
        success, data, status = self.make_request('POST', '/auth/login', admin_credentials)
        
        if success and data.get('access_token'):
            self.admin_token = data['access_token']
            is_admin = data.get('user', {}).get('is_admin', False)
            if is_admin:
                self.log_test("Admin Login", True, "Admin logged in successfully")
            else:
                self.log_test("Admin Login", False, "User is not admin")
        else:
            self.log_test("Admin Login", False, f"Status: {status}, Response: {data}")
    
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
        
        # Create order
        order_data = {
            "shipping_address": {
                "firstName": "Test",
                "lastName": "User",
                "email": "test@test.com",
                "phone": "+966501234567",
                "street": "Test Street 123",
                "city": "Riyadh",
                "state": "Riyadh",
                "zipCode": "12345",
                "country": "SA"
            },
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
    
    def test_admin_product_creation(self):
        """Test admin product creation"""
        if not self.admin_token:
            self.log_test("Admin Product Creation", False, "No admin token available")
            return
        
        # Temporarily use admin token
        original_token = self.token
        self.token = self.admin_token
        
        new_product = {
            "name": "منتج تجريبي للاختبار",
            "description": "هذا منتج تجريبي تم إنشاؤه للاختبار",
            "price": 99.99,
            "original_price": 149.99,
            "discount_percentage": 33,
            "category": "rings",
            "images": ["https://images.unsplash.com/photo-1606623546924-a4f3ae5ea3e8"],
            "stock_quantity": 50,
            "external_url": "https://example.com"
        }
        
        success, data, status = self.make_request('POST', '/products', new_product)
        
        if success and data.get('id'):
            self.log_test("Admin Product Creation", True, f"Product created: {data['name']}")
        else:
            self.log_test("Admin Product Creation", False, f"Status: {status}, Response: {data}")
        
        # Restore original token
        self.token = original_token
    
    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        # Try to access cart without authentication
        success, data, status = self.make_request('GET', '/cart')
        
        if not success and status == 401:
            self.log_test("Unauthorized Cart Access", True, "Properly blocked unauthorized access")
        else:
            self.log_test("Unauthorized Cart Access", False, f"Should have returned 401, got {status}")
        
        # Try to create product without admin access
        success, data, status = self.make_request('POST', '/products', {"name": "test"})
        
        if not success and status == 401:
            self.log_test("Unauthorized Product Creation", True, "Properly blocked unauthorized access")
        else:
            self.log_test("Unauthorized Product Creation", False, f"Should have returned 401, got {status}")
        
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
        self.test_get_categories()
        
        # Product tests
        self.test_get_products()
        self.test_get_single_product()
        self.test_product_filtering()
        
        # Authentication tests
        self.test_user_registration()
        self.test_admin_login()
        self.test_user_profile()
        
        # Cart and order tests
        self.test_cart_operations()
        self.test_order_creation()
        self.test_get_orders()
        
        # Admin tests
        self.test_admin_product_creation()
        
        # Security tests
        self.test_unauthorized_access()
        
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