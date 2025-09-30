import requests
import sys
import json
import io
from datetime import datetime

class LevelUpAPITester:
    def __init__(self, base_url="https://host-dashboard-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.host_token = None
        self.current_token = None
        self.admin_user_data = None
        self.host_user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.upload_id = None
        self.submission_id = None
        self.event_id = None
        self.channel_id = None

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

    def test_register_admin(self):
        """Test admin registration with ADMIN2025 passcode"""
        admin_bigo_id = f"admin_{datetime.now().strftime('%H%M%S')}"
        data = {
            "bigo_id": admin_bigo_id,
            "password": "adminpass123",
            "name": "Test Admin",
            "email": f"{admin_bigo_id}@test.com",
            "timezone": "UTC",
            "passcode": "ADMIN2025"
        }
        
        success, response = self.run_test(
            "Register Admin User",
            "POST",
            "auth/register",
            200,
            data=data
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.admin_user_data = response['user']
            print(f"   🔑 Admin token obtained")
            print(f"   👤 Admin ID: {self.admin_user_data.get('id')}")
            print(f"   🎭 Role: {self.admin_user_data.get('role')}")
            return True, admin_bigo_id
        return False, None

    def test_register_host(self):
        """Test host registration (no passcode)"""
        host_bigo_id = f"host_{datetime.now().strftime('%H%M%S')}"
        data = {
            "bigo_id": host_bigo_id,
            "password": "hostpass123",
            "name": "Test Host",
            "email": f"{host_bigo_id}@test.com",
            "timezone": "UTC"
        }
        
        success, response = self.run_test(
            "Register Host User",
            "POST",
            "auth/register",
            200,
            data=data
        )
        
        if success and 'access_token' in response:
            self.host_token = response['access_token']
            self.host_user_data = response['user']
            print(f"   🔑 Host token obtained")
            print(f"   👤 Host ID: {self.host_user_data.get('id')}")
            print(f"   🎭 Role: {self.host_user_data.get('role')}")
            return True, host_bigo_id
        return False, None

    def test_audition_upload_init(self):
        """Test audition upload initialization with host token"""
        self.current_token = self.host_token
        data = {
            "filename": "test.mp4",
            "content_type": "video/mp4",
            "total_chunks": 2,
            "file_size": 1048576
        }
        
        success, response = self.run_test(
            "Audition Upload Init",
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

    def test_audition_upload_chunk(self, chunk_index):
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
        """Test admin audition listing"""
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
            if auditions:
                print(f"   📝 Latest submission: {auditions[0].get('name')} - {auditions[0].get('status')}")
        return success

    def test_admin_stream_video(self):
        """Test admin video streaming"""
        self.current_token = self.admin_token
        
        success, response = self.run_test(
            f"Admin Stream Video",
            "GET",
            f"admin/auditions/{self.submission_id}/video",
            200
        )
        
        return success

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

    def test_public_audition_endpoints_unauthorized(self):
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

    def test_create_event(self):
        """Test event creation with host token"""
        self.current_token = self.host_token
        data = {
            "title": "Test Event",
            "description": "Test event description",
            "event_type": "community",
            "start_time": "2025-02-01T18:00:00Z",
            "signup_form_link": "https://example.com/signup"
        }
        
        success, response = self.run_test(
            "Create Event",
            "POST",
            "events",
            200,
            data=data
        )
        
        if success and 'id' in response:
            self.event_id = response['id']
            print(f"   📅 Event ID: {self.event_id}")
            print(f"   🔗 Signup Link: {response.get('signup_form_link')}")
            return True
        return False

    def test_rsvp_event(self):
        """Test RSVP to event"""
        self.current_token = self.host_token
        data = {"status": "going"}
        
        success, response = self.run_test(
            "RSVP to Event",
            "POST",
            f"events/{self.event_id}/rsvp",
            200,
            data=data
        )
        
        return success

    def test_get_attendees(self):
        """Test getting event attendees"""
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
            if attendees:
                print(f"   👤 Host present: {any(att.get('user', {}).get('id') == self.host_user_data.get('id') for att in attendees)}")
        return success

    def test_init_default_chat_channel(self):
        """Test initializing default chat channel (admin only)"""
        self.current_token = self.admin_token
        
        success, response = self.run_test(
            "Init Default Chat Channel",
            "POST",
            "chat/channels/init-default",
            200
        )
        
        return success

    def test_get_chat_channels(self):
        """Test getting chat channels"""
        self.current_token = self.host_token
        
        success, response = self.run_test(
            "Get Chat Channels",
            "GET",
            "chat/channels",
            200
        )
        
        if success:
            channels = response if isinstance(response, list) else []
            print(f"   💬 Found {len(channels)} channels")
            # Find agency-lounge channel
            agency_channel = next((ch for ch in channels if ch.get('name') == 'agency-lounge'), None)
            if agency_channel:
                self.channel_id = agency_channel['id']
                print(f"   🏢 Agency lounge ID: {self.channel_id}")
                return True
        return False

    def test_post_chat_message(self):
        """Test posting a chat message"""
        self.current_token = self.host_token
        data = {"body": "Hello from test!"}
        
        success, response = self.run_test(
            "Post Chat Message",
            "POST",
            f"chat/channels/{self.channel_id}/messages",
            200,
            data=data
        )
        
        return success

    def test_get_chat_messages(self):
        """Test getting chat messages"""
        self.current_token = self.host_token
        
        success, response = self.run_test(
            "Get Chat Messages",
            "GET",
            f"chat/channels/{self.channel_id}/messages",
            200
        )
        
        if success:
            messages = response if isinstance(response, list) else []
            print(f"   💬 Found {len(messages)} messages")
            if messages:
                print(f"   📝 Latest message: {messages[-1].get('body')}")
        return success

def main():
    print("🚀 Starting Level Up Agency API Tests")
    print("=" * 50)
    
    tester = LevelUpAPITester()
    
    # Test user registration with passcode (for Discord access)
    print("\n📝 TESTING REGISTRATION WITH PASSCODE")
    test_user_member = f"testmember_{datetime.now().strftime('%H%M%S')}"
    if not tester.test_register(test_user_member, "password123", "Test Member", "LEVELUP2025"):
        print("❌ Member registration failed, continuing with other tests...")
    
    # Test user registration without passcode
    print("\n📝 TESTING REGISTRATION WITHOUT PASSCODE")
    test_user_host = f"testhost_{datetime.now().strftime('%H%M%S')}"
    if not tester.test_register(test_user_host, "password123", "Test Host"):
        print("❌ Host registration failed, stopping tests")
        return 1
    
    # Test authentication endpoints
    print("\n🔐 TESTING AUTHENTICATION")
    if not tester.test_get_current_user():
        print("❌ Get current user failed")
        return 1
    
    # Test login with the registered user
    print("\n🔑 TESTING LOGIN")
    if not tester.test_login(test_user_host, "password123"):
        print("❌ Login failed")
        return 1
    
    # Test core features
    print("\n📋 TESTING TASKS")
    tasks_success, tasks = tester.test_get_tasks()
    if not tasks_success:
        print("❌ Get tasks failed")
    elif len(tasks) > 0:
        # Try to submit the first task
        first_task = tasks[0]
        task_id = first_task.get('id')
        if task_id:
            tester.test_submit_task(
                task_id, 
                proof_url="https://example.com/proof.jpg" if first_task.get('requires_proof') else None,
                note="Test submission from API test"
            )
    else:
        print("⚠️  No tasks found in database - seeded data may be missing")
    
    print("\n🎁 TESTING REWARDS")
    rewards_success, rewards = tester.test_get_rewards()
    if not rewards_success:
        print("❌ Get rewards failed")
    elif len(rewards) > 0:
        # Find a reward we can afford (or try the cheapest one)
        affordable_reward = None
        for reward in rewards:
            if (tester.user_data.get('total_points', 0) >= reward.get('cost_points', 0)):
                affordable_reward = reward
                break
        
        if affordable_reward:
            tester.test_redeem_reward(affordable_reward['id'])
        else:
            print("⚠️  No affordable rewards found - user has insufficient points")
    else:
        print("⚠️  No rewards found in database - seeded data may be missing")
    
    print("\n📢 TESTING ANNOUNCEMENTS")
    announcements_success, announcements = tester.test_get_announcements()
    if not announcements_success:
        print("❌ Get announcements failed")
    elif len(announcements) == 0:
        print("⚠️  No announcements found in database - seeded data may be missing")
    
    # Test invalid token
    print("\n🔒 TESTING INVALID TOKEN")
    original_token = tester.token
    tester.token = "invalid_token_123"
    tester.run_test("Invalid Token Test", "GET", "auth/me", 401)
    tester.token = original_token
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())