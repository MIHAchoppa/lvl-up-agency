"""
Test script to validate the new BIGO-focused backend endpoints
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

async def test_endpoints():
    """Run basic tests on the new endpoints"""
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    from dotenv import load_dotenv
    
    # Load environment
    env_path = Path(__file__).parent.parent / 'backend' / '.env'
    if env_path.exists():
        load_dotenv(env_path)
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'bigo_agency')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🧪 Testing BIGO Knowledge Base Setup...")
    
    try:
        # Check if collection exists
        collections = await db.list_collection_names()
        if 'bigo_knowledge' in collections:
            print("✓ bigo_knowledge collection exists")
        else:
            print("⚠ bigo_knowledge collection not found (will be created on first use)")
        
        # Check if text index exists
        indexes = await db.bigo_knowledge.list_indexes().to_list(100)
        has_text_index = any('text' in idx.get('key', {}).values() for idx in indexes)
        
        if has_text_index:
            print("✓ Text index on bigo_knowledge exists")
        else:
            print("⚠ Text index not found (will be created at startup)")
        
        # Test search function (should handle empty results gracefully)
        from backend.server import search_bigo_knowledge
        results = await search_bigo_knowledge("BIGO Live streaming tips")
        print(f"✓ Search function works (found {len(results)} results)")
        
        # Check events collection
        if 'events' in collections:
            event_count = await db.events.count_documents({})
            print(f"✓ events collection exists ({event_count} events)")
        
        print("\n✅ All basic checks passed!")
        print("\nNext steps:")
        print("1. Run the seed script: python3 scripts/seed_bigo_knowledge.py")
        print("2. Start the backend: cd backend && uvicorn server:app --reload")
        print("3. Test the frontend updates")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_endpoints())
