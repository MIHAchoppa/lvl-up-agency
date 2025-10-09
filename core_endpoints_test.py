import requests
import sys
import json
import io
from datetime import datetime

class CoreEndpointsTester:
    def __init__(self, base_url="https://admin-key-updater.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.host_token = None
        self.current_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.upload_id = None
        self.submission_id = None

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

    def test_tts_endpoints(self):
        """Test TTS endpoints with /api prefix"""
        print("\n🎤 Testing TTS Endpoints...")
        
        # Test GET /api/tts/voices (no auth required based on code)
        self.current_token = None
        success1, response1 = self.run_test(
            "GET /api/tts/voices",
            "GET",
            "tts/voices",
            200
        )
        
        if success1:
            voices = response1.get('voices', [])
            print(f"   🎵 Found {len(voices)} voices: {voices}")
        
        # Test POST /api/tts/speak (auth required)
        self.current_token = self.host_token
        tts_data = {
            "text": "Hello, this is a test message",
            "voice": "Fritz-PlayAI",
            "format": "wav"
        }
        
        success2, response2 = self.run_test(
            "POST /api/tts/speak (auth required)",
            "POST",
            "tts/speak",
            200,
            data=tts_data
        )
        
        if success2:
            if 'audio_base64' in response2:
                print(f"   🎵 Audio generated successfully (base64 format)")
            elif 'audio_url' in response2:
                print(f"   🎵 Audio URL: {response2.get('audio_url')}")
        
        return success1 and success2

    def test_public_ai_chat(self):
        """Test public AI onboarding chat endpoint"""
        print("\n🤖 Testing Public AI Chat...")
        
        self.current_token = None  # No auth required
        chat_data = {
            "message": "Hi, I'm interested in becoming a BIGO Live host",
            "session_id": "test_session_123"
        }
        
        success, response = self.run_test(
            "POST /api/public/ai/onboarding-chat",
            "POST",
            "public/ai/onboarding-chat",
            200,
            data=chat_data
        )
        
        if success:
            ai_response = response.get('response', '')
            print(f"   🤖 AI Response: {ai_response[:100]}...")
        
        return success

    def test_ai_chat_research_permissions(self):
        """Test AI chat with use_research parameter for admin vs non-admin"""
        print("\n🔬 Testing AI Chat Research Permissions...")
        
        # Test with host (should return 403 for use_research=true)
        self.current_token = self.host_token
        host_research_data = {
            "message": "Tell me about BIGO Live strategies",
            "use_research": True
        }
        
        success1, response1 = self.run_test(
            "POST /api/ai/chat (host with use_research=true, should be 403)",
            "POST",
            "ai/chat",
            403,
            data=host_research_data
        )
        
        # Test with admin (should return 200 for use_research=true)
        self.current_token = self.admin_token
        admin_research_data = {
            "message": "Tell me about BIGO Live strategies",
            "use_research": True
        }
        
        success2, response2 = self.run_test(
            "POST /api/ai/chat (admin with use_research=true, should be 200)",
            "POST",
            "ai/chat",
            200,
            data=admin_research_data
        )
        
        if success2:
            ai_response = response2.get('response', '')
            print(f"   🤖 Admin AI Response: {ai_response[:100]}...")
        
        return success1 and success2

    def test_stt_endpoint(self):
        """Test STT endpoint with audio/webm"""
        print("\n🎙️ Testing STT Endpoint...")
        
        self.current_token = self.host_token
        
        # Create a fake webm audio file
        fake_webm_data = b"fake webm audio data for testing"
        files = {'file': ('test.webm', io.BytesIO(fake_webm_data), 'audio/webm')}
        
        success, response = self.run_test(
            "POST /api/stt (audio/webm)",
            "POST",
            "stt",
            200,
            files=files
        )
        
        if success:
            transcription = response.get('transcription', '')
            print(f"   📝 Transcription: {transcription}")
        
        return success

    def test_audition_endpoints(self):
        """Test audition endpoints still work with /api prefix"""
        print("\n🎬 Testing Audition Endpoints...")
        
        # Test audition upload init
        self.current_token = self.host_token
        init_data = {
            "filename": "test.mp4",
            "content_type": "video/mp4",
            "total_chunks": 2,
            "file_size": 1048576
        }
        
        success1, response1 = self.run_test(
            "POST /api/audition/upload/init",
            "POST",
            "audition/upload/init",
            200,
            data=init_data
        )
        
        if not success1:
            return False
        
        self.upload_id = response1.get('upload_id')
        self.submission_id = response1.get('submission_id')
        print(f"   📤 Upload ID: {self.upload_id}")
        
        # Test chunk upload
        test_data = b"test video chunk data " * 100
        files = {'chunk': ('chunk.mp4', io.BytesIO(test_data), 'video/mp4')}
        params = {
            'upload_id': self.upload_id,
            'chunk_index': 0
        }
        
        success2, response2 = self.run_test(
            "POST /api/audition/upload/chunk",
            "POST",
            "audition/upload/chunk",
            200,
            files=files,
            params=params
        )
        
        if not success2:
            return False
        
        # Test upload complete
        params = {'upload_id': self.upload_id}
        success3, response3 = self.run_test(
            "POST /api/audition/upload/complete",
            "POST",
            "audition/upload/complete",
            200,
            params=params
        )
        
        if not success3:
            return False
        
        # Test admin auditions list
        self.current_token = self.admin_token
        success4, response4 = self.run_test(
            "GET /api/admin/auditions",
            "GET",
            "admin/auditions",
            200
        )
        
        if success4:
            auditions = response4 if isinstance(response4, list) else []
            print(f"   📋 Found {len(auditions)} auditions")
        
        return success1 and success2 and success3 and success4

def main():
    print("🚀 Starting Core Endpoints Smoke Tests")
    print("Testing /api prefix compliance for core endpoints")
    print("=" * 60)
    
    tester = CoreEndpointsTester()
    failed_tests = []
    
    # Setup authentication
    if not tester.setup_auth():
        print("❌ Authentication setup failed - cannot continue")
        return 1
    
    # Test 1: TTS endpoints
    print("\n" + "="*50)
    print("🎤 TTS ENDPOINTS")
    print("="*50)
    if not tester.test_tts_endpoints():
        failed_tests.append("TTS Endpoints")
    
    # Test 2: Public AI chat
    print("\n" + "="*50)
    print("🤖 PUBLIC AI CHAT")
    print("="*50)
    if not tester.test_public_ai_chat():
        failed_tests.append("Public AI Chat")
    
    # Test 3: AI chat research permissions
    print("\n" + "="*50)
    print("🔬 AI CHAT RESEARCH PERMISSIONS")
    print("="*50)
    if not tester.test_ai_chat_research_permissions():
        failed_tests.append("AI Chat Research Permissions")
    
    # Test 4: STT endpoint
    print("\n" + "="*50)
    print("🎙️ STT ENDPOINT")
    print("="*50)
    if not tester.test_stt_endpoint():
        failed_tests.append("STT Endpoint")
    
    # Test 5: Audition endpoints
    print("\n" + "="*50)
    print("🎬 AUDITION ENDPOINTS")
    print("="*50)
    if not tester.test_audition_endpoints():
        failed_tests.append("Audition Endpoints")
    
    # Final results
    print("\n" + "="*60)
    print("📊 CORE ENDPOINTS SMOKE TEST RESULTS")
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
        print("\n🎉 ALL CORE ENDPOINT TESTS PASSED!")
        print("✅ All tested API routes properly prefixed with /api")
        print("✅ Kubernetes ingress rules respected")
        return 0

if __name__ == "__main__":
    sys.exit(main())