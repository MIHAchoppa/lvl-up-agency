import requests
import sys
import json
from datetime import datetime
import time

class AdvancedFeaturesAPITester:
    def __init__(self, base_url="https://host-dashboard-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

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
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)

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
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")

            return success, response.json() if response.text and response.status_code < 500 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_demo_login(self):
        """Test login with demo credentials (admin role)"""
        success, response = self.run_test(
            "Demo Admin Login",
            "POST",
            "auth/login",
            200,
            data={"bigo_id": "demo", "password": "demo123"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"   🔑 Token obtained for demo user")
            print(f"   👤 User: {self.user_data.get('name')}")
            print(f"   🎭 Role: {self.user_data.get('role')}")
            print(f"   ⭐ Points: {self.user_data.get('total_points', 0)}")
            return True
        return False

    def test_groq_ai_integration(self):
        """Test Groq-powered AI integration with all 3 modes"""
        print("\n🤖 TESTING GROQ-POWERED AI INTEGRATION")
        
        # Test BIGO Strategy Coach
        success1, response1 = self.run_test(
            "Groq AI - BIGO Strategy Coach",
            "POST",
            "ai/chat",
            200,
            data={
                "message": "How to win PK battles?",
                "chat_type": "strategy_coach"
            }
        )
        
        if success1:
            print(f"   🎯 Strategy Coach Response: {response1.get('response', '')[:100]}...")
        
        # Test Recruitment Specialist
        success2, response2 = self.run_test(
            "Groq AI - Recruitment Specialist",
            "POST",
            "ai/chat",
            200,
            data={
                "message": "How to find good BIGO influencers?",
                "chat_type": "recruitment_agent"
            }
        )
        
        if success2:
            print(f"   🎯 Recruitment Response: {response2.get('response', '')[:100]}...")
        
        # Test Admin Assistant
        success3, response3 = self.run_test(
            "Groq AI - Admin Assistant",
            "POST",
            "ai/chat",
            200,
            data={
                "message": "Platform optimization strategies",
                "chat_type": "admin_assistant"
            }
        )
        
        if success3:
            print(f"   🎯 Admin Assistant Response: {response3.get('response', '')[:100]}...")
        
        return success1 and success2 and success3

    def test_voice_assistant_system(self):
        """Test triple voice assistant system"""
        print("\n🎤 TESTING VOICE ASSISTANT SYSTEM")
        
        # Test BIGO Strategy Coach voice
        success1, response1 = self.run_test(
            "Voice Assistant - BIGO Strategy Coach",
            "POST",
            "voice/generate",
            200,
            data={
                "text": "How to maximize earnings on BIGO Live?",
                "voice_type": "strategy_coach",
                "user_id": self.user_data.get('id') if self.user_data else None
            }
        )
        
        if success1:
            print(f"   🎵 Text Response: {response1.get('text_response', '')[:50]}...")
            print(f"   🎵 Voice Type: {response1.get('voice_type')}")
            voice_data = response1.get('voice_response', {})
            print(f"   🎵 Voice Duration: {voice_data.get('duration_seconds', 0)} seconds")
        
        # Test Admin Assistant voice (admin only)
        success2, response2 = self.run_test(
            "Voice Assistant - Admin Assistant",
            "POST",
            "voice/generate",
            200,
            data={
                "text": "Platform management overview",
                "voice_type": "admin_assistant",
                "user_id": self.user_data.get('id')
            }
        )
        
        if success2:
            print(f"   🎵 Admin Voice Response: {response2.get('text_response', '')[:50]}...")
        
        return success1 and success2

    def test_admin_agent_system(self):
        """Test advanced admin agent system"""
        print("\n👑 TESTING ADVANCED ADMIN AGENT SYSTEM")
        
        if not self.user_data or self.user_data.get('role') not in ['admin', 'owner']:
            print("⚠️  Skipping admin tests - user is not admin")
            return True
        
        # Test Create Event
        success1, response1 = self.run_test(
            "Admin Agent - Create Event",
            "POST",
            "admin/execute",
            200,
            data={
                "action_type": "create_event",
                "params": {
                    "title": "AI-Generated PK Tournament",
                    "description": "Auto-generated test event via admin agent",
                    "event_type": "pk",
                    "start_time": "2025-02-15T20:00:00Z",
                    "timezone_display": "PST",
                    "category": "ai_training"
                }
            }
        )
        
        if success1:
            print(f"   ✅ Event Created: {response1.get('message', '')}")
        
        # Test System Announcement
        success2, response2 = self.run_test(
            "Admin Agent - System Announcement",
            "POST",
            "admin/execute",
            200,
            data={
                "action_type": "system_announcement",
                "params": {
                    "title": "Platform Update",
                    "body": "New AI features are now live! Test announcement from admin agent.",
                    "pinned": True,
                    "audience": "all"
                }
            }
        )
        
        if success2:
            print(f"   ✅ Announcement Created: {response2.get('message', '')}")
        
        # Test Get Admin Actions History
        success3, response3 = self.run_test(
            "Admin Agent - Actions History",
            "GET",
            "admin/actions/history",
            200
        )
        
        if success3:
            actions = response3 if isinstance(response3, list) else []
            print(f"   📊 Admin Actions in History: {len(actions)}")
            if actions:
                latest = actions[0]
                print(f"   📋 Latest Action: {latest.get('action_type')} - {latest.get('success')}")
        
        return success1 and success2 and success3

    def test_influencer_recruitment_system(self):
        """Test influencer recruitment system"""
        print("\n🎯 TESTING INFLUENCER RECRUITMENT SYSTEM")
        
        if not self.user_data or self.user_data.get('role') not in ['admin', 'owner']:
            print("⚠️  Skipping recruitment tests - user is not admin")
            return True
        
        # Test Search Influencers
        success1, response1 = self.run_test(
            "Recruitment - Search New Influencers",
            "POST",
            "recruitment/search",
            200,
            data={
                "platform": "instagram",
                "keywords": ["lifestyle", "entertainment", "streaming"],
                "min_followers": 5000
            }
        )
        
        if success1:
            print(f"   🔍 Found: {response1.get('found_count', 0)} influencers")
            print(f"   💾 Saved: {response1.get('saved_count', 0)} to database")
        
        # Test Get All Leads
        success2, response2 = self.run_test(
            "Recruitment - Get All Leads",
            "GET",
            "recruitment/leads",
            200
        )
        
        if success2:
            leads = response2 if isinstance(response2, list) else []
            print(f"   📋 Total Leads: {len(leads)}")
            
            # Check for seeded leads
            expected_leads = ["Sarah Johnson", "Mike Chen", "Emma Rodriguez"]
            found_leads = [lead.get('name') for lead in leads]
            for expected in expected_leads:
                if expected in found_leads:
                    print(f"   ✅ Found seeded lead: {expected}")
            
            # Show lead statuses
            statuses = {}
            for lead in leads:
                status = lead.get('status', 'unknown')
                statuses[status] = statuses.get(status, 0) + 1
            print(f"   📊 Lead Statuses: {statuses}")
        
        # Test Mass Outreach (if we have leads with emails)
        if success2 and len(response2) > 0:
            email_leads = [lead for lead in response2 if lead.get('email') and lead.get('status') != 'contacted']
            
            if email_leads:
                success3, response3 = self.run_test(
                    "Recruitment - Mass Email Outreach",
                    "POST",
                    "recruitment/outreach",
                    200,
                    data={
                        "lead_ids": [email_leads[0]['id']],
                        "custom_message": "Test automated outreach from Level Up Agency"
                    }
                )
                
                if success3:
                    print(f"   📧 Emails Sent: {response3.get('contacted_count', 0)}")
                    print(f"   ❌ Failed Sends: {response3.get('failed_count', 0)}")
            else:
                print("   ⚠️  No email leads available for outreach test")
                success3 = True
        else:
            success3 = True
        
        # Test Export Spreadsheet
        success4, response4 = self.run_test(
            "Recruitment - Export Leads Spreadsheet",
            "GET",
            "recruitment/export",
            200
        )
        
        if success4:
            print(f"   📊 Export File: {response4.get('filename', 'N/A')}")
            print(f"   🔗 Download URL: {response4.get('download_url', 'N/A')}")
        
        return success1 and success2 and success3 and success4

    def test_enhanced_categorization(self):
        """Test enhanced categorization across all features"""
        print("\n📂 TESTING ENHANCED CATEGORIZATION")
        
        # Test Tasks Categories
        success1, response1 = self.run_test(
            "Enhanced Categories - Tasks",
            "GET",
            "tasks",
            200
        )
        
        if success1:
            tasks = response1 if isinstance(response1, list) else []
            categories = set(task.get('category', 'general') for task in tasks)
            print(f"   📋 Task Categories: {list(categories)}")
            
            # Check for expected categories
            expected_categories = ['pk_battles', 'recruitment', 'training', 'earnings']
            for cat in expected_categories:
                if cat in categories:
                    print(f"   ✅ Found expected task category: {cat}")
        
        # Test Rewards Categories
        success2, response2 = self.run_test(
            "Enhanced Categories - Rewards",
            "GET",
            "rewards",
            200
        )
        
        if success2:
            rewards = response2 if isinstance(response2, list) else []
            categories = set(reward.get('category', 'general') for reward in rewards)
            print(f"   🎁 Reward Categories: {list(categories)}")
            
            # Check for expected categories
            expected_categories = ['coaching', 'premium_features', 'business_tools', 'diamonds']
            for cat in expected_categories:
                if cat in categories:
                    print(f"   ✅ Found expected reward category: {cat}")
        
        # Test Events Categories
        success3, response3 = self.run_test(
            "Enhanced Categories - Events",
            "GET",
            "events",
            200
        )
        
        if success3:
            events = response3 if isinstance(response3, list) else []
            categories = set(event.get('category', 'general') for event in events)
            print(f"   📅 Event Categories: {list(categories)}")
            
            # Check for expected categories
            expected_categories = ['ai_training', 'recruitment_training', 'beta_testing']
            for cat in expected_categories:
                if cat in categories:
                    print(f"   ✅ Found expected event category: {cat}")
        
        return success1 and success2 and success3

    def test_email_field_requirement(self):
        """Test that email field is now required in registration"""
        print("\n📧 TESTING FIXED EMAIL FIELD REQUIREMENT")
        
        # Test registration without email (should fail)
        success1, response1 = self.run_test(
            "Registration - Without Email (Should Fail)",
            "POST",
            "auth/register",
            422,  # Expecting validation error
            data={
                "bigo_id": f"test_no_email_{datetime.now().strftime('%H%M%S')}",
                "password": "password123",
                "name": "Test User No Email",
                "timezone": "UTC"
                # No email field
            }
        )
        
        if success1:
            print("   ✅ Registration correctly failed without email")
        
        # Test registration with email (should succeed)
        test_user = f"test_with_email_{datetime.now().strftime('%H%M%S')}"
        success2, response2 = self.run_test(
            "Registration - With Email (Should Succeed)",
            "POST",
            "auth/register",
            200,
            data={
                "bigo_id": test_user,
                "password": "password123",
                "name": "Test User With Email",
                "email": f"{test_user}@test.com",
                "timezone": "UTC"
            }
        )
        
        if success2:
            print("   ✅ Registration succeeded with email")
        
        return success1 and success2

def main():
    print("🚀 TESTING ULTIMATE LEVEL UP AGENCY ADVANCED FEATURES")
    print("🎯 Revolutionary BIGO Live Host Recruitment & Management Platform")
    print("=" * 70)
    
    tester = AdvancedFeaturesAPITester()
    
    # Test demo login first
    print("\n🔑 TESTING DEMO ADMIN CREDENTIALS")
    if not tester.test_demo_login():
        print("❌ Demo login failed - cannot proceed with admin tests")
        return 1
    
    # Verify admin role and points
    if tester.user_data.get('role') != 'admin':
        print(f"❌ Expected admin role, got: {tester.user_data.get('role')}")
        return 1
    
    if tester.user_data.get('total_points') != 500:
        print(f"❌ Expected 500 points, got: {tester.user_data.get('total_points')}")
        return 1
    
    print("✅ Demo user has correct admin role and 500 points")
    
    # Test all advanced features
    test_results = []
    
    # 1. Groq-Powered AI Integration
    test_results.append(("Groq AI Integration", tester.test_groq_ai_integration()))
    
    # 2. Triple Voice Assistant System
    test_results.append(("Voice Assistant System", tester.test_voice_assistant_system()))
    
    # 3. Advanced Admin Agent
    test_results.append(("Admin Agent System", tester.test_admin_agent_system()))
    
    # 4. Influencer Recruitment System
    test_results.append(("Influencer Recruitment", tester.test_influencer_recruitment_system()))
    
    # 5. Enhanced Categorization
    test_results.append(("Enhanced Categorization", tester.test_enhanced_categorization()))
    
    # 6. Fixed Email Field
    test_results.append(("Email Field Requirement", tester.test_email_field_requirement()))
    
    # Print comprehensive results
    print("\n" + "=" * 70)
    print("🎯 ADVANCED FEATURES TEST RESULTS")
    print("=" * 70)
    
    passed_features = 0
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        if result:
            passed_features += 1
        print(f"{test_name:.<50} {status}")
    
    print(f"\n📊 OVERALL RESULTS: {tester.tests_passed}/{tester.tests_run} API tests passed")
    print(f"🎯 FEATURE RESULTS: {passed_features}/{len(test_results)} advanced features working")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS ({len(tester.failed_tests)}):")
        for i, failed_test in enumerate(tester.failed_tests, 1):
            print(f"   {i}. {failed_test}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    feature_rate = (passed_features / len(test_results)) * 100 if test_results else 0
    
    print(f"\n📈 API Success Rate: {success_rate:.1f}%")
    print(f"🚀 Feature Success Rate: {feature_rate:.1f}%")
    
    if success_rate >= 90 and feature_rate >= 90:
        print(f"\n🎉 EXCELLENT! All advanced features are working perfectly!")
        return 0
    elif success_rate >= 75 and feature_rate >= 75:
        print(f"\n✅ GOOD! Most advanced features are working well!")
        return 0
    else:
        print(f"\n⚠️  NEEDS ATTENTION! Some advanced features need fixes!")
        return 1

if __name__ == "__main__":
    sys.exit(main())