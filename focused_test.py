import requests
import sys
import json
import io
from datetime import datetime

class FocusedAPITester:
    def __init__(self, base_url="https://host-dashboard-8.preview.emergentagent.com"):
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

    def test_admin_login(self):
        """Test admin login with BIGO ID Admin and password admin333"""
        data = {
            "bigo_id": "Admin",
            "password": "admin333"
        }
        
        success, response = self.run_test(
            "Admin Login (Admin/admin333)",
            "POST",
            "auth/login",
            200,
            data=data
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            user = response.get('user', {})
            print(f"   🔑 Admin token obtained")
            print(f"   👤 User ID: {user.get('id')}")
            print(f"   🎭 Role: {user.get('role')}")
            print(f"   📧 Email: {user.get('email')}")
            
            # Verify role is admin
            if user.get('role') == 'admin':
                print(f"   ✅ Role verification: admin role confirmed")
                return True
            else:
                print(f"   ❌ Role verification failed: expected 'admin', got '{user.get('role')}'")
                return False
        return False

    def test_register_host(self):
        """Test host registration for audition testing"""
        host_bigo_id = f"testhost_{datetime.now().strftime('%H%M%S')}"
        data = {
            "bigo_id": host_bigo_id,
            "password": "hostpass123",
            "name": "Test Host",
            "email": f"{host_bigo_id}@test.com",
            "timezone": "UTC"
        }
        
        success, response = self.run_test(
            "Register Host for Audition Testing",
            "POST",
            "auth/register",
            200,
            data=data
        )
        
        if success and 'access_token' in response:
            self.host_token = response['access_token']
            print(f"   🔑 Host token obtained")
            print(f"   👤 Host BIGO ID: {host_bigo_id}")
            return True, host_bigo_id
        return False, None

    def test_audition_upload_init(self):
        """Test audition upload initialization with host token"""
        self.current_token = self.host_token
        data = {
            "filename": "test_audition.mp4",
            "content_type": "video/mp4",
            "total_chunks": 2,
            "file_size": 1048576
        }
        
        success, response = self.run_test(
            "Audition Upload Init (Host Token)",
            "POST",
            "audition/upload/init",
            200,
            data=data
        )
        
        if success and 'upload_id' in response and 'submission_id' in response:
            self.upload_id = response['upload_id']
            self.submission_id = response['submission_id']
            print(f"   📤 Upload ID: {self.upload_id}")
            print(f"   📝 Submission ID: {self.submission_id}")
            return True
        return False

    def test_audition_upload_chunk(self, chunk_index):
        """Test audition chunk upload"""
        self.current_token = self.host_token
        
        # Create a small test file
        test_data = b"test video chunk data for audition " * 50  # Small test data
        files = {'chunk': ('chunk.mp4', io.BytesIO(test_data), 'video/mp4')}
        params = {
            'upload_id': self.upload_id,
            'chunk_index': chunk_index
        }
        
        success, response = self.run_test(
            f"Audition Upload Chunk {chunk_index}",
            "POST",
            "audition/upload/chunk",
            200,
            files=files,
            params=params
        )
        
        return success

    def test_audition_upload_complete(self):
        """Test audition upload completion"""
        self.current_token = self.host_token
        params = {'upload_id': self.upload_id}
        
        success, response = self.run_test(
            "Audition Upload Complete",
            "POST",
            "audition/upload/complete",
            200,
            params=params
        )
        
        if success:
            print(f"   ✅ Upload completed for submission: {self.submission_id}")
        return success

    def test_admin_list_auditions(self):
        """Test admin audition listing includes our submission"""
        self.current_token = self.admin_token
        
        success, response = self.run_test(
            "Admin List Auditions (includes submission)",
            "GET",
            "admin/auditions",
            200
        )
        
        if success:
            auditions = response if isinstance(response, list) else []
            print(f"   📋 Found {len(auditions)} auditions")
            
            # Check if our submission is in the list
            our_submission = next((a for a in auditions if a.get('id') == self.submission_id), None)
            if our_submission:
                print(f"   ✅ Our submission found: {our_submission.get('name')} - {our_submission.get('status')}")
                return True
            else:
                print(f"   ❌ Our submission not found in auditions list")
                return False
        return False

    def test_admin_stream_video(self):
        """Test admin video streaming returns 200"""
        self.current_token = self.admin_token
        url = f"{self.api_url}/admin/auditions/{self.submission_id}/video"
        headers = {'Authorization': f'Bearer {self.current_token}'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing Admin Stream Video...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, headers=headers, stream=True)
            success = response.status_code == 200
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                print(f"   Content-Type: {response.headers.get('content-type', 'N/A')}")
                # Read a small amount to verify it's actually streaming
                chunk = next(response.iter_content(chunk_size=1024), None)
                if chunk:
                    print(f"   Streaming data received: {len(chunk)} bytes")
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text}")
            
            return success
            
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_admin_delete_audition(self):
        """Test admin audition deletion"""
        self.current_token = self.admin_token
        
        success, response = self.run_test(
            f"Admin Delete Audition",
            "DELETE",
            f"admin/auditions/{self.submission_id}",
            200
        )
        
        return success

    def test_public_audition_endpoints_401(self):
        """Test that public audition endpoints return 401"""
        self.current_token = None  # No token
        
        # Test INIT
        success1, _ = self.run_test(
            "Public Audition Init (Should be 401)",
            "POST",
            "public/audition/upload/init",
            401
        )
        
        # Test CHUNK
        success2, _ = self.run_test(
            "Public Audition Chunk (Should be 401)",
            "POST",
            "public/audition/upload/chunk",
            401
        )
        
        # Test COMPLETE
        success3, _ = self.run_test(
            "Public Audition Complete (Should be 401)",
            "POST",
            "public/audition/upload/complete",
            401
        )
        
        return success1 and success2 and success3

    def test_tts_voices(self):
        """Test GET /api/tts/voices returns non-empty list"""
        self.current_token = None  # No auth required for voices list
        
        success, response = self.run_test(
            "TTS Voices List",
            "GET",
            "tts/voices",
            200
        )
        
        if success:
            voices = response.get('voices', [])
            print(f"   🎤 Found {len(voices)} voices")
            if voices:
                print(f"   🎵 Available voices: {', '.join(voices[:3])}{'...' if len(voices) > 3 else ''}")
                return len(voices) > 0
            else:
                print(f"   ❌ No voices found in response")
                return False
        return False

    def test_tts_speak(self):
        """Test POST /api/tts/speak with short text returns 200 and audio_url null"""
        # Need to be authenticated for TTS speak
        self.current_token = self.host_token if self.host_token else self.admin_token
        
        data = {
            "text": "Hello, this is a test message for TTS.",
            "voice": "Fritz-PlayAI",
            "format": "wav"
        }
        
        success, response = self.run_test(
            "TTS Speak (Placeholder)",
            "POST",
            "tts/speak",
            200,
            data=data
        )
        
        if success:
            audio_url = response.get('audio_url')
            text = response.get('text')
            voice = response.get('voice')
            
            print(f"   🎤 Voice used: {voice}")
            print(f"   📝 Text returned: {text}")
            print(f"   🔗 Audio URL: {audio_url}")
            
            # Verify audio_url is null (placeholder implementation)
            if audio_url is None:
                print(f"   ✅ Audio URL is null as expected (placeholder)")
                return True
            else:
                print(f"   ❌ Expected audio_url to be null, got: {audio_url}")
                return False
        return False

