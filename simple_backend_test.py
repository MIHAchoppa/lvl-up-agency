#!/usr/bin/env python3
"""
Simple Backend Test for Level Up Agency - Testing Core Functionality
"""

import requests
import sys
import json
from datetime import datetime, timezone, timedelta

class SimpleAPITester:
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

    def make_request(self, method, endpoint, token=None, data=None, params=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, params=params)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params)

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
            self.log_result("Admin user registration", True, f"Role: {self.admin_user.get('role')}")
        else:
            self.log_result("Admin user registration", False, f"Status: {status}")
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
            self.log_result("Host user registration", True, f"Role: {self.host_user.get('role')}")
        else:
            self.log_result("Host user registration", False, f"Status: {status}")
            return False

        return True

    def test_audition_init_only(self):
        """Test audition upload initialization only"""
        print("\n🎬 Testing Audition Upload Init...")
        
        upload_meta = {
            "name": "Jane Doe",
            "bigo_id": "jane_doe_123",
            "email": "jane@example.com",
            "phone": "+1234567890",
            "filename": "test.mp4",
            "content_type": "video/mp4",
            "total_chunks": 2,
            "file_size": 1048576
        }
        
        success, status, response = self.make_request("POST", "public/audition/upload/init", data=upload_meta)
        if success and 'upload_id' in response and 'submission_id' in response:
            self.log_result("Audition upload init", True, f"Upload ID: {response['upload_id'][:8]}...")
            return response['submission_id']
        else:
            self.log_result("Audition upload init", False, f"Status: {status}")
            return None

    def test_admin_audition_access(self):
        """Test admin audition access"""
        print("\n👨‍💼 Testing Admin Audition Access...")
        
        # Test without auth
        success, status, response = self.make_request("GET", "admin/auditions", expected_status=401)
        self.log_result("Admin auditions requires auth", success, "Correctly blocks unauthenticated access")

        # Test with admin auth
        success, status, response = self.make_request("GET", "admin/auditions", token=self.admin_token)
        if success and isinstance(response, list):
            self.log_result("Admin can list auditions", True, f"Found {len(response)} auditions")
        else:
            self.log_result("Admin can list auditions", False, f"Status: {status}")

    def test_calendar_rsvp_complete(self):
        """Test complete calendar RSVP flow"""
        print("\n📅 Testing Calendar RSVP...")
        
        # Create event
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
            self.log_result("Create event", False, f"Status: {status}")
            return
        
        event_id = response['id']
        self.log_result("Create event", True, f"Event created with signup link")

        # RSVP to event
        rsvp_data = {"status": "going"}
        success, status, response = self.make_request("POST", f"events/{event_id}/rsvp", 
                                                    token=self.host_token, data=rsvp_data)
        self.log_result("RSVP to event", success, f"Status: {status}")

        # Get attendees
        success, status, response = self.make_request("GET", f"events/{event_id}/attendees", 
                                                    token=self.host_token)
        if success and isinstance(response, list):
            user_found = any(att.get('user', {}).get('id') == self.host_user['id'] for att in response)
            self.log_result("Current user in attendees", user_found, f"Found {len(response)} total attendees")
        else:
            self.log_result("Get attendees", False, f"Status: {status}")

    def test_chat_channels(self):
        """Test chat channel functionality"""
        print("\n💬 Testing Chat Channels...")
        
        # Initialize default channel (admin only)
        success, status, response = self.make_request("POST", "chat/channels/init-default", 
                                                    token=self.admin_token)
        self.log_result("Initialize default channel", success, f"Status: {status}")

        # List channels
        success, status, response = self.make_request("GET", "chat/channels", token=self.host_token)
        if success and isinstance(response, list):
            agency_channel = None
            for channel in response:
                if channel.get('name') == 'agency-lounge':
                    agency_channel = channel
                    break
            
            if agency_channel:
                self.log_result("Agency lounge channel exists", True, f"Channel ID: {agency_channel['id'][:8]}...")
                
                # Post message
                message_data = {"body": "Test message from automated test"}
                success, status, response = self.make_request("POST", f"chat/channels/{agency_channel['id']}/messages", 
                                                            token=self.host_token, data=message_data)
                self.log_result("Post message to channel", success, f"Status: {status}")
                
                # List messages
                success, status, response = self.make_request("GET", f"chat/channels/{agency_channel['id']}/messages", 
                                                            token=self.host_token)
                if success and isinstance(response, list):
                    self.log_result("List channel messages", True, f"Found {len(response)} messages")
                else:
                    self.log_result("List channel messages", False, f"Status: {status}")
            else:
                self.log_result("Agency lounge channel exists", False, "Channel not found")
        else:
            self.log_result("List channels", False, f"Status: {status}")

        # Test auth requirement
        success, status, response = self.make_request("GET", "chat/channels", expected_status=401)
        self.log_result("Chat requires authentication", success, "Correctly blocks unauthenticated access")

    def run_tests(self):
        """Run all tests"""
        print("🚀 Starting Simple Backend Tests")
        print("=" * 50)
        
        if not self.setup_users():
            print("❌ Failed to setup users")
            return False

        # Test core functionality
        submission_id = self.test_audition_init_only()
        self.test_admin_audition_access()
        self.test_calendar_rsvp_complete()
        self.test_chat_channels()

        # Results
        print("\n" + "=" * 50)
        print(f"📊 RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for test in self.failed_tests:
                print(f"   - {test}")
        
        return len(self.failed_tests) == 0

def main():
    tester = SimpleAPITester()
    success = tester.run_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())