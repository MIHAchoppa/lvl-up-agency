"""
Tests for Lead Scanner Service
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import asyncio
from services.lead_scanner_service import lead_scanner_service


async def test_scan_for_leads():
    """Test basic lead scanning functionality"""
    print("\n🔍 Testing Lead Scanner Service...")
    
    # Test configuration
    platforms = ['instagram', 'tiktok']
    keywords = ['live streamer', 'content creator']
    min_followers = 5000
    max_results = 10
    
    print(f"Platforms: {platforms}")
    print(f"Keywords: {keywords}")
    print(f"Min Followers: {min_followers}")
    print(f"Max Results: {max_results}")
    
    # Run scan
    print("\n📊 Running scan...")
    results = await lead_scanner_service.scan_for_leads(
        platforms=platforms,
        keywords=keywords,
        min_followers=min_followers,
        max_results=max_results
    )
    
    # Verify results
    print(f"\n✅ Scan completed!")
    print(f"Total found: {results['total_found']}")
    print(f"Leads: {len(results['leads'])}")
    
    # Show sample leads
    if results['leads']:
        print(f"\n📋 Sample leads:")
        for i, lead in enumerate(results['leads'][:3], 1):
            print(f"  {i}. {lead['name']} (@{lead['username']}) - {lead['platform']}")
            print(f"     Followers: {lead['follower_count']:,} | Engagement: {lead['engagement_rate']}%")
    
    # Test enrichment
    if results['leads']:
        print(f"\n🎯 Testing lead enrichment...")
        enriched = await lead_scanner_service.enrich_lead(results['leads'][0])
        print(f"Quality Score: {enriched.get('quality_score', 0)}/100")
    
    # Test validation
    if results['leads']:
        print(f"\n✓ Testing lead validation...")
        is_valid = await lead_scanner_service.validate_lead(results['leads'][0])
        print(f"Lead is valid: {is_valid}")
    
    # Verify structure
    assert 'total_found' in results, "Results should have total_found"
    assert 'leads' in results, "Results should have leads"
    assert 'by_platform' in results, "Results should have by_platform"
    assert isinstance(results['leads'], list), "Leads should be a list"
    
    print("\n✅ All tests passed!")
    return results


async def test_validation():
    """Test lead validation"""
    print("\n🔍 Testing Lead Validation...")
    
    # Valid lead
    valid_lead = {
        'name': 'Test User',
        'platform': 'instagram',
        'username': 'test_user',
        'profile_url': 'https://instagram.com/test_user',
        'follower_count': 10000,
        'engagement_rate': 3.5
    }
    
    is_valid = await lead_scanner_service.validate_lead(valid_lead)
    assert is_valid, "Valid lead should pass validation"
    print("✅ Valid lead passed validation")
    
    # Invalid lead (low followers)
    invalid_lead = {
        'name': 'Test User 2',
        'platform': 'tiktok',
        'username': 'test_user2',
        'profile_url': 'https://tiktok.com/test_user2',
        'follower_count': 500,  # Below threshold
        'engagement_rate': 3.5
    }
    
    is_valid = await lead_scanner_service.validate_lead(invalid_lead)
    assert not is_valid, "Invalid lead (low followers) should fail validation"
    print("✅ Invalid lead (low followers) correctly rejected")
    
    print("\n✅ Validation tests passed!")


async def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 Lead Scanner Service Tests")
    print("=" * 60)
    
    try:
        # Test basic scanning
        await test_scan_for_leads()
        
        # Test validation
        await test_validation()
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
