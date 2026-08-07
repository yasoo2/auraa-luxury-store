#!/usr/bin/env python3
"""
CJ Dropshipping Import System Testing - Focused Test
Tests the CJ import workflow without authentication requirements
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class CJImportFocusedTester:
    def __init__(self, base_url="https://cjdrop-import.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.job_id = None
        self.staging_products = []
        
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
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0

    def test_1_health_check_endpoints(self):
        """Test 1: Health Check Endpoints"""
        print("\n🏥 TESTING HEALTH CHECK ENDPOINTS")
        
        # Test GET /api/readiness
        success, data, status = self.make_request('GET', '/readiness')
        
        if success and data.get('status') in ['ready', 'degraded']:
            db_status = data.get('db', False)
            vendors_status = data.get('vendors', False)
            self.log_test("GET /api/readiness", True, 
                         f"Status: {data.get('status')}, DB: {db_status}, Vendors: {vendors_status}")
        else:
            self.log_test("GET /api/readiness", False, f"Status: {status}, Response: {data}")

    def test_2_start_import_job(self):
        """Test 2: Start Import Job"""
        print("\n🚀 TESTING START IMPORT JOB")
        
        import_data = {
            "source": "cj",
            "count": 5,
            "keyword": "luxury"
        }
        
        success, data, status = self.make_request('POST', '/imports/start', import_data)
        
        if success and data.get('success') and data.get('jobId'):
            self.job_id = data.get('jobId')
            self.log_test("POST /api/imports/start", True, 
                         f"Job created with ID: {self.job_id}, Message: {data.get('message')}")
        else:
            self.log_test("POST /api/imports/start", False, f"Status: {status}, Response: {data}")

    def test_3_check_import_status(self):
        """Test 3: Check Import Status"""
        print("\n📊 TESTING IMPORT STATUS MONITORING")
        
        if not self.job_id:
            self.log_test("GET /api/imports/{job_id}/status", False, "No job ID available from previous test")
            return
        
        # Monitor import progress for up to 60 seconds
        max_wait_time = 60
        start_time = time.time()
        
        while time.time() - start_time < max_wait_time:
            success, data, status = self.make_request('GET', f'/imports/{self.job_id}/status')
            
            if success:
                state = data.get('state')
                processed = data.get('processed', 0)
                total = data.get('total', 0)
                imported = data.get('imported', 0)
                failed = data.get('failed', 0)
                
                print(f"   Progress: {state} - {processed}/{total}, Imported: {imported}, Failed: {failed}")
                
                if state in ['completed', 'failed']:
                    if state == 'completed':
                        self.log_test("Import Job Completion", True, f"Job completed successfully, Imported: {imported} products")
                    else:
                        error_msg = data.get('error', 'Unknown error')
                        self.log_test("Import Job Completion", False, f"Job failed with error: {error_msg}")
                    break
                elif state == 'running':
                    time.sleep(5)  # Wait 5 seconds before next check
                else:
                    time.sleep(2)  # Wait 2 seconds for pending state
            else:
                self.log_test("GET /api/imports/{job_id}/status", False, f"Status: {status}, Response: {data}")
                break
        else:
            # Timeout reached
            self.log_test("Import Job Completion", False, f"Job did not complete within {max_wait_time} seconds")
        
        # Final status check for logging
        success, data, status = self.make_request('GET', f'/imports/{self.job_id}/status')
        if success:
            final_state = data.get('state')
            final_imported = data.get('imported', 0)
            final_failed = data.get('failed', 0)
            
            self.log_test("GET /api/imports/{job_id}/status", True, 
                         f"Final status: {final_state}, Imported: {final_imported}, Failed: {final_failed}")

    def test_4_staging_area_get_products(self):
        """Test 4: Staging Area - Get Products"""
        print("\n📦 TESTING STAGING AREA - GET PRODUCTS")
        
        success, data, status = self.make_request('GET', '/products/staging')
        
        if success and isinstance(data, list):
            self.staging_products = data
            product_count = len(data)
            
            if product_count > 0:
                # Check product structure
                sample_product = data[0]
                required_fields = ['id', 'name', 'price', 'staging']
                missing_fields = [field for field in required_fields if field not in sample_product]
                
                if not missing_fields and sample_product.get('staging') == True:
                    self.log_test("GET /api/products/staging", True, 
                                 f"Found {product_count} staging products, structure valid")
                else:
                    self.log_test("GET /api/products/staging", False, 
                                 f"Invalid product structure or staging flag. Missing: {missing_fields}")
            else:
                self.log_test("GET /api/products/staging", True, "No products in staging area (expected if import failed)")
        else:
            self.log_test("GET /api/products/staging", False, f"Status: {status}, Response: {data}")

    def test_5_update_staging_product(self):
        """Test 5: Update Staging Product"""
        print("\n✏️ TESTING UPDATE STAGING PRODUCT")
        
        if not self.staging_products:
            self.log_test("PUT /api/products/staging/{product_id}", False, "No staging products available for testing")
            return
        
        # Use first staging product for testing
        test_product = self.staging_products[0]
        product_id = test_product.get('id')
        
        if not product_id:
            self.log_test("PUT /api/products/staging/{product_id}", False, "No product ID found in staging product")
            return
        
        # Update product with new data
        update_data = {
            "price": 299.99,
            "name": "Test Update - منتج محدث للاختبار"
        }
        
        success, data, status = self.make_request('PUT', f'/products/staging/{product_id}', update_data)
        
        if success and data.get('success'):
            self.log_test("PUT /api/products/staging/{product_id}", True, 
                         f"Product {product_id} updated successfully")
            
            # Verify the update by fetching the product again
            success_verify, staging_data, status_verify = self.make_request('GET', '/products/staging')
            if success_verify:
                updated_product = next((p for p in staging_data if p.get('id') == product_id), None)
                if updated_product and updated_product.get('price') == 299.99:
                    self.log_test("Update Verification", True, "Product update verified successfully")
                else:
                    self.log_test("Update Verification", False, "Product update not reflected in staging area")
        else:
            self.log_test("PUT /api/products/staging/{product_id}", False, f"Status: {status}, Response: {data}")

    def test_6_publish_to_live_store(self):
        """Test 6: Publish to Live Store"""
        print("\n🚀 TESTING PUBLISH TO LIVE STORE")
        
        if not self.staging_products:
            self.log_test("POST /api/products/publish-staging", False, "No staging products available for publishing")
            return
        
        # Select products to publish (up to 2 products for testing)
        products_to_publish = self.staging_products[:2]
        product_ids = [p.get('id') for p in products_to_publish if p.get('id')]
        
        if not product_ids:
            self.log_test("POST /api/products/publish-staging", False, "No valid product IDs found for publishing")
            return
        
        publish_data = {
            "product_ids": product_ids
        }
        
        success, data, status = self.make_request('POST', '/products/publish-staging', publish_data)
        
        if success and data.get('success'):
            published_count = data.get('published', 0)
            self.published_product_ids = product_ids[:published_count]
            
            self.log_test("POST /api/products/publish-staging", True, 
                         f"Successfully published {published_count} products to live store")
        else:
            self.log_test("POST /api/products/publish-staging", False, f"Status: {status}, Response: {data}")

    def test_7_verify_live_products(self):
        """Test 7: Verify Live Products (Note: /api/products endpoint may not be implemented)"""
        print("\n🔍 TESTING VERIFY LIVE PRODUCTS")
        
        success, data, status = self.make_request('GET', '/products')
        
        if success and isinstance(data, list):
            live_products = data
            total_live_products = len(live_products)
            
            # Check if our published products are now in the live store
            if hasattr(self, 'published_product_ids') and self.published_product_ids:
                published_found = []
                for product_id in self.published_product_ids:
                    found_product = next((p for p in live_products if p.get('id') == product_id), None)
                    if found_product and found_product.get('staging') == False:
                        published_found.append(product_id)
                
                if len(published_found) == len(self.published_product_ids):
                    self.log_test("Verify Published Products in Live Store", True, 
                                 f"All {len(published_found)} published products found in live store")
                else:
                    self.log_test("Verify Published Products in Live Store", False, 
                                 f"Only {len(published_found)}/{len(self.published_product_ids)} published products found in live store")
            
            # Check general live products structure
            if total_live_products > 0:
                sample_product = live_products[0]
                staging_flag = sample_product.get('staging', True)
                
                if staging_flag == False:
                    self.log_test("GET /api/products (Live Products)", True, 
                                 f"Found {total_live_products} live products (staging=false)")
                else:
                    self.log_test("GET /api/products (Live Products)", False, 
                                 "Products found but staging flag indicates they're still in staging")
            else:
                self.log_test("GET /api/products (Live Products)", True, 
                             "No live products found (expected if no products were published)")
        else:
            # This endpoint might not be implemented
            self.log_test("GET /api/products", False, f"Status: {status}, Response: {data} (endpoint may not be implemented)")

    def run_complete_cj_import_test(self):
        """Run the complete CJ Dropshipping import system test"""
        print("🎯 CJ DROPSHIPPING IMPORT SYSTEM COMPREHENSIVE TESTING")
        print("=" * 70)
        print(f"Testing against: {self.base_url}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)
        
        # Execute all tests in sequence
        self.test_1_health_check_endpoints()
        self.test_2_start_import_job()
        self.test_3_check_import_status()
        self.test_4_staging_area_get_products()
        self.test_5_update_staging_product()
        self.test_6_publish_to_live_store()
        self.test_7_verify_live_products()
        
        # Print final results
        print("\n" + "=" * 70)
        print("🎯 CJ DROPSHIPPING IMPORT SYSTEM TEST RESULTS")
        print("=" * 70)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, failed_test in enumerate(self.failed_tests, 1):
                print(f"{i}. {failed_test['test']}")
                if failed_test['details']:
                    print(f"   Details: {failed_test['details']}")
        
        print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)
        
        return self.tests_passed, len(self.failed_tests)

if __name__ == "__main__":
    # Get base URL from command line argument or use default
    base_url = sys.argv[1] if len(sys.argv) > 1 else "https://cjdrop-import.preview.emergentagent.com"
    
    tester = CJImportFocusedTester(base_url)
    passed, failed = tester.run_complete_cj_import_test()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)