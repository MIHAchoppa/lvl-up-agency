"""
Manual integration test script for BeanGenie chat intent classification
Run this to manually verify the behavior with different message types
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.services.ai_service import ai_service


async def test_message(message: str):
    """Test a message and print results"""
    print(f"\n{'='*80}")
    print(f"Message: '{message}'")
    print(f"{'='*80}")
    
    result = await ai_service.classify_intent(message)
    
    print(f"Intent: {result['intent']}")
    print(f"Confidence: {result['confidence']:.2f}")
    print(f"BIGO-related: {result['is_bigo_related']}")
    
    if result.get('suggested_response'):
        print(f"\nSuggested Response:")
        print(result['suggested_response'])
    else:
        print(f"\nNo suggested response (will search knowledge base)")


async def main():
    """Run test scenarios"""
    print("\n" + "="*80)
    print("BEANGENIE INTENT CLASSIFICATION - MANUAL TEST")
    print("="*80)
    
    # Test cases from problem statement
    test_cases = [
        # Greetings (should NOT trigger tutorials)
        "yo",
        "hi",
        "hello",
        "hey there",
        "what's up",
        
        # Casual/Off-topic (should redirect gently)
        "nice",
        "lol",
        "that's cool",
        "What's the weather?",
        "Tell me a joke",
        
        # BIGO-related questions (should search knowledge base)
        "How do I earn more beans?",
        "What is the BIGO tier system?",
        "How to win PK battles?",
        "When should I stream?",
        "What are diamonds?",
        "How does the 'Yo' feature work on BIGO Live?",  # Legit BIGO question
        
        # Mixed messages
        "Hey, how do I earn beans?",
        "Just wondering about streaming tips",
    ]
    
    for message in test_cases:
        await test_message(message)
    
    print(f"\n{'='*80}")
    print("TEST COMPLETE")
    print("="*80)
    
    # Verify key scenarios
    print("\n\nKEY VERIFICATION:")
    print("-" * 80)
    
    # Test "yo" specifically
    result = await ai_service.classify_intent("yo")
    if result['intent'] == 'greeting' and not result['is_bigo_related']:
        print("✅ PASS: 'yo' correctly identified as greeting, not BIGO feature")
    else:
        print(f"❌ FAIL: 'yo' classified as {result['intent']}, BIGO-related={result['is_bigo_related']}")
    
    # Test off-topic redirect
    result = await ai_service.classify_intent("What's the weather?")
    if result['intent'] == 'off_topic' and not result['is_bigo_related']:
        print("✅ PASS: Off-topic question correctly identified and redirected")
    else:
        print(f"❌ FAIL: Off-topic not detected, classified as {result['intent']}")
    
    # Test BIGO question
    result = await ai_service.classify_intent("How do I earn more beans?")
    if result['intent'] == 'question' and result['is_bigo_related']:
        print("✅ PASS: BIGO question correctly identified")
    else:
        print(f"❌ FAIL: BIGO question misclassified as {result['intent']}")
    
    print("-" * 80)


if __name__ == "__main__":
    asyncio.run(main())
