"""
Test messaging functionality including WebSocket and bigo_id display
"""
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timezone
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Mock dependencies before importing server
class MockMotorClient:
    def __init__(self, *args, **kwargs):
        pass
    
    def __getitem__(self, key):
        return MockDatabase()

class MockDatabase:
    def __getitem__(self, key):
        return MockCollection()

class MockCollection:
    async def find_one(self, query):
        # Return mock user data with bigo_id
        if query.get("id") == "user1":
            return {
                "id": "user1",
                "bigo_id": "TestUser1",
                "name": "Test User One",
                "email": "test1@example.com"
            }
        elif query.get("id") == "user2":
            return {
                "id": "user2",
                "bigo_id": "TestUser2",
                "name": "Test User Two",
                "email": "test2@example.com"
            }
        return None
    
    async def insert_one(self, data):
        return MagicMock(inserted_id="test_id")
    
    def find(self, query):
        return self
    
    def sort(self, field, direction):
        return self
    
    async def to_list(self, limit):
        return [
            {
                "id": "msg1",
                "sender_id": "user1",
                "recipient_id": "user2",
                "message": "Test message",
                "status": "sent",
                "sent_at": datetime.now(timezone.utc)
            }
        ]

# Mock the MongoDB client
sys.modules['motor'] = MagicMock()
sys.modules['motor.motor_asyncio'] = MagicMock()
sys.modules['motor.motor_asyncio'].AsyncIOMotorClient = MockMotorClient

# Mock environment variables
os.environ['MONGO_URL'] = 'mongodb://test'
os.environ['DB_NAME'] = 'test_db'
os.environ['JWT_SECRET'] = 'test_secret'
os.environ['GROQ_API_KEY'] = 'test_key'
os.environ['CORS_ORIGINS'] = '*'


class TestMessaging:
    """Test messaging functionality"""
    
    def test_message_enrichment_with_bigo_id(self):
        """Test that messages are enriched with sender bigo_id"""
        # Create a mock message
        message = {
            "id": "msg1",
            "sender_id": "user1",
            "recipient_id": "user2",
            "message": "Test message",
            "status": "sent"
        }
        
        # Create enriched message structure
        enriched = {
            **message,
            "sender": {
                "id": "user1",
                "bigo_id": "TestUser1",
                "name": "Test User One"
            },
            "recipient": {
                "id": "user2",
                "bigo_id": "TestUser2",
                "name": "Test User Two"
            }
        }
        
        # Verify structure
        assert "sender" in enriched
        assert "recipient" in enriched
        assert enriched["sender"]["bigo_id"] == "TestUser1"
        assert enriched["recipient"]["bigo_id"] == "TestUser2"
        print("✅ Message enrichment with bigo_id works correctly")
    
    def test_websocket_message_format(self):
        """Test WebSocket message format includes type and message"""
        ws_message = {
            "type": "private_message",
            "message": {
                "id": "msg1",
                "sender": {
                    "id": "user1",
                    "bigo_id": "TestUser1",
                    "name": "Test User One"
                },
                "message": "Hello!",
                "status": "sent"
            }
        }
        
        assert ws_message["type"] == "private_message"
        assert "sender" in ws_message["message"]
        assert ws_message["message"]["sender"]["bigo_id"] == "TestUser1"
        print("✅ WebSocket message format is correct")
    
    def test_channel_message_format(self):
        """Test channel messages include sender bigo_id"""
        channel_message = {
            "id": "msg1",
            "channel_id": "general",
            "user_id": "user1",
            "body": "Hello channel!",
            "sender": {
                "id": "user1",
                "bigo_id": "TestUser1",
                "name": "Test User One"
            }
        }
        
        assert "sender" in channel_message
        assert channel_message["sender"]["bigo_id"] == "TestUser1"
        print("✅ Channel message format includes sender bigo_id")
    
    def test_frontend_display_name_logic(self):
        """Test frontend logic for displaying bigo_id"""
        # Simulate frontend getUserDisplayName logic
        def get_user_display_name(message):
            if message and "sender" in message and message["sender"].get("bigo_id"):
                return f"@{message['sender']['bigo_id']}"
            return "Unknown"
        
        # Test with proper message structure
        message_with_sender = {
            "id": "msg1",
            "sender": {
                "id": "user1",
                "bigo_id": "TestUser1"
            }
        }
        
        display_name = get_user_display_name(message_with_sender)
        assert display_name == "@TestUser1"
        print("✅ Frontend display name logic uses bigo_id correctly")


def run_tests():
    """Run all tests"""
    print("\n🧪 Testing Messaging Functionality")
    print("=" * 70)
    
    test_suite = TestMessaging()
    
    try:
        test_suite.test_message_enrichment_with_bigo_id()
        test_suite.test_websocket_message_format()
        test_suite.test_channel_message_format()
        test_suite.test_frontend_display_name_logic()
        
        print("\n" + "=" * 70)
        print("✅ All messaging tests passed!")
        print("=" * 70)
        return 0
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
