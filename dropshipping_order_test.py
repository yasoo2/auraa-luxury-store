#!/usr/bin/env python3
"""
Focused Backend API Testing for Dropshipping Order Tracking
Tests the new order tracking additions as requested in the review
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class DropshippingOrderTester:
    def __init__(self, base_url="https://luxury-ecom-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.admin_token = None
        self.test_product_id = None
        self.created_order = None
        
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
    
    def setup_admin_authentication(self):
        """Setup admin authentication for testing"""
        admin_credentials = {
            "email": "admin@auraa.com",
            "password": "admin123"
        }
        
        success, data, status = self.make_request('POST', '/auth/login', admin_credentials)
        
        if success and data.get('access_token'):
            self.admin_token = data['access_token']
            self.token = self.admin_token  # Use admin token for all tests
            user_data = data.get('user', {})
            is_admin = user_data.get('is_admin', False)
            
            if is_admin:
                self.log_test("Admin Authentication Setup", True, f"Admin logged in: {user_data.get('email')}")
                return True
            else:
                self.log_test("Admin Authentication Setup", False, f"User is not admin")
                return False
        else:
            self.log_test("Admin Authentication Setup", False, f"Login failed: {status}")
            return False
    
    def get_test_product(self):
        """Get a product for testing"""
        success, data, status = self.make_request('GET', '/products?limit=1')
        
        if success and isinstance(data, list) and len(data) > 0:
            self.test_product_id = data[0].get('id')
            self.log_test("Get Test Product", True, f"Product ID: {self.test_product_id}")
            return True
        else:
            self.log_test("Get Test Product", False, f"No products available: {status}")
            return False
    
    def test_order_creation_with_tracking(self):
        """Test POST /api/orders creates order with order_number, tracking_number, currency defaults to SAR"""
        if not self.token or not self.test_product_id:
            self.log_test("Order Creation with Tracking", False, "Missing token or product ID")
            return False
        
        # First add item to cart
        add_success, add_data, add_status = self.make_request('POST', f'/cart/add?product_id={self.test_product_id}&quantity=1')
        if not add_success:
            self.log_test("Order Creation - Add to Cart", False, f"Failed to add to cart: {add_status}")
            return False
        
        # Create order with shipping address and payment method
        shipping_address = {
            "firstName": "Ahmed",
            "lastName": "Al-Rashid",
            "email": "ahmed@example.com",
            "phone": "+966501234567",
            "street": "King Fahd Road 123",
            "city": "Riyadh",
            "state": "Riyadh Province",
            "zipCode": "11564",
            "country": "SA"
        }
        
        order_data = {
            "shipping_address": shipping_address,
            "payment_method": "credit_card"
        }
        
        success, data, status = self.make_request('POST', '/orders', order_data)
        
        if success and data.get('id'):
            # Store created order for later tests
            self.created_order = data
            
            # Verify required fields
            order_number = data.get('order_number')
            tracking_number = data.get('tracking_number')
            currency = data.get('currency')
            
            if order_number and tracking_number and currency == 'SAR':
                self.log_test("Order Creation with Tracking", True, 
                            f"Order: {order_number}, Tracking: {tracking_number}, Currency: {currency}")
                return True
            else:
                missing = []
                if not order_number: missing.append("order_number")
                if not tracking_number: missing.append("tracking_number")
                if currency != 'SAR': missing.append(f"currency (got {currency}, expected SAR)")
                
                self.log_test("Order Creation with Tracking", False, f"Missing/incorrect fields: {missing}")
                return False
        else:
            self.log_test("Order Creation with Tracking", False, f"Status: {status}, Response: {data}")
            return False
    
    def test_my_orders_endpoint(self):
        """Test GET /api/orders/my-orders returns {orders: [...]} with latest order"""
        if not self.token:
            self.log_test("My Orders Endpoint", False, "No authentication token")
            return False
        
        success, data, status = self.make_request('GET', '/orders/my-orders')
        
        if success:
            # Check response structure
            if isinstance(data, dict) and 'orders' in data:
                orders = data.get('orders', [])
                
                if isinstance(orders, list):
                    if len(orders) > 0:
                        # Check if our created order is in the list
                        latest_order = orders[0]  # Should be sorted by created_at desc
                        
                        if self.created_order and latest_order.get('id') == self.created_order.get('id'):
                            self.log_test("My Orders Endpoint", True, 
                                        f"Found {len(orders)} orders, latest order matches created order")
                            return True
                        else:
                            self.log_test("My Orders Endpoint", True, 
                                        f"Found {len(orders)} orders (created order may not be latest)")
                            return True
                    else:
                        self.log_test("My Orders Endpoint", False, "No orders found in response")
                        return False
                else:
                    self.log_test("My Orders Endpoint", False, f"Orders field is not a list: {type(orders)}")
                    return False
            else:
                self.log_test("My Orders Endpoint", False, f"Response missing 'orders' field: {data}")
                return False
        else:
            self.log_test("My Orders Endpoint", False, f"Status: {status}, Response: {data}")
            return False
    
    def test_order_tracking_by_order_number(self):
        """Test GET /api/orders/track/{order_number} works with order_number"""
        if not self.created_order:
            self.log_test("Order Tracking by Order Number", False, "No created order available")
            return False
        
        order_number = self.created_order.get('order_number')
        if not order_number:
            self.log_test("Order Tracking by Order Number", False, "No order number in created order")
            return False
        
        success, data, status = self.make_request('GET', f'/orders/track/{order_number}')
        
        if success:
            # Verify required fields
            required_fields = ['status', 'created_at', 'total_amount', 'currency', 'shipping_address', 'tracking_events']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                tracking_events = data.get('tracking_events', [])
                if isinstance(tracking_events, list) and len(tracking_events) > 0:
                    self.log_test("Order Tracking by Order Number", True, 
                                f"Tracking found with {len(tracking_events)} events, status: {data.get('status')}")
                    return True
                else:
                    self.log_test("Order Tracking by Order Number", False, "No tracking events found")
                    return False
            else:
                self.log_test("Order Tracking by Order Number", False, f"Missing fields: {missing_fields}")
                return False
        else:
            self.log_test("Order Tracking by Order Number", False, f"Status: {status}, Response: {data}")
            return False
    
    def test_order_tracking_by_tracking_number(self):
        """Test GET /api/orders/track/{tracking_number} works with tracking_number"""
        if not self.created_order:
            self.log_test("Order Tracking by Tracking Number", False, "No created order available")
            return False
        
        tracking_number = self.created_order.get('tracking_number')
        if not tracking_number:
            self.log_test("Order Tracking by Tracking Number", False, "No tracking number in created order")
            return False
        
        success, data, status = self.make_request('GET', f'/orders/track/{tracking_number}')
        
        if success:
            # Verify required fields
            required_fields = ['status', 'created_at', 'total_amount', 'currency', 'shipping_address', 'tracking_events']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                tracking_events = data.get('tracking_events', [])
                if isinstance(tracking_events, list) and len(tracking_events) > 0:
                    self.log_test("Order Tracking by Tracking Number", True, 
                                f"Tracking found with {len(tracking_events)} events, status: {data.get('status')}")
                    return True
                else:
                    self.log_test("Order Tracking by Tracking Number", False, "No tracking events found")
                    return False
            else:
                self.log_test("Order Tracking by Tracking Number", False, f"Missing fields: {missing_fields}")
                return False
        else:
            self.log_test("Order Tracking by Tracking Number", False, f"Status: {status}, Response: {data}")
            return False
    
    def test_order_tracking_404_for_random_id(self):
        """Test GET /api/orders/track/{random_id} returns 404 for non-existent order"""
        random_id = "RANDOM-NONEXISTENT-ID-12345"
        
        success, data, status = self.make_request('GET', f'/orders/track/{random_id}')
        
        if not success and status == 404:
            self.log_test("Order Tracking 404 for Random ID", True, f"Correctly returned 404 for non-existent order")
            return True
        else:
            self.log_test("Order Tracking 404 for Random ID", False, f"Expected 404, got {status}")
            return False
    
    def test_regression_products_endpoint(self):
        """Regression test: Ensure /api/products still works"""
        success, data, status = self.make_request('GET', '/products')
        
        if success and isinstance(data, list) and len(data) > 0:
            self.log_test("Regression - Products Endpoint", True, f"Products endpoint working, {len(data)} products")
            return True
        else:
            self.log_test("Regression - Products Endpoint", False, f"Status: {status}, Products: {len(data) if isinstance(data, list) else 'invalid'}")
            return False
    
    def test_regression_cart_endpoint(self):
        """Regression test: Ensure /api/cart still works"""
        success, data, status = self.make_request('GET', '/cart')
        
        if success and isinstance(data, dict):
            self.log_test("Regression - Cart Endpoint", True, f"Cart endpoint working, total: {data.get('total_amount', 0)}")
            return True
        else:
            self.log_test("Regression - Cart Endpoint", False, f"Status: {status}, Response: {data}")
            return False
    
    def test_regression_auth_login(self):
        """Regression test: Ensure /api/auth/login still works"""
        # Test with admin credentials
        admin_credentials = {
            "email": "admin@auraa.com",
            "password": "admin123"
        }
        
        success, data, status = self.make_request('POST', '/auth/login', admin_credentials)
        
        if success and data.get('access_token'):
            self.log_test("Regression - Auth Login", True, f"Login working, token length: {len(data['access_token'])}")
            return True
        else:
            self.log_test("Regression - Auth Login", False, f"Status: {status}, Response: {data}")
            return False
    
    def run_focused_tests(self):
        """Run focused dropshipping order tracking tests"""
        print("🚀 Starting Dropshipping Order Tracking Tests...")
        print(f"🔗 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Setup
        if not self.setup_admin_authentication():
            print("❌ Failed to setup admin authentication - aborting tests")
            return False
        
        if not self.get_test_product():
            print("❌ Failed to get test product - aborting tests")
            return False
        
        # Core dropshipping order tracking tests
        print("\n📦 DROPSHIPPING ORDER TRACKING TESTS")
        self.test_order_creation_with_tracking()
        self.test_my_orders_endpoint()
        self.test_order_tracking_by_order_number()
        self.test_order_tracking_by_tracking_number()
        self.test_order_tracking_404_for_random_id()
        
        # Regression tests
        print("\n🔄 REGRESSION TESTS")
        self.test_regression_products_endpoint()
        self.test_regression_cart_endpoint()
        self.test_regression_auth_login()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 DROPSHIPPING ORDER TRACKING TEST SUMMARY")
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
        else:
            print("\n🎉 ALL TESTS PASSED!")
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = DropshippingOrderTester()
    
    try:
        success = tester.run_focused_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())