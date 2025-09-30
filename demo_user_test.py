import requests
import sys

def test_demo_user():
    """Test the specific demo user credentials mentioned in the request"""
    base_url = "https://host-dashboard-8.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🔍 Testing Demo User Credentials")
    print("=" * 40)
    
    # Test login with demo credentials
    login_data = {
        "bigo_id": "demo",
        "password": "demo123"
    }
    
    try:
        print("🔑 Testing login with demo/demo123...")
        response = requests.post(f"{api_url}/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            user = data.get('user', {})
            
            print("✅ Login successful!")
            print(f"   👤 Name: {user.get('name')}")
            print(f"   ⭐ Points: {user.get('total_points')}")
            print(f"   🎮 Discord Access: {user.get('discord_access')}")
            print(f"   🎭 Role: {user.get('role')}")
            print(f"   🆔 BIGO ID: {user.get('bigo_id')}")
            
            # Verify expected values
            expected_points = 250
            expected_discord = True
            expected_name = "Demo Host"
            
            if user.get('total_points') == expected_points:
                print(f"✅ Points match expected value: {expected_points}")
            else:
                print(f"⚠️  Points mismatch - Expected: {expected_points}, Got: {user.get('total_points')}")
            
            if user.get('discord_access') == expected_discord:
                print(f"✅ Discord access matches expected: {expected_discord}")
            else:
                print(f"⚠️  Discord access mismatch - Expected: {expected_discord}, Got: {user.get('discord_access')}")
            
            if user.get('name') == expected_name:
                print(f"✅ Name matches expected: {expected_name}")
            else:
                print(f"⚠️  Name mismatch - Expected: {expected_name}, Got: {user.get('name')}")
            
            return True, data.get('access_token')
            
        else:
            print(f"❌ Login failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False, None
            
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return False, None

def test_invalid_credentials():
    """Test invalid credentials to verify error handling"""
    base_url = "https://host-dashboard-8.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("\n🔒 Testing Invalid Credentials")
    print("=" * 40)
    
    # Test with wrong password
    login_data = {
        "bigo_id": "demo",
        "password": "wrongpassword"
    }
    
    try:
        print("🔑 Testing login with demo/wrongpassword...")
        response = requests.post(f"{api_url}/auth/login", json=login_data)
        
        if response.status_code == 401:
            data = response.json()
            error_detail = data.get('detail', '')
            
            print("✅ Invalid credentials properly rejected!")
            print(f"   📝 Error message: {error_detail}")
            
            # Check if error message is a string (not an object)
            if isinstance(error_detail, str):
                print("✅ Error message is a proper string")
            else:
                print(f"⚠️  Error message is not a string: {type(error_detail)}")
            
            return True
            
        else:
            print(f"❌ Expected 401, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing invalid credentials: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Demo User Setup")
    print("=" * 50)
    
    # Test demo user login
    login_success, token = test_demo_user()
    
    # Test invalid credentials
    invalid_test_success = test_invalid_credentials()
    
    print("\n" + "=" * 50)
    if login_success and invalid_test_success:
        print("🎉 All demo user tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed")
        sys.exit(1)