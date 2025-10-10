#!/usr/bin/env python3
"""
GitHub Auto-Deployment Verification Testing
Tests the GitHub Actions workflow and Vercel configuration for automatic deployment
"""

import os
import json
import yaml
import sys
from pathlib import Path

class DeploymentVerificationTest:
    def __init__(self):
        self.app_root = Path("/app")
        self.results = []
        self.errors = []
        
    def log_result(self, test_name, status, message):
        """Log test result"""
        self.results.append({
            "test": test_name,
            "status": status,
            "message": message
        })
        status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_symbol} {test_name}: {message}")
        
    def test_github_workflow_exists(self):
        """Test 1: Verify GitHub Actions workflow file exists"""
        workflow_path = self.app_root / ".github" / "workflows" / "deploy.yml"
        
        if workflow_path.exists():
            self.log_result("GitHub Workflow File Exists", "PASS", 
                          f"Found deploy.yml at {workflow_path}")
            return True
        else:
            self.log_result("GitHub Workflow File Exists", "FAIL", 
                          f"deploy.yml not found at {workflow_path}")
            return False
    
    def test_workflow_syntax_and_structure(self):
        """Test 2: Verify GitHub Actions workflow YAML syntax and structure"""
        workflow_path = self.app_root / ".github" / "workflows" / "deploy.yml"
        
        try:
            with open(workflow_path, 'r') as f:
                workflow_content = yaml.safe_load(f)
            
            # Check required fields
            required_fields = ['name', 'on', 'jobs']
            missing_fields = [field for field in required_fields if field not in workflow_content]
            
            if missing_fields:
                self.log_result("Workflow YAML Structure", "FAIL", 
                              f"Missing required fields: {missing_fields}")
                return False
            
            # Check trigger configuration (YAML parser converts 'on' to True)
            triggers = workflow_content.get('on', workflow_content.get(True, {}))
            
            # Verify push trigger on main branch
            push_config = triggers.get('push', {})
            if 'branches' not in push_config:
                self.log_result("Workflow Triggers", "FAIL", 
                              "Push trigger missing branches configuration")
                return False
            
            branches = push_config['branches']
            if 'main' not in branches:
                self.log_result("Workflow Triggers", "FAIL", 
                              f"Main branch not in push triggers: {branches}")
                return False
            
            # Verify manual trigger (workflow_dispatch)
            if 'workflow_dispatch' not in triggers:
                self.log_result("Workflow Triggers", "WARN", 
                              "Manual trigger (workflow_dispatch) not configured")
            
            self.log_result("Workflow YAML Structure", "PASS", 
                          "Valid YAML structure with required fields and main branch trigger")
            return True
            
        except yaml.YAMLError as e:
            self.log_result("Workflow YAML Structure", "FAIL", 
                          f"Invalid YAML syntax: {str(e)}")
            return False
        except Exception as e:
            self.log_result("Workflow YAML Structure", "FAIL", 
                          f"Error reading workflow file: {str(e)}")
            return False
    
    def test_vercel_deploy_hook_reference(self):
        """Test 3: Verify VERCEL_DEPLOY_HOOK secret is properly referenced"""
        workflow_path = self.app_root / ".github" / "workflows" / "deploy.yml"
        
        try:
            with open(workflow_path, 'r') as f:
                workflow_content = f.read()
            
            # Check for VERCEL_DEPLOY_HOOK reference
            if 'secrets.VERCEL_DEPLOY_HOOK' not in workflow_content:
                self.log_result("Vercel Deploy Hook Reference", "FAIL", 
                              "VERCEL_DEPLOY_HOOK secret not referenced in workflow")
                return False
            
            # Check for proper error handling
            if 'if [ -z "${{ secrets.VERCEL_DEPLOY_HOOK }}"' in workflow_content:
                self.log_result("Vercel Deploy Hook Reference", "PASS", 
                              "VERCEL_DEPLOY_HOOK properly referenced with error handling")
                return True
            else:
                self.log_result("Vercel Deploy Hook Reference", "WARN", 
                              "VERCEL_DEPLOY_HOOK referenced but no error handling for missing secret")
                return True
                
        except Exception as e:
            self.log_result("Vercel Deploy Hook Reference", "FAIL", 
                          f"Error checking deploy hook reference: {str(e)}")
            return False
    
    def test_workflow_error_handling(self):
        """Test 4: Verify workflow includes proper error handling"""
        workflow_path = self.app_root / ".github" / "workflows" / "deploy.yml"
        
        try:
            with open(workflow_path, 'r') as f:
                workflow_content = f.read()
            
            error_handling_patterns = [
                'exit 1',  # Exit on error
                'if [ -z',  # Check for empty variables
            ]
            
            found_patterns = []
            for pattern in error_handling_patterns:
                if pattern in workflow_content:
                    found_patterns.append(pattern)
            
            if found_patterns:
                self.log_result("Workflow Error Handling", "PASS", 
                              f"Error handling found: {found_patterns}")
                return True
            else:
                self.log_result("Workflow Error Handling", "WARN", 
                              "No explicit error handling patterns found")
                return False
                
        except Exception as e:
            self.log_result("Workflow Error Handling", "FAIL", 
                          f"Error checking error handling: {str(e)}")
            return False
    
    def test_vercel_config_exists(self):
        """Test 5: Verify Vercel configuration file exists"""
        vercel_config_path = self.app_root / "frontend" / "vercel.json"
        
        if vercel_config_path.exists():
            self.log_result("Vercel Config File Exists", "PASS", 
                          f"Found vercel.json at {vercel_config_path}")
            return True
        else:
            self.log_result("Vercel Config File Exists", "FAIL", 
                          f"vercel.json not found at {vercel_config_path}")
            return False
    
    def test_vercel_config_validity(self):
        """Test 6: Verify Vercel configuration is valid for React app deployment"""
        vercel_config_path = self.app_root / "frontend" / "vercel.json"
        
        try:
            with open(vercel_config_path, 'r') as f:
                vercel_config = json.load(f)
            
            # Check for React/CRA specific configuration
            expected_fields = {
                'buildCommand': 'npm run build',
                'outputDirectory': 'build',
                'framework': 'create-react-app'
            }
            
            issues = []
            for field, expected_value in expected_fields.items():
                if field not in vercel_config:
                    issues.append(f"Missing field: {field}")
                elif vercel_config[field] != expected_value:
                    issues.append(f"Incorrect {field}: got '{vercel_config[field]}', expected '{expected_value}'")
            
            if issues:
                self.log_result("Vercel Config Validity", "FAIL", 
                              f"Configuration issues: {'; '.join(issues)}")
                return False
            else:
                self.log_result("Vercel Config Validity", "PASS", 
                              "Valid Vercel configuration for create-react-app")
                return True
                
        except json.JSONDecodeError as e:
            self.log_result("Vercel Config Validity", "FAIL", 
                          f"Invalid JSON in vercel.json: {str(e)}")
            return False
        except Exception as e:
            self.log_result("Vercel Config Validity", "FAIL", 
                          f"Error reading vercel.json: {str(e)}")
            return False
    
    def test_build_compatibility(self):
        """Test 7: Verify build process compatibility between local and Vercel"""
        package_json_path = self.app_root / "frontend" / "package.json"
        
        try:
            with open(package_json_path, 'r') as f:
                package_config = json.load(f)
            
            # Check build script exists
            scripts = package_config.get('scripts', {})
            if 'build' not in scripts:
                self.log_result("Build Compatibility", "FAIL", 
                              "No 'build' script found in package.json")
                return False
            
            build_command = scripts['build']
            
            # Check if it's using react-scripts (CRA)
            if 'react-scripts build' in build_command:
                self.log_result("Build Compatibility", "PASS", 
                              f"Compatible build command: {build_command}")
                return True
            else:
                self.log_result("Build Compatibility", "WARN", 
                              f"Non-standard build command: {build_command}")
                return True
                
        except Exception as e:
            self.log_result("Build Compatibility", "FAIL", 
                          f"Error checking build compatibility: {str(e)}")
            return False
    
    def test_environment_variables(self):
        """Test 8: Verify environment variable handling in CI/CD pipeline"""
        frontend_env_path = self.app_root / "frontend" / ".env"
        
        try:
            if frontend_env_path.exists():
                with open(frontend_env_path, 'r') as f:
                    env_content = f.read()
                
                # Check for REACT_APP_BACKEND_URL
                if 'REACT_APP_BACKEND_URL' in env_content:
                    self.log_result("Environment Variables", "PASS", 
                                  "REACT_APP_BACKEND_URL found in frontend .env")
                    return True
                else:
                    self.log_result("Environment Variables", "WARN", 
                                  "REACT_APP_BACKEND_URL not found in frontend .env")
                    return False
            else:
                self.log_result("Environment Variables", "WARN", 
                              "No .env file found in frontend directory")
                return False
                
        except Exception as e:
            self.log_result("Environment Variables", "FAIL", 
                          f"Error checking environment variables: {str(e)}")
            return False
    
    def test_deployment_workflow_completeness(self):
        """Test 9: Verify deployment workflow is complete and functional"""
        workflow_path = self.app_root / ".github" / "workflows" / "deploy.yml"
        
        try:
            with open(workflow_path, 'r') as f:
                workflow_content = yaml.safe_load(f)
            
            jobs = workflow_content.get('jobs', {})
            
            if not jobs:
                self.log_result("Deployment Workflow Completeness", "FAIL", 
                              "No jobs defined in workflow")
                return False
            
            # Check for deployment job
            job_names = list(jobs.keys())
            deployment_job = jobs[job_names[0]]  # Get first job
            
            steps = deployment_job.get('steps', [])
            if not steps:
                self.log_result("Deployment Workflow Completeness", "FAIL", 
                              "No steps defined in deployment job")
                return False
            
            # Check for curl command to trigger deployment
            has_curl_step = False
            for step in steps:
                if 'run' in step and 'curl' in step['run']:
                    has_curl_step = True
                    break
            
            if has_curl_step:
                self.log_result("Deployment Workflow Completeness", "PASS", 
                              "Complete deployment workflow with curl trigger")
                return True
            else:
                self.log_result("Deployment Workflow Completeness", "WARN", 
                              "Deployment job exists but no curl trigger found")
                return False
                
        except Exception as e:
            self.log_result("Deployment Workflow Completeness", "FAIL", 
                          f"Error checking workflow completeness: {str(e)}")
            return False
    
    def test_alternative_deployment_workflows(self):
        """Test 10: Check for alternative deployment workflows"""
        workflows_dir = self.app_root / ".github" / "workflows"
        
        try:
            workflow_files = list(workflows_dir.glob("*.yml"))
            deployment_workflows = []
            
            for workflow_file in workflow_files:
                if any(keyword in workflow_file.name.lower() for keyword in ['deploy', 'vercel']):
                    deployment_workflows.append(workflow_file.name)
            
            if len(deployment_workflows) > 1:
                self.log_result("Alternative Deployment Workflows", "INFO", 
                              f"Multiple deployment workflows found: {deployment_workflows}")
            else:
                self.log_result("Alternative Deployment Workflows", "INFO", 
                              f"Single deployment workflow: {deployment_workflows}")
            
            return True
            
        except Exception as e:
            self.log_result("Alternative Deployment Workflows", "FAIL", 
                          f"Error checking alternative workflows: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all deployment verification tests"""
        print("🚀 GitHub Auto-Deployment Verification Testing")
        print("=" * 60)
        
        tests = [
            self.test_github_workflow_exists,
            self.test_workflow_syntax_and_structure,
            self.test_vercel_deploy_hook_reference,
            self.test_workflow_error_handling,
            self.test_vercel_config_exists,
            self.test_vercel_config_validity,
            self.test_build_compatibility,
            self.test_environment_variables,
            self.test_deployment_workflow_completeness,
            self.test_alternative_deployment_workflows
        ]
        
        passed = 0
        failed = 0
        warnings = 0
        
        for test in tests:
            try:
                result = test()
                if result is True:
                    passed += 1
                elif result is False:
                    failed += 1
                else:
                    warnings += 1
            except Exception as e:
                print(f"❌ {test.__name__}: Exception occurred - {str(e)}")
                failed += 1
        
        print("\n" + "=" * 60)
        print(f"📊 DEPLOYMENT VERIFICATION RESULTS:")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Warnings: {warnings}")
        print(f"📈 Total Tests: {len(tests)}")
        
        if failed == 0:
            print("\n🎉 DEPLOYMENT CONFIGURATION VERIFIED SUCCESSFULLY!")
            print("✅ GitHub Actions workflow is properly configured")
            print("✅ Vercel configuration is valid for React deployment")
            print("✅ Automatic deployment should work when code is pushed to main branch")
        else:
            print(f"\n⚠️  DEPLOYMENT CONFIGURATION HAS {failed} ISSUES")
            print("❌ Some configuration problems need to be addressed")
        
        return {
            "passed": passed,
            "failed": failed,
            "warnings": warnings,
            "total": len(tests),
            "success": failed == 0
        }

if __name__ == "__main__":
    tester = DeploymentVerificationTest()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if results["success"] else 1)