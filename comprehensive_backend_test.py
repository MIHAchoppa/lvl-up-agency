import requests
import sys
import json
from datetime import datetime
import time

class ComprehensiveLevelUpTester:
    def __init__(self, base_url="https://bugzapper-beans.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

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

    def test_demo_login(self):
        """Test login with demo credentials"""
        success, response = self.run_test(
            "Demo Login (demo/demo123)",
            "POST",
            "auth/login",
            200,
            data={"bigo_id": "demo", "password": "demo123"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"   🔑 Demo user logged in successfully")
            print(f"   👤 User: {self.user_data.get('name')} ({self.user_data.get('bigo_id')})")
            print(f"   ⭐ Points: {self.user_data.get('total_points', 0)}")
            print(f"   🎭 Role: {self.user_data.get('role')}")
            print(f"   🎮 Discord Access: {self.user_data.get('discord_access')}")
            return True
        return False

    def test_ai_chat(self):
        """Test AI BIGO Coach with different modes"""
        ai_modes = [
            ("general", "How can I win more PK battles on BIGO Live?"),
            ("content_ideas", "Give me 3 creative content ideas for BIGO Live streaming"),
            ("flyer", "Create a flyer for a PK battle event tonight"),
            ("math", "Calculate my earnings if I get 1000 diamonds at 50% commission"),
            ("quota", "Help me set a realistic weekly quota for BIGO Live")
        ]
        
        print(f"\n🤖 TESTING AI BIGO COACH - {len(ai_modes)} MODES")
        
        for mode, message in ai_modes:
            success, response = self.run_test(
                f"AI Chat - {mode.title()} Mode",
                "POST",
                "ai/chat",
                200,
                data={"message": message, "chat_type": mode}
            )
            
            if success:
                ai_response = response.get('response', '')
                print(f"   🎯 Mode: {mode}")
                print(f"   💬 Question: {message}")
                print(f"   🤖 AI Response: {ai_response[:100]}...")
                print(f"   📊 Response Length: {len(ai_response)} characters")
                
                # Check if response contains BIGO-specific content
                bigo_keywords = ['bigo', 'pk', 'gift', 'diamond', 'host', 'stream', 'live']
                has_bigo_content = any(keyword.lower() in ai_response.lower() for keyword in bigo_keywords)
                if has_bigo_content:
                    print(f"   ✅ Response contains BIGO-specific content")
                else:
                    print(f"   ⚠️  Response may not be BIGO-specific")
            
            # Add small delay between AI requests
            time.sleep(1)
        
        return True

    def test_quizzes(self):
        """Test BIGO Live quiz system"""
        print(f"\n📚 TESTING BIGO QUIZZES")
        
        # Get available quizzes
        success, quizzes = self.run_test(
            "Get BIGO Quizzes",
            "GET",
            "quizzes",
            200
        )
        
        if not success:
            return False
            
        print(f"   📋 Found {len(quizzes)} quizzes")
        
        # Check for expected BIGO quizzes
        expected_quiz_titles = ["BIGO Live Basics", "PK Battle Mastery", "Gift Maximization"]
        found_titles = [quiz.get('title', '') for quiz in quizzes]
        
        for expected_title in expected_quiz_titles:
            if any(expected_title.lower() in title.lower() for title in found_titles):
                print(f"   ✅ Found expected quiz: {expected_title}")
            else:
                print(f"   ⚠️  Missing expected quiz: {expected_title}")
        
        # Test quiz questions and attempt
        if len(quizzes) > 0:
            first_quiz = quizzes[0]
            quiz_id = first_quiz.get('id')
            
            # Get quiz questions
            success, questions = self.run_test(
                f"Get Quiz Questions ({first_quiz.get('title')})",
                "GET",
                f"quizzes/{quiz_id}/questions",
                200
            )
            
            if success and len(questions) > 0:
                print(f"   ❓ Quiz has {len(questions)} questions")
                
                # Attempt quiz with random answers
                answers = [0] * len(questions)  # All first options
                success, attempt_result = self.run_test(
                    f"Attempt Quiz ({first_quiz.get('title')})",
                    "POST",
                    f"quizzes/{quiz_id}/attempt",
                    200,
                    data=answers
                )
                
                if success:
                    attempt = attempt_result.get('attempt', {})
                    print(f"   📊 Score: {attempt.get('score', 0)}%")
                    print(f"   🎯 Passed: {attempt.get('passed', False)}")
                    print(f"   ⭐ Points Earned: {first_quiz.get('points', 0) if attempt.get('passed') else 0}")
        
        return True

    def test_events_calendar(self):
        """Test Events & Calendar system"""
        print(f"\n📅 TESTING EVENTS & CALENDAR")
        
        # Get all events
        success, events = self.run_test(
            "Get All Events",
            "GET",
            "events",
            200
        )
        
        if success:
            print(f"   🎪 Found {len(events)} events")
            
            # Check for different event types
            event_types = {}
            for event in events:
                event_type = event.get('event_type', 'unknown')
                event_types[event_type] = event_types.get(event_type, 0) + 1
                
                # Show event details
                print(f"   📋 Event: {event.get('title')} ({event_type})")
                if event.get('flyer_url'):
                    print(f"      🖼️  Has flyer: {event.get('flyer_url')}")
                if event.get('bigo_live_link'):
                    print(f"      🔗 BIGO Link: {event.get('bigo_live_link')}")
                if event.get('signup_form_link'):
                    print(f"      📝 Signup Form: {event.get('signup_form_link')}")
            
            print(f"   📊 Event Types: {event_types}")
            
            # Check for expected event types
            expected_types = ['pk', 'community', 'agency']
            for expected_type in expected_types:
                if expected_type in event_types:
                    print(f"   ✅ Found {expected_type} events: {event_types[expected_type]}")
                else:
                    print(f"   ⚠️  No {expected_type} events found")
        
        # Test personal events
        success, personal_events = self.run_test(
            "Get Personal Events",
            "GET",
            "events/personal",
            200
        )
        
        if success:
            print(f"   👤 Personal events: {len(personal_events)}")
        
        return True

    def test_admin_panel(self):
        """Test Admin Panel functionality"""
        print(f"\n⚙️ TESTING ADMIN PANEL")
        
        # Test admin dashboard
        success, dashboard = self.run_test(
            "Admin Dashboard Stats",
            "GET",
            "admin/dashboard",
            200
        )
        
        if success:
            print(f"   👥 Total Users: {dashboard.get('total_users', 0)}")
            print(f"   👑 Total Hosts: {dashboard.get('total_hosts', 0)}")
            print(f"   📊 Active Users (7d): {dashboard.get('active_users_7d', 0)}")
            print(f"   ⏳ Pending Submissions: {dashboard.get('pending_submissions', 0)}")
            print(f"   🎁 Pending Redemptions: {dashboard.get('pending_redemptions', 0)}")
            print(f"   ⭐ Points Issued: {dashboard.get('total_points_issued', 0)}")
            print(f"   💰 Points Redeemed: {dashboard.get('total_points_redeemed', 0)}")
        
        # Test admin users list
        success, users = self.run_test(
            "Admin - Get All Users",
            "GET",
            "admin/users",
            200
        )
        
        if success:
            print(f"   👥 Admin can see {len(users)} users")
        
        # Test admin submissions
        success, submissions = self.run_test(
            "Admin - Get All Submissions",
            "GET",
            "admin/submissions",
            200
        )
        
        if success:
            print(f"   📝 Admin can see {len(submissions)} submissions")
        
        # Test admin redemptions
        success, redemptions = self.run_test(
            "Admin - Get All Redemptions",
            "GET",
            "admin/redemptions",
            200
        )
        
        if success:
            print(f"   🎁 Admin can see {len(redemptions)} redemptions")
        
        return True

    def test_quota_system(self):
        """Test Quota Tracking System"""
        print(f"\n📈 TESTING QUOTA SYSTEM")
        
        # Get current quotas
        success, quotas = self.run_test(
            "Get Quota Targets",
            "GET",
            "quotas",
            200
        )
        
        if success:
            print(f"   🎯 Found {len(quotas)} quota targets")
            for quota in quotas:
                print(f"   📊 {quota.get('target_type')} target: ${quota.get('target_amount', 0)}")
                print(f"      Progress: ${quota.get('current_progress', 0)}")
                print(f"      Bonus Rate: {quota.get('bonus_rate', 0)}%")
        
        # Create a test quota
        test_quota_data = {
            "target_type": "weekly",
            "target_amount": 500.0,
            "bonus_rate": 10.0,
            "cash_out_threshold": 100.0
        }
        
        success, new_quota = self.run_test(
            "Create Quota Target",
            "POST",
            "quotas",
            200,
            data=test_quota_data
        )
        
        if success:
            print(f"   ✅ Created quota target: {new_quota.get('id')}")
            
            # Update quota progress
            quota_id = new_quota.get('id')
            if quota_id:
                success, update_result = self.run_test(
                    "Update Quota Progress",
                    "PUT",
                    f"quotas/{quota_id}/progress",
                    200,
                    data={"current_progress": 150.0}
                )
                
                if success:
                    print(f"   📈 Updated quota progress to $150")
        
        return True

    def test_private_messaging(self):
        """Test Private Messaging System"""
        print(f"\n💬 TESTING PRIVATE MESSAGING")
        
        # Get existing messages
        success, messages = self.run_test(
            "Get Messages",
            "GET",
            "messages",
            200
        )
        
        if success:
            print(f"   📨 Found {len(messages)} messages")
            for msg in messages[:3]:  # Show first 3 messages
                print(f"   💬 Message: {msg.get('message', '')[:50]}...")
                print(f"      Status: {msg.get('status')}")
        
        return True

def main():
    print("🚀 Starting Comprehensive Level Up Agency Tests")
    print("Testing all new BIGO Live platform features")
    print("=" * 60)
    
    tester = ComprehensiveLevelUpTester()
    
    # Test demo login first
    print("\n🔑 TESTING DEMO LOGIN")
    if not tester.test_demo_login():
        print("❌ Demo login failed - cannot continue with authenticated tests")
        return 1
    
    # Test all new features
    print(f"\n👤 Demo user has {tester.user_data.get('total_points', 0)} points and role: {tester.user_data.get('role')}")
    
    # Test AI BIGO Coach
    tester.test_ai_chat()
    
    # Test Quiz System
    tester.test_quizzes()
    
    # Test Events & Calendar
    tester.test_events_calendar()
    
    # Test Admin Panel (if user has admin access)
    if tester.user_data.get('role') in ['owner', 'admin']:
        tester.test_admin_panel()
    else:
        print(f"\n⚠️  Skipping Admin Panel tests - user role is '{tester.user_data.get('role')}', not admin")
    
    # Test Quota System
    tester.test_quota_system()
    
    # Test Private Messaging
    tester.test_private_messaging()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 COMPREHENSIVE TEST RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All comprehensive tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())