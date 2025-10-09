import requests
import sys
import json
from datetime import datetime

class MissingEndpointsTester:
    def __init__(self, base_url="https://bugzapper-beans.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.host_token = None
        self.current_token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {}
        
        if self.current_token:
            test_headers['Authorization'] = f'Bearer {self.current_token}'
        
        if headers:
            test_headers.update(headers)
        
        # Only add Content-Type for JSON requests
        if not files and data is not None:
            test_headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if params:
            print(f"   Params: {params}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=params)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers={k:v for k,v in test_headers.items() if k != 'Content-Type'}, files=files, params=params)
                else:
                    response = requests.post(url, json=data, headers=test_headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, params=params)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text}")

            return success, response.json() if response.text and response.status_code < 500 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def setup_auth(self):
        """Setup admin and host tokens using existing Admin/admin333 and create demo host"""
        print("\n🔐 Setting up authentication...")
        
        # Login as Admin using existing credentials
        admin_login_data = {
            "bigo_id": "Admin",
            "password": "admin333"
        }
        
        success, response = self.run_test(
            "Admin Login (Admin/admin333)",
            "POST",
            "auth/login",
            200,
            data=admin_login_data
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   🔑 Admin token obtained")
            print(f"   🎭 Role: {response.get('user', {}).get('role')}")
        else:
            print("❌ Admin login failed")
            return False
        
        # Create demo host
        demo_bigo_id = f"demo_host_{datetime.now().strftime('%H%M%S')}"
        demo_data = {
            "bigo_id": demo_bigo_id,
            "password": "host123",
            "name": "Demo Host",
            "email": f"{demo_bigo_id}@lvlup.com",
            "timezone": "UTC"
        }
        
        success, response = self.run_test(
            "Create Demo Host",
            "POST",
            "auth/register",
            200,
            data=demo_data
        )
        
        if success and 'access_token' in response:
            self.host_token = response['access_token']
            print(f"   🔑 Host token obtained")
            print(f"   🎭 Role: {response.get('user', {}).get('role')}")
            return True
        else:
            print("❌ Demo host creation failed")
            return False

    def test_voice_router_endpoints(self):
        """Test voice router endpoints that should be at /api/voice"""
        print("\n🎵 Testing Voice Router Endpoints...")
        
        # Test GET /api/voice/voices (auth required)
        self.current_token = self.host_token
        success, response = self.run_test(
            "GET /api/voice/voices (auth required)",
            "GET",
            "voice/voices",
            404  # Expecting 404 since router is commented out
        )
        
        return success

    def test_admin_assistant_router(self):
        """Test admin assistant router endpoints that should be at /api/admin-assistant"""
        print("\n🤖 Testing Admin Assistant Router...")
        
        # Test with admin auth
        self.current_token = self.admin_token
        chat_data = {
            "message": "Help me manage the platform",
            "context": "admin_dashboard"
        }
        
        success, response = self.run_test(
            "POST /api/admin-assistant/chat (admin auth required)",
            "POST",
            "admin-assistant/chat",
            404,  # Expecting 404 since router is commented out
            data=chat_data
        )
        
        return success

def main():
    print("🚀 Testing Missing Router Endpoints")
    print("Checking /api/voice and /api/admin-assistant endpoints")
    print("=" * 60)
    
    tester = MissingEndpointsTester()
    failed_tests = []
    
    # Setup authentication
    if not tester.setup_auth():
        print("❌ Authentication setup failed - cannot continue")
        return 1
    
    # Test voice router endpoints (expecting 404)
    print("\n" + "="*50)
    print("🎵 VOICE ROUTER ENDPOINTS")
    print("="*50)
    if not tester.test_voice_router_endpoints():
        failed_tests.append("Voice Router Endpoints")
    
    # Test admin assistant router (expecting 404)
    print("\n" + "="*50)
    print("🤖 ADMIN ASSISTANT ROUTER")
    print("="*50)
    if not tester.test_admin_assistant_router():
        failed_tests.append("Admin Assistant Router")
    
    # Final results
    print("\n" + "="*60)
    print("📊 MISSING ENDPOINTS TEST RESULTS")
    print("="*60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {len(failed_tests)}")
    
    if failed_tests:
        print("\n❌ FAILED TESTS:")
        for test in failed_tests:
            print(f"   • {test}")
        print(f"\n⚠️  {len(failed_tests)} tests failed out of {tester.tests_run}")
        return 1
    else:
        print("\n🎉 ALL MISSING ENDPOINT TESTS PASSED!")
        print("✅ Expected 404s confirmed for missing router endpoints")
        return 0

if __name__ == "__main__":
    sys.exit(main())