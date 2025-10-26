"""
Test BIGO API data integration and bot intelligence
Tests the enhanced BeanGenie and Admin Assistant with comprehensive BIGO knowledge
"""
import asyncio
import sys
import os
from pathlib import Path
import logging

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Environment setup
os.environ['MONGO_URL'] = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
os.environ['DB_NAME'] = os.environ.get('DB_NAME', 'bigo_agency')

from motor.motor_asyncio import AsyncIOMotorClient

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Quality thresholds
CONTENT_LENGTH_THRESHOLD = 0.8  # 80% of entries should have >1000 chars
TAG_COVERAGE_THRESHOLD = 0.9    # 90% of entries should have tags
URL_COVERAGE_THRESHOLD = 1.0    # 100% of entries should have URLs

async def test_knowledge_base():
    """Test that BIGO knowledge base contains comprehensive data"""
    logger.info("\n" + "="*60)
    logger.info("TEST 1: BIGO Knowledge Base Content")
    logger.info("="*60)
    
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    try:
        # Count total knowledge entries
        count = await db.bigo_knowledge.count_documents({})
        logger.info(f"✓ Total knowledge entries: {count}")
        
        if count == 0:
            logger.warning("⚠ WARNING: Knowledge base is empty. Run 'python scripts/seed_bigo_knowledge.py' to populate it.")
            return False
        
        # Check for key topics
        key_topics = [
            ("beans", "Beans and Currency System"),
            ("tier", "Tier System"),
            ("pk", "PK Battles"),
            ("schedule", "Streaming Schedule"),
            ("gifts", "Gifts and Earning"),
            ("engagement", "Audience Engagement"),
            ("setup", "Host Setup"),
            ("content", "Content Strategy")
        ]
        
        topics_found = 0
        for keyword, topic_name in key_topics:
            result = await db.bigo_knowledge.find_one({
                "$or": [
                    {"title": {"$regex": keyword, "$options": "i"}},
                    {"tags": keyword}
                ]
            })
            if result:
                logger.info(f"✓ Found topic: {topic_name}")
                topics_found += 1
            else:
                logger.info(f"✗ Missing topic: {topic_name}")
        
        logger.info(f"\nTopics coverage: {topics_found}/{len(key_topics)}")
        
        # Check text index exists with proper structure check
        indexes = await db.bigo_knowledge.list_indexes().to_list(100)
        has_text_index = False
        for idx in indexes:
            # Check if index has a 'weights' field indicating text index
            if 'weights' in idx or idx.get('key', {}).get('_fts') == 'text':
                has_text_index = True
                break
        
        if has_text_index:
            logger.info("✓ Text search index exists")
        else:
            logger.info("✗ Text search index missing")
        
        success = topics_found >= 6 and has_text_index
        return success
        
    except Exception as e:
        logger.error(f"✗ Error testing knowledge base: {e}")
        return False
    finally:
        client.close()

