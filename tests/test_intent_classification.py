"""
Tests for intent classification and contextual filtering in BeanGenie chat
"""
import pytest
from backend.services.ai_service import AIService

# Use anyio for async support (already installed)
pytestmark = pytest.mark.anyio


class TestIntentClassification:
    """Test intent classification for BeanGenie chat"""
    
    @pytest.fixture
    def ai_service(self):
        """Create AI service instance for testing"""
        return AIService()
    
    async def test_greeting_intent(self, ai_service):
        """Test that greetings are properly classified"""
        test_cases = ["hi", "hello", "hey", "yo", "sup", "what's up", "hola"]
        
        for message in test_cases:
            result = await ai_service.classify_intent(message)
            assert result["intent"] == "greeting", f"Failed for message: {message}"
            assert result["is_bigo_related"] == False
            assert "suggested_response" in result
            assert "BeanGenie" in result["suggested_response"] or "BIGO Live" in result["suggested_response"]
    
    
    async def test_greeting_with_punctuation(self, ai_service):
        """Test greetings with punctuation"""
        test_cases = ["hi!", "hello,", "hey there", "yo bro"]
        
        for message in test_cases:
            result = await ai_service.classify_intent(message)
            # Should be either greeting or casual
            assert result["intent"] in ["greeting", "casual"], f"Failed for message: {message}"
            assert result["is_bigo_related"] == False
            assert "suggested_response" in result
    
    
    async def test_casual_non_bigo_messages(self, ai_service):
        """Test casual messages unrelated to BIGO"""
        test_cases = [
            "nice weather",
            "lol",
            "ok cool",
            "thanks"
        ]
        
        for message in test_cases:
            result = await ai_service.classify_intent(message)
            assert result["intent"] in ["casual", "off_topic"]
            assert result["is_bigo_related"] == False
            assert "suggested_response" in result
    
    
    async def test_bigo_related_questions(self, ai_service):
        """Test BIGO-related questions are properly identified"""
        test_cases = [
            "How do I earn more beans?",
            "What is the BIGO tier system?",
            "How to win PK battles?",
            "When should I stream on BIGO Live?",
            "How do gifts work?",
            "What are diamonds?",
            "How to rank up to S10?"
        ]
        
        for message in test_cases:
            result = await ai_service.classify_intent(message)
            assert result["intent"] == "question", f"Failed for message: {message}"
            assert result["is_bigo_related"] == True, f"Should be BIGO-related: {message}"
            assert result["suggested_response"] is None, "BIGO questions should not have suggested response"
    
    
    async def test_off_topic_questions(self, ai_service):
        """Test off-topic questions get proper redirect"""
        test_cases = [
            "What's the weather like?",
            "How do I cook pasta?",
            "What time is it?",
            "Tell me a joke"
        ]
        
        for message in test_cases:
            result = await ai_service.classify_intent(message)
            assert result["intent"] == "off_topic", f"Failed for message: {message}"
            assert result["is_bigo_related"] == False
            assert "suggested_response" in result
            assert "BIGO" in result["suggested_response"]
    
    
    async def test_short_bigo_keywords(self, ai_service):
        """Test short messages with BIGO keywords"""
        test_cases = [
            "beans",
            "pk battle",
            "tier system",
            "streaming tips"
        ]
        
        for message in test_cases:
            result = await ai_service.classify_intent(message)
            assert result["is_bigo_related"] == True, f"Should be BIGO-related: {message}"
            # Should be treated as question even if short
            assert result["intent"] == "question"
    
    
    async def test_confidence_scores(self, ai_service):
        """Test that confidence scores are reasonable"""
        result = await ai_service.classify_intent("hi")
        assert result["confidence"] >= 0.8, "Greeting should have high confidence"
        
        result = await ai_service.classify_intent("How do I earn beans?")
        assert result["confidence"] >= 0.7, "Clear question should have good confidence"
    
    
    async def test_edge_cases(self, ai_service):
        """Test edge cases"""
        # Empty-ish message
        result = await ai_service.classify_intent("   ")
        assert "intent" in result
        
        # Very long message
        long_message = "How do I " + "really " * 50 + "earn more beans on BIGO Live?"
        result = await ai_service.classify_intent(long_message)
        assert result["is_bigo_related"] == True
        assert result["intent"] == "question"
    
    
    async def test_yo_specific_case(self, ai_service):
        """Test the specific 'yo' case from the bug report"""
        result = await ai_service.classify_intent("yo")
        
        # Should be classified as greeting, not trigger BIGO feature tutorial
        assert result["intent"] == "greeting"
        assert result["is_bigo_related"] == False
        assert result["suggested_response"] is not None
        
        # Should redirect to learning assistant role
        assert "BeanGenie" in result["suggested_response"] or "BIGO Live" in result["suggested_response"]
        assert "help" in result["suggested_response"].lower() or "assist" in result["suggested_response"].lower()
    
    
    async def test_mixed_intent_messages(self, ai_service):
        """Test messages that might have mixed intent"""
        # Greeting followed by question - the greeting part should not override BIGO detection
        result = await ai_service.classify_intent("Hey, how do I earn beans?")
        # Should detect BIGO-related content even with greeting prefix
        assert result["is_bigo_related"] == True, "Should detect 'beans' as BIGO keyword"
        
        # Casual phrase with BIGO keyword
        result = await ai_service.classify_intent("Just wondering about beans")
        assert result["is_bigo_related"] == True


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
