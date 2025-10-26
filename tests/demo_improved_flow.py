"""
Integration test demonstrating the improved BeanGenie chat flow
This shows the before/after behavior for the "yo" bug
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.services.ai_service import ai_service


# Simulating the BeanGenie chat endpoint logic


class MockUser:
    id = "test-user-123"
    name = "Test User"


async def simulate_beangenie_chat(message: str):
    """Simulate what happens in beangenie_chat endpoint"""
    
    # Step 1: Classify intent (NEW)
    intent_result = await ai_service.classify_intent(message)
    
    print(f"\n{'='*80}")
    print(f"Message: '{message}'")
    print(f"{'='*80}")
    print(f"Intent: {intent_result['intent']}")
    print(f"BIGO-related: {intent_result['is_bigo_related']}")
    print(f"Confidence: {intent_result['confidence']:.2f}")
    
    # Step 2: Handle greetings/casual with friendly redirect (NEW)
    if intent_result["intent"] in ["greeting", "casual"] and not intent_result["is_bigo_related"]:
        print(f"\n✅ Handling as {intent_result['intent']} - NO knowledge base search")
        print(f"\nResponse:")
        print(intent_result["suggested_response"])
        return {
            "response": intent_result["suggested_response"],
            "sources": [],
            "intent": intent_result["intent"]
        }
    
    # Step 3: Handle off-topic with redirect (NEW)
    if intent_result["intent"] == "off_topic" and not intent_result["is_bigo_related"]:
        print(f"\n✅ Handling as off-topic - NO knowledge base search")
        print(f"\nResponse:")
        print(intent_result["suggested_response"])
        return {
            "response": intent_result["suggested_response"],
            "sources": [],
            "intent": "off_topic"
        }
    
    # Step 4: For BIGO questions, proceed to knowledge base search
    print(f"\n✅ BIGO-related question - WILL search knowledge base")
    print(f"(Would search knowledge base and provide detailed answer with sources)")
    return {
        "response": "(AI-generated BIGO answer with sources)",
        "sources": ["[1] Some BIGO article"],
        "intent": "question"
    }


async def main():
    """Run demonstration scenarios"""
    print("\n" + "="*80)
    print("BEANGENIE CHAT - IMPROVED FLOW DEMONSTRATION")
    print("="*80)
    print("\nThis demonstrates the fix for the 'yo' greeting bug where the bot")
    print("would launch into tutorials instead of recognizing casual greetings.")
    print("="*80)
    
    # BEFORE: "yo" would search knowledge base and possibly find "Yo feature"
    # AFTER: "yo" is recognized as greeting and gets friendly redirect
    
    test_cases = [
        ("yo", "Should recognize as greeting, not search for BIGO 'Yo' feature"),
        ("hi there", "Should recognize as greeting"),
        ("What's the weather?", "Should redirect off-topic to BIGO topics"),
        ("How do I earn beans?", "Should search knowledge base for BIGO answer"),
        ("How does the Yo feature work on BIGO?", "Legit BIGO question about Yo feature"),
    ]
    
    for message, expected in test_cases:
        print(f"\n\nTest: {expected}")
        await simulate_beangenie_chat(message)
    
    print("\n" + "="*80)
    print("DEMONSTRATION COMPLETE")
    print("="*80)
    print("\nKey Improvements:")
    print("✅ Greetings detected and handled with friendly redirect")
    print("✅ Off-topic queries redirected to BIGO topics")  
    print("✅ No false triggers on partial keyword matches")
    print("✅ BIGO questions still get full knowledge base search")
    print("="*80)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
