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

    def test_register(self, bigo_id, password, name, passcode=None):
        """Test user registration"""
        data = {
            "bigo_id": bigo_id,
            "password": password,
            "name": name,
            "email": f"{bigo_id}@test.com",
            "timezone": "UTC"
        }
        if passcode:
            data["passcode"] = passcode
            
        success, response = self.run_test(
            f"Register User ({bigo_id})",
            "POST",
            "auth/register",
            200,
            data=data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"   🔑 Token obtained for {bigo_id}")
            print(f"   👤 User ID: {self.user_data.get('id')}")
            print(f"   🎮 Discord Access: {self.user_data.get('discord_access')}")
            return True
        return False

    def test_login(self, bigo_id, password):
        """Test user login"""
        success, response = self.run_test(
            f"Login User ({bigo_id})",
            "POST",
            "auth/login",
            200,
            data={"bigo_id": bigo_id, "password": password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"   🔑 Token obtained for {bigo_id}")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            print(f"   👤 User: {response.get('name')} ({response.get('bigo_id')})")
            print(f"   ⭐ Points: {response.get('total_points', 0)}")
            print(f"   🎭 Role: {response.get('role')}")
        
        return success

    def test_get_tasks(self):
        """Test fetching tasks"""
        success, response = self.run_test(
            "Get Tasks",
            "GET",
            "tasks",
            200
        )
        
        if success:
            tasks = response if isinstance(response, list) else []
            print(f"   📋 Found {len(tasks)} tasks")
            for i, task in enumerate(tasks[:3]):  # Show first 3 tasks
                print(f"   Task {i+1}: {task.get('title')} (+{task.get('points')} pts)")
        
        return success, response if success else []

    def test_submit_task(self, task_id, proof_url=None, note=None):
        """Test task submission"""
        data = {}
        if proof_url:
            data["proof_url"] = proof_url
        if note:
            data["note"] = note
            
        success, response = self.run_test(
            f"Submit Task ({task_id[:8]}...)",
            "POST",
            f"tasks/{task_id}/submit",
            200,
            data=data
        )
        
        if success:
            print(f"   📝 Submission ID: {response.get('id', 'N/A')}")
            print(f"   📊 Status: {response.get('status', 'N/A')}")
        
        return success

    def test_get_rewards(self):
        """Test fetching rewards"""
        success, response = self.run_test(
            "Get Rewards",
            "GET",
            "rewards",
            200
        )
        
        if success:
            rewards = response if isinstance(response, list) else []
            print(f"   🎁 Found {len(rewards)} rewards")
            for i, reward in enumerate(rewards[:3]):  # Show first 3 rewards
                print(f"   Reward {i+1}: {reward.get('title')} ({reward.get('cost_points')} pts)")
        
        return success, response if success else []

    def test_redeem_reward(self, reward_id):
        """Test reward redemption"""
        success, response = self.run_test(
            f"Redeem Reward ({reward_id[:8]}...)",
            "POST",
            f"rewards/{reward_id}/redeem",
            200
        )
        
        if success:
            print(f"   🎉 Redemption ID: {response.get('id', 'N/A')}")
            print(f"   📊 Status: {response.get('status', 'N/A')}")
        
        return success

    def test_get_announcements(self):
        """Test fetching announcements"""
        success, response = self.run_test(
            "Get Announcements",
            "GET",
            "announcements",
            200
        )
        
        if success:
            announcements = response if isinstance(response, list) else []
            print(f"   📢 Found {len(announcements)} announcements")
            for i, ann in enumerate(announcements[:3]):  # Show first 3 announcements
                print(f"   Announcement {i+1}: {ann.get('title')}")
        
        return success, response if success else []

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