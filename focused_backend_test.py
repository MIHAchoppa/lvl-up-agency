#!/usr/bin/env python3
"""
Focused Backend Test for Level Up Agency
Focus Areas:
1. Audition uploads via GridFS (init/chunk/complete, stream, delete)
2. Calendar RSVP + attendees
3. Chat channels + DMs auth enforcement
"""

import requests
import sys
import json
import io
from datetime import datetime, timezone, timedelta
import uuid

class FocusedAPITester:
    def __init__(self, base_url="https://host-dashboard-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.host_token = None
        self.admin_user = None
        self.host_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
            if details:
                print(f"   {details}")
        else:
            self.failed_tests.append(test_name)
            print(f"❌ {test_name}")
            if details:
                print(f"   {details}")

    def make_request(self, method, endpoint, token=None, data=None, files=None, params=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        if data and not files:
            headers['Content-Type'] = 'application/json'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers=headers, data=data, files=files, params=params)
                else:
                    response = requests.post(url, headers=headers, json=data, params=params)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                if response.text:
                    response_data = response.json()
            except:
                response_data = {"text": response.text}

            return success, response.status_code, response_data

        except Exception as e:
            return False, 0, {"error": str(e)}

    def setup_users(self):
        """Create admin and host users for testing"""
        print("\n🔧 Setting up test users...")
        
        # Create admin user
        admin_bigo_id = f"admin_{datetime.now().strftime('%H%M%S')}"
        admin_data = {
            "bigo_id": admin_bigo_id,
            "password": "admin123",
            "name": "Test Admin",
            "email": f"{admin_bigo_id}@levelup.com",
            "timezone": "UTC",
            "passcode": "ADMIN2025"
        }
        
        success, status, response = self.make_request("POST", "auth/register", data=admin_data)
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.admin_user = response['user']
            self.log_result("Admin user registration", True, f"Admin ID: {self.admin_user['id']}")
        else:
            self.log_result("Admin user registration", False, f"Status: {status}, Response: {response}")
            return False

        # Create host user
        host_bigo_id = f"host_{datetime.now().strftime('%H%M%S')}"
        host_data = {
            "bigo_id": host_bigo_id,
            "password": "host123",
            "name": "Test Host",
            "email": f"{host_bigo_id}@levelup.com",
            "timezone": "UTC"
        }
        
        success, status, response = self.make_request("POST", "auth/register", data=host_data)
        if success and 'access_token' in response:
            self.host_token = response['access_token']
            self.host_user = response['user']
            self.log_result("Host user registration", True, f"Host ID: {self.host_user['id']}")
        else:
            self.log_result("Host user registration", False, f"Status: {status}, Response: {response}")
            return False

        return True

    def test_audition_upload_flow(self):
        """Test complete audition upload flow via GridFS"""
        print("\n🎬 Testing Audition Upload Flow...")
        
        # Step 1: Initialize upload
        upload_meta = {
            "name": "Jane Doe",
            "bigo_id": "jane_doe_123",
            "email": "jane@example.com",
            "phone": "+1234567890",
            "filename": "test.mp4",
            "content_type": "video/mp4",
            "total_chunks": 2,
            "file_size": 1048576  # 1MB
        }
        
        success, status, response = self.make_request("POST", "public/audition/upload/init", data=upload_meta)
        if not success or 'upload_id' not in response:
            self.log_result("Audition upload init", False, f"Status: {status}, Response: {response}")
            return None
        
        upload_id = response['upload_id']
        submission_id = response['submission_id']
        self.log_result("Audition upload init", True, f"Upload ID: {upload_id}")

        # Step 2: Upload chunks
        chunk_data_1 = b"fake_video_data_chunk_1" * 1000  # Simulate video data
        chunk_data_2 = b"fake_video_data_chunk_2" * 1000
        
        # Upload chunk 0
        files = {'chunk': ('chunk_0.part', io.BytesIO(chunk_data_1), 'application/octet-stream')}
        params = {'upload_id': upload_id, 'chunk_index': 0}
        success, status, response = self.make_request("POST", "public/audition/upload/chunk", 
                                                    files=files, params=params)
        self.log_result("Upload chunk 0", success, f"Status: {status}")

        # Upload chunk 1
        files = {'chunk': ('chunk_1.part', io.BytesIO(chunk_data_2), 'application/octet-stream')}
        params = {'upload_id': upload_id, 'chunk_index': 1}
        success, status, response = self.make_request("POST", "public/audition/upload/chunk", 
                                                    files=files, params=params)
        self.log_result("Upload chunk 1", success, f"Status: {status}")

        # Step 3: Complete upload
        params = {'upload_id': upload_id}
        success, status, response = self.make_request("POST", "public/audition/upload/complete", 
                                                    params=params)
        self.log_result("Complete upload", success, f"Status: {status}")

        return submission_id if success else None

    def test_admin_audition_management(self, submission_id):
        """Test admin audition management endpoints"""
        print("\n👨‍💼 Testing Admin Audition Management...")
        
        if not submission_id:
            self.log_result("Admin audition tests", False, "No submission ID available")
            return

        # Test admin token requirement
        success, status, response = self.make_request("GET", "admin/auditions", expected_status=401)
        self.log_result("Admin auditions requires auth", success, "Correctly rejected unauthenticated request")

        # Test list auditions with admin token
        success, status, response = self.make_request("GET", "admin/auditions", token=self.admin_token)
        if success and isinstance(response, list):
            self.log_result("List auditions (admin)", True, f"Found {len(response)} auditions")
        else:
            self.log_result("List auditions (admin)", False, f"Status: {status}, Response: {response}")

        # Test stream video
        success, status, response = self.make_request("GET", f"admin/auditions/{submission_id}/video", 
                                                    token=self.admin_token)
        if success or status == 200:
            self.log_result("Stream audition video", True, "Video streaming endpoint accessible")
        else:
            self.log_result("Stream audition video", False, f"Status: {status}")

        # Test delete audition
        success, status, response = self.make_request("DELETE", f"admin/auditions/{submission_id}", 
                                                    token=self.admin_token)
        self.log_result("Delete audition", success, f"Status: {status}")

    def test_calendar_rsvp_flow(self):
        """Test calendar RSVP and attendees functionality"""
        print("\n📅 Testing Calendar RSVP Flow...")
        
        # Create an event
        event_data = {
            "title": "Test Agency Meeting",
            "description": "Testing RSVP functionality",
            "event_type": "agency",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=1, hours=2)).isoformat(),
            "timezone_display": "PST",
            "signup_form_link": "https://example.com/event123"
        }
        
        success, status, response = self.make_request("POST", "events", token=self.host_token, data=event_data)
        if not success or 'id' not in response:
            self.log_result("Create event", False, f"Status: {status}, Response: {response}")
            return None
        
        event_id = response['id']
        self.log_result("Create event", True, f"Event ID: {event_id}")

        # Test RSVP to event
        rsvp_data = {"status": "going"}
        success, status, response = self.make_request("POST", f"events/{event_id}/rsvp", 
                                                    token=self.host_token, data=rsvp_data)
        self.log_result("RSVP to event", success, f"Status: {status}")

        # Test get attendees
        success, status, response = self.make_request("GET", f"events/{event_id}/attendees", 
                                                    token=self.host_token)
        if success and isinstance(response, list):
            # Check if current user appears in attendees
            user_found = any(att.get('user', {}).get('id') == self.host_user['id'] for att in response)
            self.log_result("Get event attendees", True, 
                          f"Found {len(response)} attendees, current user present: {user_found}")
        else:
            self.log_result("Get event attendees", False, f"Status: {status}, Response: {response}")

        return event_id

    def test_chat_functionality(self):
        """Test chat channels and DM functionality"""
        print("\n💬 Testing Chat Functionality...")
        
        # Initialize default channel (admin only)
        success, status, response = self.make_request("POST", "chat/channels/init-default", 
                                                    token=self.admin_token)
        self.log_result("Initialize default channel", success, f"Status: {status}")

        # List channels with host token
        success, status, response = self.make_request("GET", "chat/channels", token=self.host_token)
        if success and isinstance(response, list):
            channels = response
            self.log_result("List channels (host)", True, f"Found {len(channels)} channels")
            
            # Find agency-lounge channel
            agency_channel = None
            for channel in channels:
                if channel.get('name') == 'agency-lounge':
                    agency_channel = channel
                    break
            
            if agency_channel:
                channel_id = agency_channel['id']
                self.log_result("Find agency-lounge channel", True, f"Channel ID: {channel_id}")
                
                # Post message to channel
                message_data = {"body": "Test message from automated test"}
                success, status, response = self.make_request("POST", f"chat/channels/{channel_id}/messages", 
                                                            token=self.host_token, data=message_data)
                self.log_result("Post message to channel", success, f"Status: {status}")
                
                # List messages from channel
                success, status, response = self.make_request("GET", f"chat/channels/{channel_id}/messages", 
                                                            token=self.host_token)
                if success and isinstance(response, list):
                    self.log_result("List channel messages", True, f"Found {len(response)} messages")
                else:
                    self.log_result("List channel messages", False, f"Status: {status}")
            else:
                self.log_result("Find agency-lounge channel", False, "Channel not found")
        else:
            self.log_result("List channels (host)", False, f"Status: {status}, Response: {response}")

        # Test guest access (should fail - but guests can't auth anyway)
        success, status, response = self.make_request("GET", "chat/channels", expected_status=401)
        self.log_result("Guest chat access blocked", success, "Correctly requires authentication")

    def test_public_endpoints(self):
        """Test public endpoints that don't require authentication"""
        print("\n🌐 Testing Public Endpoints...")
        
        # Test public stats
        success, status, response = self.make_request("GET", "public/stats")
        if success and isinstance(response, dict):
            self.log_result("Public stats", True, f"Stats keys: {list(response.keys())}")
        else:
            self.log_result("Public stats", False, f"Status: {status}")

        # Test SEO summary
        success, status, response = self.make_request("GET", "public/seo/summary")
        if success and isinstance(response, dict):
            self.log_result("SEO summary", True, f"SEO keys: {list(response.keys())}")
        else:
            self.log_result("SEO summary", False, f"Status: {status}")

    def run_all_tests(self):
        """Run all focused tests"""
        print("🚀 Starting Focused Backend Tests")
        print("=" * 60)
        
        # Setup users
        if not self.setup_users():
            print("❌ Failed to setup test users, aborting tests")
            return False

        # Test public endpoints
        self.test_public_endpoints()

        # Test audition upload flow
        submission_id = self.test_audition_upload_flow()
        
        # Test admin audition management
        self.test_admin_audition_management(submission_id)
        
        # Test calendar RSVP
        event_id = self.test_calendar_rsvp_flow()
        
        # Test chat functionality
        self.test_chat_functionality()

        # Print results
        print("\n" + "=" * 60)
        print(f"📊 FINAL RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests ({len(self.failed_tests)}):")
            for test in self.failed_tests:
                print(f"   - {test}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {len(self.failed_tests)} tests failed")
            return False

def main():
    """Main test runner"""
    tester = FocusedAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())