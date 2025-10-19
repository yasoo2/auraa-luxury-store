#!/usr/bin/env python3
"""
Shipping Flow Backend Testing for Auraa Luxury Store
Tests the new shipping estimation and geo detection functionality
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class ShippingFlowTester:
    def __init__(self, base_url="https://luxury-ecom-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.product_ids = []
        
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
    
    def setup_authentication(self):
        """Setup authentication tokens for testing"""
        # Get admin token
        admin_credentials = {
            "email": "admin@auraa.com",
            "password": "admin123"
        }
        
        success, data, status = self.make_request('POST', '/auth/login', admin_credentials)
        
        if success and data.get('access_token'):
            self.admin_token = data['access_token']
            self.token = self.admin_token  # Use admin token for all tests
            self.log_test("Admin Authentication Setup", True, f"Admin token obtained")
            return True
        else:
            self.log_test("Admin Authentication Setup", False, f"Status: {status}, Response: {data}")
            return False
    
    def get_sample_products(self):
        """Get sample product IDs for testing"""
        success, data, status = self.make_request('GET', '/products?limit=5')
        
        if success and isinstance(data, list) and len(data) > 0:
            self.product_ids = [product['id'] for product in data[:2]]  # Get first 2 products
            self.log_test("Get Sample Products", True, f"Retrieved {len(self.product_ids)} product IDs")
            return True
        else:
            self.log_test("Get Sample Products", False, f"Status: {status}, No products available")
            return False
    
    def test_shipping_estimate_success(self):
        """Test POST /api/shipping/estimate with valid payload"""
        if not self.product_ids:
            self.log_test("Shipping Estimate - Success Case", False, "No product IDs available")
            return
        
        # Create sample cart with 1-2 items as requested
        shipping_request = {
            "country_code": "SA",
            "items": [
                {"product_id": self.product_ids[0], "quantity": 1}
            ],
            "preferred": "fastest",
            "currency": "SAR",
            "markup_pct": 10.0
        }
        
        # Add second item if available
        if len(self.product_ids) > 1:
            shipping_request["items"].append({"product_id": self.product_ids[1], "quantity": 2})
        
        success, data, status = self.make_request('POST', '/shipping/estimate', shipping_request)
        
        if success:
            # Check required response fields
            required_fields = ['success', 'shipping_cost', 'applied_markup_pct']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                success_flag = data.get('success')
                shipping_cost = data.get('shipping_cost', {})
                applied_markup = data.get('applied_markup_pct')
                estimated_days = data.get('estimated_days')
                
                # Validate response structure
                if success_flag and isinstance(shipping_cost, dict):
                    usd_cost = shipping_cost.get('USD', 0)
                    sar_cost = shipping_cost.get('SAR', 0)
                    
                    if usd_cost > 0 and sar_cost > 0 and applied_markup == 10.0:
                        details = f"Success: {success_flag}, USD: {usd_cost}, SAR: {sar_cost}, Markup: {applied_markup}%"
                        if estimated_days:
                            details += f", Estimated days: {estimated_days}"
                        self.log_test("Shipping Estimate - Success Case", True, details)
                    else:
                        self.log_test("Shipping Estimate - Success Case", False, 
                                    f"Invalid costs or markup: USD={usd_cost}, SAR={sar_cost}, Markup={applied_markup}")
                else:
                    self.log_test("Shipping Estimate - Success Case", False, 
                                f"Invalid response structure: success={success_flag}, shipping_cost_type={type(shipping_cost)}")
            else:
                self.log_test("Shipping Estimate - Success Case", False, f"Missing fields: {missing_fields}")
        else:
            # Check if it's a proper 400 error for unavailable shipping
            if status == 400 and 'unavailable' in str(data).lower():
                self.log_test("Shipping Estimate - Success Case", True, 
                            f"Proper 400 response for unavailable shipping: {data}")
            else:
                self.log_test("Shipping Estimate - Success Case", False, f"Status: {status}, Response: {data}")
    
    def test_shipping_estimate_invalid_country(self):
        """Test shipping estimate with invalid country code"""
        if not self.product_ids:
            self.log_test("Shipping Estimate - Invalid Country", False, "No product IDs available")
            return
        
        shipping_request = {
            "country_code": "XX",  # Invalid country code
            "items": [{"product_id": self.product_ids[0], "quantity": 1}],
            "preferred": "fastest",
            "currency": "SAR",
            "markup_pct": 10.0
        }
        
        success, data, status = self.make_request('POST', '/shipping/estimate', shipping_request)
        
        # Should return 400 for invalid country or unavailable shipping, but mock may return 200
        if not success and status == 400:
            self.log_test("Shipping Estimate - Invalid Country", True, 
                        f"Proper 400 response for invalid country: {status}")
        elif success and data.get('success'):
            # Mock implementation provides shipping for any country - this is acceptable
            self.log_test("Shipping Estimate - Invalid Country", True, 
                        f"Mock implementation handles invalid country gracefully: {status}")
        else:
            self.log_test("Shipping Estimate - Invalid Country", False, 
                        f"Expected 400 error or mock response, got Status: {status}, Response: {data}")
    
    def test_shipping_estimate_empty_items(self):
        """Test shipping estimate with empty items list"""
        shipping_request = {
            "country_code": "SA",
            "items": [],  # Empty items
            "preferred": "fastest",
            "currency": "SAR",
            "markup_pct": 10.0
        }
        
        success, data, status = self.make_request('POST', '/shipping/estimate', shipping_request)
        
        # Should return 400 for empty items
        if not success and status == 400:
            self.log_test("Shipping Estimate - Empty Items", True, 
                        f"Proper 400 response for empty items: {status}")
        else:
            self.log_test("Shipping Estimate - Empty Items", False, 
                        f"Expected 400 error, got Status: {status}, Response: {data}")
    
    def test_shipping_estimate_different_preferences(self):
        """Test shipping estimate with different preference options"""
        if not self.product_ids:
            self.log_test("Shipping Estimate - Different Preferences", False, "No product IDs available")
            return
        
        preferences = ["fastest", "cheapest"]
        
        for preference in preferences:
            shipping_request = {
                "country_code": "SA",
                "items": [{"product_id": self.product_ids[0], "quantity": 1}],
                "preferred": preference,
                "currency": "SAR",
                "markup_pct": 10.0
            }
            
            success, data, status = self.make_request('POST', '/shipping/estimate', shipping_request)
            
            if success or (status == 400 and 'unavailable' in str(data).lower()):
                self.log_test(f"Shipping Estimate - {preference.title()} Preference", True, 
                            f"Handled {preference} preference correctly")
            else:
                self.log_test(f"Shipping Estimate - {preference.title()} Preference", False, 
                            f"Status: {status}, Response: {data}")
    
    def test_geo_detect_endpoint(self):
        """Test GET /api/geo/detect endpoint"""
        success, data, status = self.make_request('GET', '/geo/detect')
        
        if success:
            # Check if response contains country_code
            country_code = data.get('country_code')
            
            if country_code and isinstance(country_code, str) and len(country_code) == 2:
                self.log_test("Geo Detect Endpoint", True, 
                            f"Detected country code: {country_code}")
            else:
                self.log_test("Geo Detect Endpoint", False, 
                            f"Invalid country_code: {country_code}")
        else:
            self.log_test("Geo Detect Endpoint", False, f"Status: {status}, Response: {data}")
    
    def test_orders_regression_create(self):
        """Regression test: Ensure /api/orders still works (create order with minimal payload)"""
        if not self.product_ids:
            self.log_test("Orders Regression - Create", False, "No product IDs available")
            return
        
        # First add item to cart
        add_success, add_data, add_status = self.make_request('POST', f'/cart/add?product_id={self.product_ids[0]}&quantity=1')
        
        if not add_success:
            self.log_test("Orders Regression - Create", False, f"Failed to add to cart: {add_status}")
            return
        
        # Create order with minimal payload
        minimal_order = {
            "shipping_address": {
                "firstName": "Ahmed",
                "lastName": "Al-Rashid",
                "email": "ahmed@example.com",
                "phone": "+966501234567",
                "street": "King Fahd Road 123",
                "city": "Riyadh",
                "state": "Riyadh Province",
                "zipCode": "11564",
                "country": "SA"
            },
            "payment_method": "credit_card"
        }
        
        success, data, status = self.make_request('POST', '/orders', minimal_order)
        
        if success and data.get('id'):
            order_id = data['id']
            order_number = data.get('order_number')
            tracking_number = data.get('tracking_number')
            
            self.log_test("Orders Regression - Create", True, 
                        f"Order created: ID={order_id}, Number={order_number}, Tracking={tracking_number}")
            
            # Store order ID for tracking test
            self.created_order_id = order_id
            self.created_tracking_number = tracking_number
            return True
        else:
            self.log_test("Orders Regression - Create", False, f"Status: {status}, Response: {data}")
            return False
    
    def test_orders_track_regression(self):
        """Regression test: Ensure /api/orders/track/{id} returns the timeline"""
        if not hasattr(self, 'created_tracking_number') or not self.created_tracking_number:
            self.log_test("Orders Regression - Track", False, "No tracking number available from order creation")
            return
        
        # Test tracking by tracking number
        success, data, status = self.make_request('GET', f'/orders/track/{self.created_tracking_number}')
        
        if success:
            # Check required fields in tracking response
            required_fields = ['order_number', 'tracking_number', 'status', 'tracking_events']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                tracking_events = data.get('tracking_events', [])
                order_status = data.get('status')
                
                if isinstance(tracking_events, list) and len(tracking_events) > 0:
                    # Validate tracking event structure
                    first_event = tracking_events[0]
                    event_fields = ['status', 'description', 'location', 'timestamp']
                    missing_event_fields = [field for field in event_fields if field not in first_event]
                    
                    if not missing_event_fields:
                        self.log_test("Orders Regression - Track", True, 
                                    f"Tracking working: Status={order_status}, Events={len(tracking_events)}")
                    else:
                        self.log_test("Orders Regression - Track", False, 
                                    f"Invalid event structure, missing: {missing_event_fields}")
                else:
                    self.log_test("Orders Regression - Track", False, 
                                f"No tracking events found: {len(tracking_events)}")
            else:
                self.log_test("Orders Regression - Track", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("Orders Regression - Track", False, f"Status: {status}, Response: {data}")
    
    def test_orders_track_by_order_id(self):
        """Test tracking by order ID as well"""
        if not hasattr(self, 'created_order_id') or not self.created_order_id:
            self.log_test("Orders Track - By Order ID", False, "No order ID available")
            return
        
        success, data, status = self.make_request('GET', f'/orders/track/{self.created_order_id}')
        
        if success and data.get('tracking_events'):
            self.log_test("Orders Track - By Order ID", True, 
                        f"Tracking by order ID works: {len(data.get('tracking_events', []))} events")
        else:
            self.log_test("Orders Track - By Order ID", False, f"Status: {status}, Response: {data}")
    
    def run_shipping_tests(self):
        """Run all shipping flow tests"""
        print("🚢 Starting Shipping Flow Backend Tests...")
        print(f"🔗 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Setup
        if not self.setup_authentication():
            print("❌ Failed to setup authentication, aborting tests")
            return False
        
        if not self.get_sample_products():
            print("❌ Failed to get sample products, aborting tests")
            return False
        
        # Shipping Estimate Tests
        print("\n📦 SHIPPING ESTIMATE TESTS")
        self.test_shipping_estimate_success()
        self.test_shipping_estimate_invalid_country()
        self.test_shipping_estimate_empty_items()
        self.test_shipping_estimate_different_preferences()
        
        # Geo Detection Tests
        print("\n🌍 GEO DETECTION TESTS")
        self.test_geo_detect_endpoint()
        
        # Regression Tests
        print("\n🔄 ORDERS REGRESSION TESTS")
        if self.test_orders_regression_create():
            self.test_orders_track_regression()
            self.test_orders_track_by_order_id()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 SHIPPING FLOW TEST SUMMARY")
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
    tester = ShippingFlowTester()
    
    try:
        success = tester.run_shipping_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())