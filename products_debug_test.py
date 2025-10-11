#!/usr/bin/env python3
"""
Products Debug Test - Focused testing for products page issue
Testing GET /api/products, GET /api/categories, and POST /api/products endpoints
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class ProductsDebugTester:
    def __init__(self, base_url="https://auraa-luxury-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
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

    def test_admin_login(self):
        """Test admin login to get admin token"""
        print("🔐 ADMIN LOGIN TEST")
        
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
                self.log_test("Admin Login", True, f"Admin logged in successfully, token length: {len(self.admin_token)}")
                return True
            else:
                self.log_test("Admin Login", False, f"User is not admin, is_admin: {is_admin}")
                return False
        else:
            self.log_test("Admin Login", False, f"Status: {status}, Response: {data}")
            return False

    def test_get_products(self):
        """Test GET /api/products endpoint"""
        print("\n📦 PRODUCTS ENDPOINT TEST")
        
        success, data, status = self.make_request('GET', '/products')
        
        if success and isinstance(data, list):
            product_count = len(data)
            if product_count > 0:
                self.log_test("GET /api/products", True, f"Found {product_count} products")
                
                # Show first few products for debugging
                print("   First few products:")
                for i, product in enumerate(data[:3]):
                    print(f"   {i+1}. {product.get('name', 'No name')} - {product.get('price', 'No price')} - Category: {product.get('category', 'No category')}")
                
                return True, data
            else:
                self.log_test("GET /api/products", False, "No products found - this is the issue!")
                return False, []
        else:
            self.log_test("GET /api/products", False, f"Status: {status}, Response: {data}")
            return False, []

    def test_get_categories(self):
        """Test GET /api/categories endpoint"""
        print("\n📂 CATEGORIES ENDPOINT TEST")
        
        success, data, status = self.make_request('GET', '/categories')
        
        if success and isinstance(data, list):
            category_count = len(data)
            if category_count > 0:
                self.log_test("GET /api/categories", True, f"Found {category_count} categories")
                
                # Show categories for debugging
                print("   Categories:")
                for i, category in enumerate(data):
                    print(f"   {i+1}. {category.get('id', 'No id')} - {category.get('name', 'No name')} ({category.get('name_en', 'No English name')})")
                
                return True, data
            else:
                self.log_test("GET /api/categories", False, "No categories found")
                return False, []
        else:
            self.log_test("GET /api/categories", False, f"Status: {status}, Response: {data}")
            return False, []

    def test_create_sample_products(self):
        """Test POST /api/products to create sample products"""
        print("\n➕ CREATE SAMPLE PRODUCTS TEST")
        
        if not self.admin_token:
            self.log_test("Create Sample Products", False, "No admin token available")
            return False
        
        # Sample products with Arabic names
        sample_products = [
            {
                "name": "قلادة ذهبية فاخرة",
                "description": "قلادة ذهبية أنيقة مع تصميم فريد، مثالية للمناسبات الخاصة",
                "price": 299.99,
                "original_price": 399.99,
                "discount_percentage": 25,
                "category": "necklaces",
                "images": ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400"],
                "stock_quantity": 50
            },
            {
                "name": "أقراط لؤلؤية كلاسيكية",
                "description": "أقراط لؤلؤية رائعة بتصميم كلاسيكي خالد",
                "price": 149.99,
                "original_price": 199.99,
                "discount_percentage": 25,
                "category": "earrings",
                "images": ["https://images.unsplash.com/photo-1636619608432-77941d282b32?w=400"],
                "stock_quantity": 75
            },
            {
                "name": "خاتم ألماس أزرق فاخر",
                "description": "خاتم مرصع بحجر كريم أزرق مع إطار ذهبي",
                "price": 599.99,
                "original_price": 799.99,
                "discount_percentage": 25,
                "category": "rings",
                "images": ["https://images.unsplash.com/photo-1606623546924-a4f3ae5ea3e8?w=400"],
                "stock_quantity": 25
            },
            {
                "name": "سوار ذهبي متعدد الطبقات",
                "description": "مجموعة أساور ذهبية أنيقة مع تصميمات متنوعة",
                "price": 249.99,
                "original_price": 329.99,
                "discount_percentage": 24,
                "category": "bracelets",
                "images": ["https://images.unsplash.com/photo-1586878340506-af074f2ee999?w=400"],
                "stock_quantity": 40
            },
            {
                "name": "ساعة ذهبية فاخرة",
                "description": "ساعة يد ذهبية مع تصميم كلاسيكي وحركة سويسرية",
                "price": 899.99,
                "original_price": 1199.99,
                "discount_percentage": 25,
                "category": "watches",
                "images": ["https://images.unsplash.com/photo-1758297679778-d308606a3f51?w=400"],
                "stock_quantity": 15
            }
        ]
        
        created_count = 0
        failed_count = 0
        
        for i, product_data in enumerate(sample_products):
            success, data, status = self.make_request('POST', '/products', product_data)
            
            if success and data.get('id'):
                created_count += 1
                print(f"   ✅ Created: {product_data['name']}")
            else:
                failed_count += 1
                print(f"   ❌ Failed to create: {product_data['name']} - Status: {status}")
                if isinstance(data, dict) and 'detail' in data:
                    print(f"      Error: {data['detail']}")
        
        if created_count > 0:
            self.log_test("Create Sample Products", True, f"Created {created_count} products, {failed_count} failed")
            return True
        else:
            self.log_test("Create Sample Products", False, f"Failed to create any products. All {failed_count} attempts failed")
            return False

    def test_database_verification(self):
        """Verify products exist in database after creation"""
        print("\n🔍 DATABASE VERIFICATION TEST")
        
        success, data, status = self.make_request('GET', '/products')
        
        if success and isinstance(data, list):
            product_count = len(data)
            if product_count > 0:
                self.log_test("Database Verification", True, f"Database now contains {product_count} products")
                
                # Show products with Arabic names
                arabic_products = [p for p in data if any(ord(char) > 127 for char in p.get('name', ''))]
                print(f"   Products with Arabic names: {len(arabic_products)}")
                
                for product in arabic_products[:3]:
                    print(f"   - {product.get('name')} ({product.get('category')}) - {product.get('price')} SAR")
                
                return True
            else:
                self.log_test("Database Verification", False, "Still no products found in database")
                return False
        else:
            self.log_test("Database Verification", False, f"Failed to verify database: Status {status}")
            return False

    def test_initialize_data_endpoint(self):
        """Test the /init-data endpoint to see if it helps"""
        print("\n🚀 INITIALIZE DATA ENDPOINT TEST")
        
        success, data, status = self.make_request('POST', '/init-data')
        
        if success:
            message = data.get('message', '')
            self.log_test("Initialize Data Endpoint", True, f"Response: {message}")
            return True
        else:
            self.log_test("Initialize Data Endpoint", False, f"Status: {status}, Response: {data}")
            return False

    def run_debug_tests(self):
        """Run focused debug tests for products issue"""
        print("🔍 PRODUCTS DEBUG TESTING")
        print(f"🔗 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Step 1: Login as admin
        if not self.test_admin_login():
            print("❌ Cannot proceed without admin access")
            return False
        
        # Step 2: Test categories endpoint
        categories_success, categories = self.test_get_categories()
        
        # Step 3: Test products endpoint (initial check)
        products_success, products = self.test_get_products()
        
        # Step 4: If no products, try initialize data endpoint
        if not products_success or len(products) == 0:
            print("\n⚠️  No products found. Trying to initialize data...")
            self.test_initialize_data_endpoint()
            
            # Check again after initialization
            products_success, products = self.test_get_products()
        
        # Step 5: If still no products, create sample products
        if not products_success or len(products) == 0:
            print("\n⚠️  Still no products. Creating sample products...")
            if self.test_create_sample_products():
                # Verify products were created
                self.test_database_verification()
        
        # Final summary
        print("\n" + "=" * 60)
        print("📊 DEBUG TEST SUMMARY")
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
        
        # Final products check
        print("\n🔍 FINAL PRODUCTS CHECK:")
        final_success, final_products = self.test_get_products()
        
        if final_success and len(final_products) > 0:
            print(f"✅ SUCCESS: Found {len(final_products)} products in database")
            print("   The products page should now show products instead of 'لم نجد أي منتجات'")
            return True
        else:
            print("❌ ISSUE PERSISTS: No products found")
            print("   The products page will continue showing 'لم نجد أي منتجات'")
            return False

def main():
    """Main test execution"""
    tester = ProductsDebugTester()
    
    try:
        success = tester.run_debug_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())