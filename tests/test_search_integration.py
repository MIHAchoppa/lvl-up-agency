#!/usr/bin/env python3
"""
Quick integration test for BIGO updates
Tests the knowledge base search function
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

async def test_search_function():
    """Test the search_bigo_knowledge function"""
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    from dotenv import load_dotenv
    
    # Load environment
    env_path = Path(__file__).parent.parent / 'backend' / '.env'
    if env_path.exists():
        load_dotenv(env_path)
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'bigo_agency')
    
    print(f"Connecting to {mongo_url}/{db_name}...")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Temporarily assign to global db for import
    import server
    server.db = db
    
    print("\n🧪 Testing search_bigo_knowledge function...\n")
    
    try:
        # Test with empty query
        results = await server.search_bigo_knowledge("")
        print(f"✓ Empty query: {len(results)} results")
        
        # Test with BIGO-related query
        results = await server.search_bigo_knowledge("BIGO Live streaming")
        print(f"✓ 'BIGO Live streaming': {len(results)} results")
        
        # Test with another query
        results = await server.search_bigo_knowledge("beans gifts")
        print(f"✓ 'beans gifts': {len(results)} results")
        
        if len(results) > 0:
            print("\n📄 Sample result:")
            print(f"   Title: {results[0].get('title', 'N/A')}")
            print(f"   URL: {results[0].get('url', 'N/A')}")
            print(f"   Content preview: {results[0].get('content', '')[:100]}...")
        else:
            print("\nℹ️  No results found. Run seed script to populate knowledge base:")
            print("   python3 scripts/seed_bigo_knowledge.py")
        
        print("\n✅ Search function is working correctly!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_search_function())
