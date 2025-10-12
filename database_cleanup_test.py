#!/usr/bin/env python3
"""
Database Cleanup Test - Fix products database issues
"""

import requests
import sys
import json
from datetime import datetime

class DatabaseCleanupTester:
    def __init__(self, base_url="https://dropship-guru-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        
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

    def login_admin(self):
        """Login as admin"""
        admin_credentials = {
            "email": "admin@auraa.com",
            "password": "admin123"
        }
        
        success, data, status = self.make_request('POST', '/auth/login', admin_credentials)
        
        if success and data.get('access_token'):
            self.admin_token = data['access_token']
            print("✅ Admin login successful")
            return True
        else:
            print(f"❌ Admin login failed: Status {status}")
            return False

    def test_direct_mongodb_access(self):
        """Test if we can access MongoDB directly to clean up"""
        print("\n🔍 CHECKING DATABASE DIRECTLY...")
        
        # Let's try to use the backend's own endpoints to clean up
        # First, let's see if we can get raw data somehow
        
        # Try to get products with different parameters to see if any work
        test_endpoints = [
            '/products?limit=1',
            '/products?skip=0&limit=1',
            '/products?category=necklaces',
        ]
        
        for endpoint in test_endpoints:
            print(f"\nTesting: {endpoint}")
            success, data, status = self.make_request('GET', endpoint)
            print(f"Status: {status}")
            if not success:
                print(f"Error: {data}")
            else:
                print(f"Success: {len(data) if isinstance(data, list) else 'Not a list'}")

    def create_clean_products(self):
        """Create clean products that match the schema"""
        print("\n➕ CREATING CLEAN PRODUCTS...")
        
        if not self.admin_token:
            print("❌ No admin token")
            return False
        
        # Clean sample products that match the exact schema
        clean_products = [
            {
                "name": "قلادة ذهبية فاخرة",
                "description": "قلادة ذهبية أنيقة مع تصميم فريد، مثالية للمناسبات الخاصة",
                "price": 299.99,
                "original_price": 399.99,
                "discount_percentage": 25,
                "category": "necklaces",  # Valid enum value
                "images": ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400"],
                "stock_quantity": 50
            },
            {
                "name": "أقراط لؤلؤية كلاسيكية",
                "description": "أقراط لؤلؤية رائعة بتصميم كلاسيكي خالد",
                "price": 149.99,
                "original_price": 199.99,
                "discount_percentage": 25,
                "category": "earrings",  # Valid enum value
                "images": ["https://images.unsplash.com/photo-1636619608432-77941d282b32?w=400"],
                "stock_quantity": 75
            },
            {
                "name": "خاتم ألماس أزرق فاخر",
                "description": "خاتم مرصع بحجر كريم أزرق مع إطار ذهبي",
                "price": 599.99,
                "original_price": 799.99,
                "discount_percentage": 25,
                "category": "rings",  # Valid enum value
                "images": ["https://images.unsplash.com/photo-1606623546924-a4f3ae5ea3e8?w=400"],
                "stock_quantity": 25
            }
        ]
        
        created_count = 0
        
        for product_data in clean_products:
            success, data, status = self.make_request('POST', '/products', product_data)
            
            if success and data.get('id'):
                created_count += 1
                print(f"✅ Created: {product_data['name']}")
            else:
                print(f"❌ Failed to create: {product_data['name']} - Status: {status}")
                if isinstance(data, dict):
                    print(f"   Error: {data}")
        
        print(f"\n📊 Created {created_count} clean products")
        return created_count > 0

    def test_products_endpoint_after_cleanup(self):
        """Test products endpoint after cleanup"""
        print("\n🔍 TESTING PRODUCTS ENDPOINT AFTER CLEANUP...")
        
        success, data, status = self.make_request('GET', '/products')
        
        if success and isinstance(data, list):
            print(f"✅ SUCCESS: GET /api/products now returns {len(data)} products")
            
            # Show first few products
            for i, product in enumerate(data[:3]):
                print(f"   {i+1}. {product.get('name', 'No name')} - {product.get('price', 'No price')} - {product.get('category', 'No category')}")
            
            return True
        else:
            print(f"❌ STILL FAILING: Status {status}")
            if isinstance(data, dict) and 'raw_response' in data:
                print(f"   Raw response: {data['raw_response'][:200]}...")
            else:
                print(f"   Response: {data}")
            return False

    def run_cleanup(self):
        """Run database cleanup process"""
        print("🧹 DATABASE CLEANUP PROCESS")
        print("=" * 50)
        
        # Step 1: Login
        if not self.login_admin():
            return False
        
        # Step 2: Check current state
        self.test_direct_mongodb_access()
        
        # Step 3: Create clean products
        if self.create_clean_products():
            # Step 4: Test if products endpoint works now
            return self.test_products_endpoint_after_cleanup()
        
        return False

def main():
    """Main cleanup execution"""
    cleaner = DatabaseCleanupTester()
    
    try:
        success = cleaner.run_cleanup()
        if success:
            print("\n🎉 CLEANUP SUCCESSFUL!")
            print("The products page should now show products instead of 'لم نجد أي منتجات'")
        else:
            print("\n❌ CLEANUP FAILED")
            print("The issue persists - further investigation needed")
        return 0 if success else 1
    except Exception as e:
        print(f"\n💥 Cleanup failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())