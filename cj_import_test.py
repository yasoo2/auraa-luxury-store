#!/usr/bin/env python3
"""
CJ Dropshipping Import System Testing
Focused test for the review request requirements
"""

import requests
import sys
import json
import time
from datetime import datetime

class CJImportTester:
    def __init__(self, base_url="https://luxury-import-sys.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()  # Use session for cookie handling
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.job_id = None
        
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
    
    def make_request(self, method: str, endpoint: str, data: dict = None) -> tuple:
        """Make HTTP request using session for cookie handling"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, timeout=30)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0
    
    def test_health_endpoints(self):
        """Test health and readiness endpoints"""
        print("🏥 Testing Backend Health...")
        
        # Test /api/health
        success, data, status = self.make_request('GET', '/health')
        
        if success and data.get('status') == 'ok':
            self.log_test("Health Endpoint", True, f"Status: {data.get('status')}, Service: {data.get('service')}")
        else:
            self.log_test("Health Endpoint", False, f"Status: {status}, Response: {data}")
        
        # Test /api/readiness
        success, data, status = self.make_request('GET', '/readiness')
        
        if success and data.get('status') in ['ready', 'degraded']:
            self.log_test("Readiness Endpoint", True, 
                        f"Status: {data.get('status')}, DB: {data.get('db')}, Vendors: {data.get('vendors')}")
        else:
            self.log_test("Readiness Endpoint", False, f"Status: {status}, Response: {data}")
    
    def test_admin_authentication(self):
        """Test admin authentication with cookie handling"""
        print("🔐 Testing Admin Authentication...")
        
        admin_credentials = {
            "identifier": "admin@auraa.com",
            "password": "admin123"
        }
        
        success, data, status = self.make_request('POST', '/auth/login', admin_credentials)
        
        if success and data.get('success'):
            user_data = data.get('user', {})
            is_admin = user_data.get('is_admin', False)
            
            if is_admin:
                self.log_test("Admin Authentication", True, 
                            f"Admin logged in: {user_data.get('email')}, is_admin: {is_admin}")
                return True
            else:
                self.log_test("Admin Authentication", False, f"User is not admin: {is_admin}")
                return False
        else:
            self.log_test("Admin Authentication", False, f"Status: {status}, Response: {data}")
            return False
    
    def test_cj_quick_import(self):
        """Test CJ Quick Import with 10 products"""
        print("📦 Testing CJ Quick Import...")
        
        # Start import job
        import_config = {
            "source": "cj",
            "count": 10,
            "batch_size": 10,
            "keyword": "jewelry"
        }
        
        success, data, status = self.make_request('POST', '/imports/start', import_config)
        
        if success and data.get('jobId'):
            self.job_id = data['jobId']
            self.log_test("CJ Import Start", True, 
                        f"Job started: {self.job_id}, Source: {data.get('source')}, Count: {data.get('acceptedCount')}")
            
            # Monitor progress for 60 seconds
            max_wait = 60
            wait_time = 0
            
            print("   Monitoring import progress...")
            
            while wait_time < max_wait:
                time.sleep(3)
                wait_time += 3
                
                success_status, status_data, status_code = self.make_request('GET', f'/imports/{self.job_id}/status')
                
                if success_status:
                    state = status_data.get('state')
                    processed = status_data.get('processed', 0)
                    total = status_data.get('total', 0)
                    imported = status_data.get('imported', 0)
                    failed = status_data.get('failed', 0)
                    percent = status_data.get('percent', 0)
                    
                    print(f"   Progress: {state} - {processed}/{total} ({percent}%) - Imported: {imported}, Failed: {failed}")
                    
                    if state == 'completed':
                        self.log_test("CJ Import Progress Monitoring", True, 
                                    f"Import completed: {imported} imported, {failed} failed")
                        return True
                    elif state == 'failed':
                        self.log_test("CJ Import Progress Monitoring", False, 
                                    f"Import failed: {status_data.get('error')}")
                        return False
                else:
                    self.log_test("CJ Import Progress Monitoring", False, 
                                f"Status check failed: {status_code}")
                    return False
            
            # Timeout reached
            self.log_test("CJ Import Progress Monitoring", False, 
                        f"Import timeout after {max_wait} seconds")
            return False
        else:
            self.log_test("CJ Import Start", False, f"Status: {status}, Response: {data}")
            return False
    
    def test_imported_products_verification(self):
        """Verify imported products have correct structure and pricing"""
        print("🔍 Verifying Imported Products...")
        
        # Get products with CJ source
        success, data, status = self.make_request('GET', '/products?limit=20')
        
        if success and isinstance(data, list):
            cj_products = [p for p in data if p.get('source') == 'cj_dropshipping' or p.get('imported_from_cj')]
            
            if cj_products:
                self.log_test("CJ Products Found", True, f"Found {len(cj_products)} CJ products")
                
                # Verify product structure
                sample_product = cj_products[0]
                required_fields = [
                    'id', 'name', 'price', 'source', 'imported_from_cj',
                    'supplier_price', 'price_breakdown'
                ]
                
                missing_fields = [field for field in required_fields if field not in sample_product]
                
                if not missing_fields:
                    self.log_test("CJ Product Structure", True, "All required fields present")
                    
                    # Verify pricing structure
                    price_breakdown = sample_product.get('price_breakdown', {})
                    pricing_fields = [
                        'base_cost_sar', 'supplier_shipping_sar', 'local_shipping_sar',
                        'profit_amount_sar', 'tax_amount_sar', 'profit_percentage', 'tax_rate'
                    ]
                    
                    missing_pricing = [field for field in pricing_fields if field not in price_breakdown]
                    
                    if not missing_pricing:
                        self.log_test("CJ Pricing Breakdown", True, 
                                    f"Complete pricing data: Profit: {price_breakdown.get('profit_percentage')}%, "
                                    f"Tax: {price_breakdown.get('tax_rate')}%")
                        
                        # Test pricing calculation
                        self.test_pricing_calculation(sample_product)
                        return True
                    else:
                        self.log_test("CJ Pricing Breakdown", False, f"Missing pricing fields: {missing_pricing}")
                        return False
                else:
                    self.log_test("CJ Product Structure", False, f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("CJ Products Found", False, "No CJ products found in database")
                return False
        else:
            self.log_test("CJ Products Found", False, f"Failed to get products: {status}")
            return False
    
    def test_pricing_calculation(self, product):
        """Test CJ pricing calculation formula"""
        print("💰 Testing Pricing Calculation...")
        
        price_breakdown = product.get('price_breakdown', {})
        
        # Get values
        final_price = product.get('price', 0)
        supplier_price = product.get('supplier_price', 0)
        base_cost_sar = price_breakdown.get('base_cost_sar', 0)
        supplier_shipping_sar = price_breakdown.get('supplier_shipping_sar', 0)
        local_shipping_sar = price_breakdown.get('local_shipping_sar', 0)
        profit_amount_sar = price_breakdown.get('profit_amount_sar', 0)
        tax_amount_sar = price_breakdown.get('tax_amount_sar', 0)
        profit_percentage = price_breakdown.get('profit_percentage', 0)
        tax_rate = price_breakdown.get('tax_rate', 0)
        
        # Verify pricing formula
        total_cost = base_cost_sar + supplier_shipping_sar + local_shipping_sar
        price_with_profit = total_cost + profit_amount_sar
        calculated_final = price_with_profit + tax_amount_sar
        
        # Allow 5% tolerance for rounding
        price_diff = abs(final_price - calculated_final)
        tolerance = final_price * 0.05
        
        if price_diff <= tolerance:
            self.log_test("CJ Pricing Formula Verification", True, 
                        f"Price calculation correct: Final={final_price}, Calculated={calculated_final:.2f}")
        else:
            self.log_test("CJ Pricing Formula Verification", False, 
                        f"Price mismatch: Final={final_price}, Calculated={calculated_final:.2f}, Diff={price_diff:.2f}")
        
        # Verify profit percentage (should be around 200%)
        if 180 <= profit_percentage <= 220:  # Allow some variance
            self.log_test("CJ Profit Percentage", True, f"Profit percentage: {profit_percentage}%")
        else:
            self.log_test("CJ Profit Percentage", False, f"Unexpected profit percentage: {profit_percentage}%")
        
        # Verify tax rate (should be 15% for Saudi Arabia)
        if tax_rate == 15:
            self.log_test("CJ Tax Rate", True, f"Tax rate: {tax_rate}%")
        else:
            self.log_test("CJ Tax Rate", False, f"Unexpected tax rate: {tax_rate}%")
        
        # Log sample pricing data
        print(f"\n   📊 Sample Product Pricing:")
        print(f"   - Product Name: {product.get('name', 'N/A')}")
        print(f"   - Supplier Price: ${supplier_price}")
        print(f"   - Base Cost SAR: {base_cost_sar}")
        print(f"   - Supplier Shipping SAR: {supplier_shipping_sar}")
        print(f"   - Local Shipping SAR: {local_shipping_sar}")
        print(f"   - Profit Amount SAR: {profit_amount_sar}")
        print(f"   - Tax Amount SAR: {tax_amount_sar}")
        print(f"   - Final Price SAR: {final_price}")
    
    def test_import_status_persistence(self):
        """Test import status persistence in database"""
        print("💾 Testing Import Status Persistence...")
        
        if not self.job_id:
            self.log_test("CJ Import Status Persistence", False, "No job ID available")
            return
        
        # Check status immediately
        success1, data1, status1 = self.make_request('GET', f'/imports/{self.job_id}/status')
        
        if success1:
            initial_state = data1.get('state')
            initial_processed = data1.get('processed', 0)
            
            # Wait 5 seconds
            time.sleep(5)
            
            # Check status again
            success2, data2, status2 = self.make_request('GET', f'/imports/{self.job_id}/status')
            
            if success2:
                final_state = data2.get('state')
                final_processed = data2.get('processed', 0)
                
                # Status should persist
                if final_processed >= initial_processed:
                    self.log_test("CJ Import Status Persistence", True, 
                                f"Status persisted: {initial_state}→{final_state}, "
                                f"Progress: {initial_processed}→{final_processed}")
                else:
                    self.log_test("CJ Import Status Persistence", False, 
                                f"Progress went backwards: {initial_processed}→{final_processed}")
            else:
                self.log_test("CJ Import Status Persistence", False, f"Second status check failed: {status2}")
        else:
            self.log_test("CJ Import Status Persistence", False, f"Initial status check failed: {status1}")
    
    def run_cj_import_tests(self):
        """Run all CJ import tests"""
        print("🚀 CJ DROPSHIPPING IMPORT SYSTEM TESTING")
        print(f"🔗 Testing API at: {self.api_url}")
        print("=" * 80)
        
        # 1. Backend Health Check
        self.test_health_endpoints()
        
        # 2. Admin Authentication
        if not self.test_admin_authentication():
            print("❌ Admin authentication failed - cannot proceed with import tests")
            return False
        
        # 3. Test Quick Import - Small Batch (10 products)
        if not self.test_cj_quick_import():
            print("❌ CJ import failed - cannot proceed with verification tests")
            return False
        
        # 4. Verify Imported Products
        self.test_imported_products_verification()
        
        # 5. Test Import Status Persistence
        self.test_import_status_persistence()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 CJ IMPORT SYSTEM TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for i, failed in enumerate(self.failed_tests, 1):
                print(f"{i}. {failed['test']}")
                if failed['details']:
                    print(f"   → {failed['details']}")
        
        return len(self.failed_tests) == 0

if __name__ == "__main__":
    tester = CJImportTester()
    success = tester.run_cj_import_tests()
    sys.exit(0 if success else 1)