import requests
import sys
import json
import io
from datetime import datetime

class RunCycle3Tester:
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
        self.event_id = None

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
        """Test admin login with Admin/admin333"""
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
            user_data = response.get('user', {})
            print(f"   🔑 Admin token obtained")
            print(f"   👤 Admin ID: {user_data.get('id')}")
            print(f"   🎭 Role: {user_data.get('role')}")
            return True
        return False

    def test_demo_host_login(self):
        """Test demo host login with demo_host_005233/host123"""
        data = {
            "bigo_id": "demo_host_005233",
            "password": "host123"
        }
        
        success, response = self.run_test(
            "Demo Host Login (demo_host_005233/host123)",
            "POST",
            "auth/login",
            200,
            data=data
        )
        
        if success and 'access_token' in response:
            self.host_token = response['access_token']
            user_data = response.get('user', {})
            print(f"   🔑 Host token obtained")
            print(f"   👤 Host ID: {user_data.get('id')}")
            print(f"   🎭 Role: {user_data.get('role')}")
            return True
        return False

    def test_audition_init(self):
        """Test audition upload init as host"""
        self.current_token = self.host_token
        data = {
            "filename": "test_audition.mp4",
            "content_type": "video/mp4",
            "total_chunks": 2,
            "file_size": 1048576
        }
        
        success, response = self.run_test(
            "Audition Upload Init (Host)",
            "POST",
            "audition/upload/init",
            200,
            data=data
        )
        
        if success and 'upload_id' in response:
            self.upload_id = response['upload_id']
            self.submission_id = response['submission_id']
            print(f"   📤 Upload ID: {self.upload_id}")
            print(f"   📝 Submission ID: {self.submission_id}")
            return True
        return False

    def test_audition_chunk(self, chunk_index):
        """Test audition chunk upload"""
        self.current_token = self.host_token
        
        # Create a small test file
        test_data = b"test video chunk data " * 100  # Small test data
        files = {'chunk': ('chunk.mp4', io.BytesIO(test_data), 'video/mp4')}
        params = {
            'upload_id': self.upload_id,
            'chunk_index': chunk_index
        }
        
        success, response = self.run_test(
            f"Audition Upload Chunk {chunk_index} (Host)",
            "POST",
            "audition/upload/chunk",
            200,
            files=files,
            params=params
        )
        
        return success

    def test_audition_complete(self):
        """Test audition upload complete"""
        self.current_token = self.host_token
        params = {'upload_id': self.upload_id}
        
        success, response = self.run_test(
            "Audition Upload Complete (Host)",
            "POST",
            "audition/upload/complete",
            200,
            params=params
        )
        
        return success

    def test_admin_list_auditions(self):
        """Test admin list auditions"""
        self.current_token = self.admin_token
        
        success, response = self.run_test(
            "Admin List Auditions",
            "GET",
            "admin/auditions",
            200
        )
        
        if success:
            auditions = response if isinstance(response, list) else []
            print(f"   📋 Found {len(auditions)} auditions")
        return success

    def test_admin_stream_video(self):
        """Test admin stream video"""
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
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text}")
            
            return success
            
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_admin_delete_audition(self):
        """Test admin delete audition"""
        self.current_token = self.admin_token
        
        success, response = self.run_test(
            "Admin Delete Audition",
            "DELETE",
            f"admin/auditions/{self.submission_id}",
            200
        )
        
        return success

    def test_create_event_admin(self):
        """Test create event as admin"""
        self.current_token = self.admin_token
        data = {
            "title": "Test Event by Admin",
            "description": "Test event created by admin",
            "event_type": "agency",
            "start_time": "2025-02-01T18:00:00Z",
            "signup_form_link": "https://example.com/signup"
        }
        
        success, response = self.run_test(
            "Create Event (Admin)",
            "POST",
            "events",
            200,
            data=data
        )
        
        if success and 'id' in response:
            self.event_id = response['id']
            print(f"   📅 Event ID: {self.event_id}")
            return True
        return False

    def test_rsvp_as_host(self):
        """Test RSVP as host"""
        self.current_token = self.host_token
        data = {"status": "going"}
        
        success, response = self.run_test(
            "RSVP Event (Host)",
            "POST",
            f"events/{self.event_id}/rsvp",
            200,
            data=data
        )
        
        return success

    def test_get_attendees(self):
        """Test get attendees"""
        self.current_token = self.host_token
        
        success, response = self.run_test(
            "Get Event Attendees",
            "GET",
            f"events/{self.event_id}/attendees",
            200
        )
        
        if success:
            attendees = response if isinstance(response, list) else []
            print(f"   👥 Found {len(attendees)} attendees")
        return success

    def test_ai_chat_host_no_research(self):
        """Test AI chat as host with use_research=false (should return 200)"""
        self.current_token = self.host_token
        data = {
            "message": "Hello, can you help me with BIGO Live streaming tips?",
            "use_research": False
        }
        
        success, response = self.run_test(
            "AI Chat Host (use_research=false) - Should Return 200",
            "POST",
            "ai/chat",
            200,
            data=data
        )
        
        return success

    def test_ai_chat_host_with_research(self):
        """Test AI chat as host with use_research=true (should return 403)"""
        self.current_token = self.host_token
        data = {
            "message": "Hello, can you help me with BIGO Live streaming tips?",
            "use_research": True
        }
        
        success, response = self.run_test(
            "AI Chat Host (use_research=true) - Should Return 403",
            "POST",
            "ai/chat",
            403,
            data=data
        )
        
        return success

    def test_ai_chat_admin_with_research(self):
        """Test AI chat as admin with use_research=true (should return 200)"""
        self.current_token = self.admin_token
        data = {
            "message": "Hello, can you help me with BIGO Live streaming tips?",
            "use_research": True
        }
        
        success, response = self.run_test(
            "AI Chat Admin (use_research=true) - Should Return 200",
            "POST",
            "ai/chat",
            200,
            data=data
        )
        
        return success

    def test_tts_voices(self):
        """Test GET /api/tts/voices"""
        self.current_token = self.host_token
        
        success, response = self.run_test(
            "TTS Get Voices",
            "GET",
            "tts/voices",
            200
        )
        
        if success and 'voices' in response:
            voices = response['voices']
            print(f"   🎤 Found {len(voices)} voices: {voices}")
        return success

    def test_tts_speak(self):
        """Test POST /api/tts/speak with short text"""
        self.current_token = self.host_token
        data = {
            "text": "Hello, this is a test message for TTS.",
            "voice": "Fritz-PlayAI",
            "format": "wav"
        }
        
        success, response = self.run_test(
            "TTS Speak",
            "POST",
            "tts/speak",
            200,
            data=data
        )
        
        if success:
            print(f"   🎤 TTS Response: audio_url={response.get('audio_url')}, text={response.get('text')[:50]}...")
        return success

    def test_stt_webm(self):
        """Test POST /api/stt with tiny webm blob"""
        self.current_token = self.host_token
        
        # Create a tiny fake webm blob
        fake_webm_data = b"webm_fake_audio_data" * 10
        files = {'audio': ('test.webm', io.BytesIO(fake_webm_data), 'audio/webm')}
        
        success, response = self.run_test(
            "STT with WebM Blob",
            "POST",
            "stt",
            200,
            files=files
        )
        
        return success

    def test_recruitment_search_host_403(self):
        """Test /api/recruitment/search as host (should return 403)"""
        self.current_token = self.host_token
        data = {
            "platform": "instagram",
            "keywords": ["lifestyle", "entertainment"],
            "min_followers": 5000
        }
        
        success, response = self.run_test(
            "Recruitment Search (Host) - Should Return 403",
            "POST",
            "recruitment/search",
            403,
            data=data
        )
        
        return success

