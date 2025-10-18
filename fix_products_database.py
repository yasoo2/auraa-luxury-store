#!/usr/bin/env python3
"""
Fix Products Database - Remove corrupted products and add clean ones
"""

import requests
import sys
import json
from datetime import datetime

class ProductsDatabaseFixer:
    def __init__(self, base_url="https://auraa-admin-1.preview.emergentagent.com"):
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

    def get_products_with_filters(self):
        """Get products using different filters to identify good vs bad products"""
        print("\n🔍 ANALYZING PRODUCTS WITH FILTERS...")
        
        # Try to get products by category to see which ones work
        categories = ['earrings', 'necklaces', 'bracelets', 'rings', 'watches', 'sets']
        good_products = []
        
        for category in categories:
            success, data, status = self.make_request('GET', f'/products?category={category}')
            if success and isinstance(data, list):
                print(f"   {category}: {len(data)} products")
                good_products.extend(data)
            else:
                print(f"   {category}: Failed (Status: {status})")
        
        print(f"\n📊 Found {len(good_products)} good products across all categories")
        return good_products

    def delete_product_by_id(self, product_id):
        """Delete a product by ID"""
        success, data, status = self.make_request('DELETE', f'/products/{product_id}')
        return success, status

    def create_comprehensive_product_set(self):
        """Create a comprehensive set of products"""
        print("\n➕ CREATING COMPREHENSIVE PRODUCT SET...")
        
        if not self.admin_token:
            print("❌ No admin token")
            return False
        
        # Comprehensive product set with Arabic names
        comprehensive_products = [
            # Necklaces
            {
                "name": "قلادة ذهبية فاخرة مع لؤلؤ",
                "description": "قلادة ذهبية أنيقة مع لؤلؤ طبيعي، مثالية للمناسبات الخاصة",
                "price": 299.99,
                "original_price": 399.99,
                "discount_percentage": 25,
                "category": "necklaces",
                "images": ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400"],
                "stock_quantity": 50
            },
            {
                "name": "قلادة فضية بحجر الزمرد",
                "description": "قلادة فضية راقية مرصعة بحجر الزمرد الأخضر",
                "price": 199.99,
                "original_price": 249.99,
                "discount_percentage": 20,
                "category": "necklaces",
                "images": ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400"],
                "stock_quantity": 30
            },
            
            # Earrings
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
                "name": "أقراط ذهبية متدلية",
                "description": "أقراط ذهبية أنيقة متدلية مع تصميم عصري",
                "price": 179.99,
                "original_price": 229.99,
                "discount_percentage": 22,
                "category": "earrings",
                "images": ["https://images.unsplash.com/photo-1636619608432-77941d282b32?w=400"],
                "stock_quantity": 40
            },
            
            # Rings
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
                "name": "خاتم فضي بحجر الياقوت",
                "description": "خاتم فضي راقي مرصع بحجر الياقوت الأحمر",
                "price": 349.99,
                "original_price": 449.99,
                "discount_percentage": 22,
                "category": "rings",
                "images": ["https://images.unsplash.com/photo-1606623546924-a4f3ae5ea3e8?w=400"],
                "stock_quantity": 35
            },
            
            # Bracelets
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
                "name": "سوار فضي بأحجار كريمة",
                "description": "سوار فضي مرصع بأحجار كريمة ملونة",
                "price": 189.99,
                "original_price": 239.99,
                "discount_percentage": 21,
                "category": "bracelets",
                "images": ["https://images.unsplash.com/photo-1586878340506-af074f2ee999?w=400"],
                "stock_quantity": 55
            },
            
            # Watches
            {
                "name": "ساعة ذهبية فاخرة",
                "description": "ساعة يد ذهبية مع تصميم كلاسيكي وحركة سويسرية",
                "price": 899.99,
                "original_price": 1199.99,
                "discount_percentage": 25,
                "category": "watches",
                "images": ["https://images.unsplash.com/photo-1758297679778-d308606a3f51?w=400"],
                "stock_quantity": 15
            },
            {
                "name": "ساعة فضية رياضية",
                "description": "ساعة فضية عصرية مقاومة للماء مع تصميم رياضي",
                "price": 449.99,
                "original_price": 599.99,
                "discount_percentage": 25,
                "category": "watches",
                "images": ["https://images.unsplash.com/photo-1758297679778-d308606a3f51?w=400"],
                "stock_quantity": 20
            },
            
            # Sets
            {
                "name": "طقم مجوهرات ذهبي كامل",
                "description": "طقم كامل من المجوهرات الذهبية يشمل قلادة وأقراط وسوار",
                "price": 799.99,
                "original_price": 1099.99,
                "discount_percentage": 27,
                "category": "sets",
                "images": ["https://images.pexels.com/photos/34047369/pexels-photo-34047369.jpeg"],
                "stock_quantity": 12
            },
            {
                "name": "طقم مجوهرات فضي للعروس",
                "description": "طقم مجوهرات فضي راقي مخصص للعرائس مع تصميم فاخر",
                "price": 599.99,
                "original_price": 799.99,
                "discount_percentage": 25,
                "category": "sets",
                "images": ["https://images.pexels.com/photos/34047369/pexels-photo-34047369.jpeg"],
                "stock_quantity": 8
            }
        ]
        
        created_count = 0
        failed_count = 0
        
        for product_data in comprehensive_products:
            success, data, status = self.make_request('POST', '/products', product_data)
            
            if success and data.get('id'):
                created_count += 1
                print(f"✅ Created: {product_data['name']}")
            else:
                failed_count += 1
                print(f"❌ Failed to create: {product_data['name']} - Status: {status}")
                if isinstance(data, dict) and 'detail' in data:
                    print(f"   Error: {data['detail']}")
        
        print(f"\n📊 Created {created_count} products, {failed_count} failed")
        return created_count > 0

    def test_final_products_endpoint(self):
        """Final test of products endpoint"""
        print("\n🔍 FINAL TEST OF PRODUCTS ENDPOINT...")
        
        success, data, status = self.make_request('GET', '/products')
        
        if success and isinstance(data, list):
            print(f"✅ SUCCESS: GET /api/products now returns {len(data)} products")
            
            # Show products by category
            categories = {}
            for product in data:
                cat = product.get('category', 'unknown')
                if cat not in categories:
                    categories[cat] = 0
                categories[cat] += 1
            
            print("   Products by category:")
            for cat, count in categories.items():
                print(f"   - {cat}: {count} products")
            
            # Show first few products
            print("\n   Sample products:")
            for i, product in enumerate(data[:5]):
                print(f"   {i+1}. {product.get('name', 'No name')} - {product.get('price', 'No price')} SAR ({product.get('category', 'No category')})")
            
            return True
        else:
            print(f"❌ STILL FAILING: Status {status}")
            if isinstance(data, dict) and 'raw_response' in data:
                print(f"   Raw response: {data['raw_response'][:200]}...")
            else:
                print(f"   Response: {data}")
            return False

    def run_fix(self):
        """Run the complete fix process"""
        print("🔧 PRODUCTS DATABASE FIX PROCESS")
        print("=" * 50)
        
        # Step 1: Login
        if not self.login_admin():
            return False
        
        # Step 2: Analyze current products
        good_products = self.get_products_with_filters()
        
        # Step 3: Create comprehensive product set
        if self.create_comprehensive_product_set():
            # Step 4: Test final endpoint
            return self.test_final_products_endpoint()
        
        return False

def main():
    """Main fix execution"""
    fixer = ProductsDatabaseFixer()
    
    try:
        success = fixer.run_fix()
        if success:
            print("\n🎉 DATABASE FIX SUCCESSFUL!")
            print("The products page should now show products instead of 'لم نجد أي منتجات'")
            print("The wishlist heart functionality can now be tested properly.")
        else:
            print("\n❌ DATABASE FIX FAILED")
            print("The issue persists - manual database intervention may be needed")
        return 0 if success else 1
    except Exception as e:
        print(f"\n💥 Fix failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())