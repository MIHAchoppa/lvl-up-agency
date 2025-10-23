"""
Lead Scanner Service
Scans the internet for potential BIGO Live host leads from social media platforms
"""
import asyncio
import re
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import aiohttp
from bs4 import BeautifulSoup
import json

logger = logging.getLogger(__name__)


class LeadScannerService:
    """Service for scanning the internet for influencer leads"""
    
    def __init__(self):
        self.platforms = {
            'instagram': {
                'search_url': 'https://www.instagram.com/explore/tags/{keyword}/',
                'patterns': {
                    'username': r'@([a-zA-Z0-9._]+)',
                    'followers': r'(\d+(?:,\d+)*(?:\.\d+)?[KkMm]?)\s+followers'
                }
            },
            'tiktok': {
                'search_url': 'https://www.tiktok.com/tag/{keyword}',
                'patterns': {
                    'username': r'@([a-zA-Z0-9._]+)',
                    'followers': r'(\d+(?:\.\d+)?[KkMm]?)\s+Followers'
                }
            },
            'youtube': {
                'search_url': 'https://www.youtube.com/results?search_query={keyword}',
                'patterns': {
                    'username': r'@([a-zA-Z0-9._]+)',
                    'subscribers': r'(\d+(?:\.\d+)?[KkMm]?)\s+subscribers'
                }
            }
        }
        
    async def scan_for_leads(
        self,
        platforms: List[str],
        keywords: List[str],
        min_followers: int = 1000,
        max_results: int = 50
    ) -> Dict[str, Any]:
        """
        Scan multiple platforms for potential leads
        
        Args:
            platforms: List of platform names to scan (instagram, tiktok, youtube)
            keywords: Search keywords (e.g., 'live streamer', 'content creator')
            min_followers: Minimum follower count to include
            max_results: Maximum number of leads to return per platform
            
        Returns:
            Dictionary with scan results and statistics
        """
        results = {
            'total_found': 0,
            'by_platform': {},
            'leads': [],
            'scan_time': datetime.now(timezone.utc).isoformat(),
            'keywords': keywords,
            'filters': {
                'min_followers': min_followers,
                'platforms': platforms
            }
        }
        
        # Validate platforms
        valid_platforms = [p for p in platforms if p.lower() in self.platforms]
        if not valid_platforms:
            logger.warning(f"No valid platforms specified from: {platforms}")
            return results
        
        # Scan each platform
        for platform in valid_platforms:
            try:
                platform_leads = await self._scan_platform(
                    platform.lower(),
                    keywords,
                    min_followers,
                    max_results
                )
                
                results['by_platform'][platform] = {
                    'found': len(platform_leads),
                    'status': 'success'
                }
                results['leads'].extend(platform_leads)
                results['total_found'] += len(platform_leads)
                
                logger.info(f"Found {len(platform_leads)} leads on {platform}")
                
            except Exception as e:
                logger.error(f"Error scanning {platform}: {e}")
                results['by_platform'][platform] = {
                    'found': 0,
                    'status': 'error',
                    'error': str(e)
                }
        
        return results
    
    async def _scan_platform(
        self,
        platform: str,
        keywords: List[str],
        min_followers: int,
        max_results: int
    ) -> List[Dict[str, Any]]:
        """Scan a specific platform for leads"""
        
        leads = []
        
        # For demo/simulation purposes, generate realistic sample data
        # In production, this would use actual web scraping or API calls
        for keyword in keywords[:3]:  # Limit to first 3 keywords
            sample_leads = self._generate_sample_leads(
                platform,
                keyword,
                min_followers,
                min(max_results // len(keywords), 20)
            )
            leads.extend(sample_leads)
        
        return leads[:max_results]
    
    def _generate_sample_leads(
        self,
        platform: str,
        keyword: str,
        min_followers: int,
        count: int
    ) -> List[Dict[str, Any]]:
        """
        Generate sample leads for demonstration
        In production, this would be replaced with actual web scraping
        """
        import random
        
        leads = []
        
        # Sample influencer names and handles
        sample_names = [
            "Emma Wilson", "James Chen", "Sofia Rodriguez", "Marcus Johnson",
            "Aria Patel", "Lucas Kim", "Isabella Martinez", "Noah Anderson",
            "Mia Thompson", "Ethan Davis", "Olivia Brown", "Liam Garcia"
        ]
        
        for i in range(count):
            name = random.choice(sample_names)
            username = name.lower().replace(' ', '_') + str(random.randint(100, 999))
            
            # Generate realistic follower counts
            if min_followers < 10000:
                followers = random.randint(min_followers, min_followers * 5)
            else:
                followers = random.randint(min_followers, min_followers * 2)
            
            # Calculate engagement rate (higher for smaller accounts)
            if followers < 10000:
                engagement = round(random.uniform(3.0, 8.0), 2)
            elif followers < 50000:
                engagement = round(random.uniform(2.0, 5.0), 2)
            else:
                engagement = round(random.uniform(1.0, 3.0), 2)
            
            lead = {
                'name': name,
                'platform': platform,
                'username': username,
                'profile_url': f'https://{platform}.com/{username}',
                'follower_count': followers,
                'engagement_rate': engagement,
                'bio': f'{keyword} | Content Creator | {platform.capitalize()} Influencer',
                'email': None,  # Would be extracted if available
                'phone': None,
                'notes': f'Found via keyword search: {keyword}',
                'tags': [keyword, platform, 'potential_host'],
                'discovered_at': datetime.now(timezone.utc).isoformat()
            }
            
            leads.append(lead)
        
        return leads
    
    async def enrich_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enrich a lead with additional information
        This could include email lookup, social media cross-reference, etc.
        """
        enriched = lead_data.copy()
        
        # Try to find email (in production, would use email finder services)
        if not enriched.get('email'):
            # Sample: check if bio or profile contains email pattern
            bio = enriched.get('bio', '')
            email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', bio)
            if email_match:
                enriched['email'] = email_match.group()
        
        # Add quality score based on metrics
        followers = enriched.get('follower_count', 0)
        engagement = enriched.get('engagement_rate', 0)
        
        quality_score = 0
        if followers >= 50000:
            quality_score += 40
        elif followers >= 10000:
            quality_score += 30
        elif followers >= 5000:
            quality_score += 20
        else:
            quality_score += 10
        
        if engagement >= 5.0:
            quality_score += 40
        elif engagement >= 3.0:
            quality_score += 30
        elif engagement >= 2.0:
            quality_score += 20
        else:
            quality_score += 10
        
        # Bonus for having contact info
        if enriched.get('email'):
            quality_score += 20
        
        enriched['quality_score'] = min(quality_score, 100)
        enriched['enriched_at'] = datetime.now(timezone.utc).isoformat()
        
        return enriched
    
    async def validate_lead(self, lead_data: Dict[str, Any]) -> bool:
        """
        Validate that a lead meets quality standards
        """
        required_fields = ['name', 'platform', 'username', 'profile_url']
        
        # Check required fields
        for field in required_fields:
            if not lead_data.get(field):
                logger.warning(f"Lead missing required field: {field}")
                return False
        
        # Validate follower count
        followers = lead_data.get('follower_count', 0)
        if followers < 1000:
            logger.debug(f"Lead {lead_data.get('username')} below follower threshold")
            return False
        
        # Check for suspicious patterns
        username = lead_data.get('username', '')
        if len(username) < 3 or not re.match(r'^[a-zA-Z0-9._]+$', username):
            logger.warning(f"Invalid username format: {username}")
            return False
        
        return True


# Singleton instance
lead_scanner_service = LeadScannerService()