def main():
    print("🚀 Starting Run Cycle 3 Backend Smoke Tests")
    print("=" * 60)
    
    tester = RunCycle3Tester()
    failed_tests = []
    
    # 1) AUTH TESTS
    print("\n" + "="*50)
    print("🔐 1) AUTH TESTS")
    print("="*50)
    
    admin_login_success = tester.test_admin_login()
    if not admin_login_success:
        failed_tests.append("Admin Login (Admin/admin333)")
    
    host_login_success = tester.test_demo_host_login()
    if not host_login_success:
        failed_tests.append("Demo Host Login (demo_host_005233/host123)")
    
    # 2) AUDITIONS TESTS
    print("\n" + "="*50)
    print("🎬 2) AUDITIONS TESTS")
    print("="*50)
    
    if host_login_success:
        audition_init_success = tester.test_audition_init()
        if not audition_init_success:
            failed_tests.append("Audition Init")
        else:
            # Upload 2 chunks
            chunk_0_success = tester.test_audition_chunk(0)
            if not chunk_0_success:
                failed_tests.append("Audition Chunk 0")
            
            chunk_1_success = tester.test_audition_chunk(1)
            if not chunk_1_success:
                failed_tests.append("Audition Chunk 1")
            
            if chunk_0_success and chunk_1_success:
                complete_success = tester.test_audition_complete()
                if not complete_success:
                    failed_tests.append("Audition Complete")
                
                # Admin functions
                if admin_login_success and complete_success:
                    if not tester.test_admin_list_auditions():
                        failed_tests.append("Admin List Auditions")
                    
                    if not tester.test_admin_stream_video():
                        failed_tests.append("Admin Stream Video")
                    
                    if not tester.test_admin_delete_audition():
                        failed_tests.append("Admin Delete Audition")
    
    # 3) EVENTS TESTS
    print("\n" + "="*50)
    print("📅 3) EVENTS TESTS")
    print("="*50)
    
    if admin_login_success:
        event_create_success = tester.test_create_event_admin()
        if not event_create_success:
            failed_tests.append("Create Event (Admin)")
        else:
            if host_login_success:
                if not tester.test_rsvp_as_host():
                    failed_tests.append("RSVP as Host")
                
                if not tester.test_get_attendees():
                    failed_tests.append("Get Attendees")
    
    # 4) CHAT TESTS
    print("\n" + "="*50)
    print("💬 4) CHAT TESTS")
    print("="*50)
    
    if host_login_success:
        if not tester.test_ai_chat_host_no_research():
            failed_tests.append("AI Chat Host (use_research=false)")
        
        if not tester.test_ai_chat_host_with_research():
            failed_tests.append("AI Chat Host (use_research=true) - Should 403")
    
    if admin_login_success:
        if not tester.test_ai_chat_admin_with_research():
            failed_tests.append("AI Chat Admin (use_research=true)")
    
    # 5) TTS TESTS
    print("\n" + "="*50)
    print("🎤 5) TTS TESTS")
    print("="*50)
    
    if host_login_success:
        if not tester.test_tts_voices():
            failed_tests.append("TTS Get Voices")
        
        if not tester.test_tts_speak():
            failed_tests.append("TTS Speak")
    
    # 6) STT TESTS
    print("\n" + "="*50)
    print("🎙️ 6) STT TESTS")
    print("="*50)
    
    if host_login_success:
        if not tester.test_stt_webm():
            failed_tests.append("STT WebM")
    
    # 7) ADMIN-ONLY GATES
    print("\n" + "="*50)
    print("🔒 7) ADMIN-ONLY GATES")
    print("="*50)
    
    if host_login_success:
        if not tester.test_recruitment_search_host_403():
            failed_tests.append("Recruitment Search Host (Should 403)")
    
    # FINAL RESULTS
    print("\n" + "="*60)
    print("📊 FINAL RESULTS")
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
        print("\n🎉 ALL TESTS PASSED!")
        return 0

if __name__ == "__main__":
    sys.exit(main())