def main():
    print("🎯 FOCUSED API TESTS - Admin Login + Audition Auth-Only + TTS")
    print("=" * 70)
    
    tester = FocusedAPITester()
    failed_tests = []
    
    # 1. ADMIN SEEDING + LOGIN
    print("\n" + "="*50)
    print("🔐 1. ADMIN SEEDING + LOGIN")
    print("="*50)
    
    admin_login_success = tester.test_admin_login()
    if not admin_login_success:
        failed_tests.append("Admin Login (Admin/admin333)")
        print("❌ Admin login failed - this will affect audition admin tests")
    
    # 2. AUDITION AUTH-ONLY FLOW
    print("\n" + "="*50)
    print("🎬 2. AUDITION AUTH-ONLY FLOW")
    print("="*50)
    
    # Register a host and login
    host_success, host_bigo_id = tester.test_register_host()
    if not host_success:
        failed_tests.append("Host Registration")
        print("❌ Host registration failed - cannot test audition flow")
    else:
        # Test audition upload flow
        if not tester.test_audition_upload_init():
            failed_tests.append("Audition Upload Init")
            print("❌ Upload init failed - skipping remaining audition tests")
        else:
            # Upload chunks
            chunk_success = True
            for chunk_idx in [0, 1]:
                if not tester.test_audition_upload_chunk(chunk_idx):
                    failed_tests.append(f"Audition Upload Chunk {chunk_idx}")
                    chunk_success = False
            
            if chunk_success:
                # Complete upload
                if not tester.test_audition_upload_complete():
                    failed_tests.append("Audition Upload Complete")
                else:
                    # Test admin functions if admin login worked
                    if admin_login_success:
                        if not tester.test_admin_list_auditions():
                            failed_tests.append("Admin List Auditions (includes submission)")
                        
                        if not tester.test_admin_stream_video():
                            failed_tests.append("Admin Stream Video")
                        
                        if not tester.test_admin_delete_audition():
                            failed_tests.append("Admin Delete Audition")
        
        # Test public endpoints return 401
        if not tester.test_public_audition_endpoints_401():
            failed_tests.append("Public Audition Endpoints Return 401")
    
    # 3. TTS ENDPOINTS
    print("\n" + "="*50)
    print("🎤 3. TTS ENDPOINTS")
    print("="*50)
    
    if not tester.test_tts_voices():
        failed_tests.append("TTS Voices List (non-empty)")
    
    if not tester.test_tts_speak():
        failed_tests.append("TTS Speak (returns 200, audio_url null)")
    
    # FINAL RESULTS
    print("\n" + "="*70)
    print("📊 FOCUSED TEST RESULTS")
    print("="*70)
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
        print("\n🎉 ALL FOCUSED TESTS PASSED!")
        return 0

if __name__ == "__main__":
    sys.exit(main())