async def test_knowledge_search():
    """Test that knowledge search returns relevant results"""
    logger.info("\n" + "="*60)
    logger.info("TEST 2: Knowledge Search Functionality")
    logger.info("="*60)
    
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    try:
        test_queries = [
            ("beans earnings", "currency/monetization"),
            ("PK battle strategy", "competition"),
            ("tier system progression", "rankings"),
            ("streaming schedule best time", "timing/optimization"),
            ("audience engagement", "community building")
        ]
        
        passed = 0
        for query, expected_topic in test_queries:
            results = await db.bigo_knowledge.find(
                {"$text": {"$search": query}},
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(3).to_list(3)
            
            if results and len(results) > 0:
                logger.info(f"✓ Query '{query}' found {len(results)} results")
                logger.info(f"  Top result: {results[0]['title'][:50]}...")
                passed += 1
            else:
                logger.info(f"✗ Query '{query}' found no results")
        
        logger.info(f"\nSearch tests passed: {passed}/{len(test_queries)}")
        return passed >= 4
        
    except Exception as e:
        logger.info(f"✗ Error testing search: {e}")
        return False
    finally:
        client.close()

async def test_knowledge_content_quality():
    """Test that knowledge entries contain substantial content"""
    logger.info("\n" + "="*60)
    logger.info("TEST 3: Knowledge Content Quality")
    logger.info("="*60)
    
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    try:
        entries = await db.bigo_knowledge.find({}).to_list(100)
        
        if not entries:
            logger.info("⚠ No entries to test")
            return False
        
        quality_checks = {
            "sufficient_length": 0,  # >1000 chars
            "has_tags": 0,
            "has_url": 0,
            "has_title": 0,
            "comprehensive": 0  # >3000 chars
        }
        
        for entry in entries:
            content_length = len(entry.get('content', ''))
            
            if content_length > 1000:
                quality_checks["sufficient_length"] += 1
            if content_length > 3000:
                quality_checks["comprehensive"] += 1
            if entry.get('tags'):
                quality_checks["has_tags"] += 1
            if entry.get('url'):
                quality_checks["has_url"] += 1
            if entry.get('title'):
                quality_checks["has_title"] += 1
        
        total = len(entries)
        logger.info(f"Total entries analyzed: {total}")
        logger.info(f"✓ Entries with sufficient content (>1000 chars): {quality_checks['sufficient_length']}/{total}")
        logger.info(f"✓ Entries with comprehensive content (>3000 chars): {quality_checks['comprehensive']}/{total}")
        logger.info(f"✓ Entries with tags: {quality_checks['has_tags']}/{total}")
        logger.info(f"✓ Entries with URLs: {quality_checks['has_url']}/{total}")
        logger.info(f"✓ Entries with titles: {quality_checks['has_title']}/{total}")
        
        # Sample content snippet
        if entries:
            sample = entries[0]
            logger.info(f"\nSample entry: {sample['title']}")
            logger.info(f"Content length: {len(sample.get('content', ''))} chars")
            logger.info(f"Tags: {', '.join(sample.get('tags', []))}")
            logger.info(f"Content preview: {sample.get('content', '')[:200]}...")
        
        success = (
            quality_checks['sufficient_length'] >= total * CONTENT_LENGTH_THRESHOLD and
            quality_checks['has_tags'] >= total * TAG_COVERAGE_THRESHOLD and
            quality_checks['has_url'] == total * URL_COVERAGE_THRESHOLD
        )
        
        return success
        
    except Exception as e:
        logger.info(f"✗ Error testing content quality: {e}")
        return False
    finally:
        client.close()

def test_enhanced_prompts():
    """Test that enhanced prompts are present in server.py"""
    logger.info("\n" + "="*60)
    logger.info("TEST 4: Enhanced Bot Intelligence (Prompts)")
    logger.info("="*60)
    
    try:
        server_path = Path(__file__).parent.parent / 'backend' / 'server.py'
        with open(server_path, 'r') as f:
            content = f.read()
        
        intelligence_markers = [
            ("CORE EXPERTISE AREAS", "BeanGenie expertise declaration"),
            ("INTELLIGENCE PRINCIPLES", "Intelligent response strategy"),
            ("tier-appropriate advice", "Context-aware responses"),
            ("max_completion_tokens=800", "Enhanced response length for BeanGenie"),
            ("max_completion_tokens=700", "Enhanced response length for Admin"),
            ("temperature=0.8", "Creative temperature for engaging responses"),
            ("deep knowledge of", "BIGO expertise in Admin Assistant"),
            ("extensive training", "Training reference in prompts")
        ]
        
        found = 0
        for marker, description in intelligence_markers:
            if marker in content:
                logger.info(f"✓ Found: {description}")
                found += 1
            else:
                logger.info(f"✗ Missing: {description}")
        
        logger.info(f"\nIntelligence markers found: {found}/{len(intelligence_markers)}")
        return found >= 6
        
    except Exception as e:
        logger.info(f"✗ Error testing prompts: {e}")
        return False

def test_knowledge_data_structure():
    """Test that seed script contains comprehensive knowledge data"""
    logger.info("\n" + "="*60)
    logger.info("TEST 5: Knowledge Data Structure")
    logger.info("="*60)
    
    try:
        seed_path = Path(__file__).parent.parent / 'scripts' / 'seed_bigo_knowledge.py'
        with open(seed_path, 'r') as f:
            content = f.read()
        
        required_elements = [
            ("BIGO_KNOWLEDGE_DATA", "Structured knowledge data array"),
            ("Beans and Currency System", "Beans knowledge"),
            ("Tier System", "Tier knowledge"),
            ("PK Battles", "PK battle knowledge"),
            ("Streaming Schedule", "Schedule knowledge"),
            ("Gifts and Earning", "Gifts knowledge"),
            ("Audience Engagement", "Engagement knowledge"),
            ("Host Setup", "Technical setup knowledge"),
            ("Content Strategy", "Content strategy knowledge")
        ]
        
        found = 0
        for element, description in required_elements:
            if element in content:
                logger.info(f"✓ Found: {description}")
                found += 1
            else:
                logger.info(f"✗ Missing: {description}")
        
        # Check for substantial content in knowledge data
        if "BIGO_KNOWLEDGE_DATA" in content:
            # Count words in knowledge data section
            start_idx = content.index("BIGO_KNOWLEDGE_DATA")
            # Find the end of the array (next function definition or end of relevant section)
            end_markers = ["async def seed_knowledge_base", "def extract_text_from_html"]
            end_idx = len(content)
            for marker in end_markers:
                if marker in content[start_idx:]:
                    end_idx = start_idx + content[start_idx:].index(marker)
                    break
            
            knowledge_section = content[start_idx:end_idx]
            word_count = len(knowledge_section.split())
            logger.info(f"\n✓ Knowledge data section: ~{word_count} words")
            
            if word_count > 5000:
                logger.info("✓ Comprehensive knowledge data detected (>5000 words)")
                found += 1
        
        logger.info(f"\nData structure elements found: {found}/{len(required_elements) + 1}")
        return found >= 8
        
    except Exception as e:
        logger.info(f"✗ Error testing data structure: {e}")
        return False

async def run_all_tests():
    """Run all BIGO intelligence tests"""
    logger.info("\n" + "="*60)
    logger.info("BIGO API DATA INTEGRATION & INTELLIGENCE TEST SUITE")
    logger.info("="*60)
    
    results = {}
    
    # Test 1: Knowledge base content (async)
    results['knowledge_base'] = await test_knowledge_base()
    
    # Test 2: Knowledge search (async)
    results['knowledge_search'] = await test_knowledge_search()
    
    # Test 3: Content quality (async)
    results['content_quality'] = await test_knowledge_content_quality()
    
    # Test 4: Enhanced prompts (sync)
    results['enhanced_prompts'] = test_enhanced_prompts()
    
    # Test 5: Knowledge data structure (sync)
    results['data_structure'] = test_knowledge_data_structure()
    
    # Summary
    logger.info("\n" + "="*60)
    logger.info("TEST SUMMARY")
    logger.info("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        logger.info(f"{status}: {test_name}")
    
    logger.info(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("\n🎉 ALL TESTS PASSED! BIGO API integration is complete and intelligent!")
    elif passed >= total * 0.8:
        logger.info("\n✓ Most tests passed. BIGO intelligence implementation is good.")
    else:
        logger.info("\n⚠ Some tests failed. Review the implementation.")
    
    logger.info("\nNOTE: If knowledge base tests failed, run:")
    logger.info("  python scripts/seed_bigo_knowledge.py")
    logger.info("\nThis will populate the database with comprehensive BIGO knowledge.")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
