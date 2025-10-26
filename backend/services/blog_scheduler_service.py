"""
Blog Scheduler Service
Handles automated daily blog generation at random times between 8am-12pm
"""

import asyncio
import random
from datetime import datetime, time, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

class BlogSchedulerService:
    def __init__(self):
        self.db = None
        self.ai_service = None
        self.running = False
        self.task = None
        
    def set_dependencies(self, db, ai_service):
        """Set database and AI service dependencies"""
        self.db = db
        self.ai_service = ai_service
    
    async def start(self):
        """Start the blog scheduler"""
        if self.running:
            logger.warning("Blog scheduler already running")
            return
        
        self.running = True
        self.task = asyncio.create_task(self._schedule_loop())
        logger.info("Blog scheduler started")
    
    async def stop(self):
        """Stop the blog scheduler"""
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Blog scheduler stopped")
    
    def _get_next_scheduled_time(self) -> datetime:
        """
        Calculate next scheduled time (random time between 8am-12pm tomorrow)
        Returns UTC datetime
        """
        now = datetime.now(timezone.utc)
        tomorrow = now + timedelta(days=1)
        
        # Random hour between 8-11 (8am-12pm)
        random_hour = random.randint(8, 11)
        random_minute = random.randint(0, 59)
        
        # Create scheduled time for tomorrow
        scheduled_time = tomorrow.replace(
            hour=random_hour,
            minute=random_minute,
            second=0,
            microsecond=0
        )
        
        return scheduled_time
    
    async def _schedule_loop(self):
        """Main scheduling loop"""
        while self.running:
            try:
                # Calculate next run time
                next_run = self._get_next_scheduled_time()
                logger.info(f"Next blog generation scheduled for: {next_run}")
                
                # Wait until scheduled time
                now = datetime.now(timezone.utc)
                wait_seconds = (next_run - now).total_seconds()
                
                if wait_seconds > 0:
                    await asyncio.sleep(wait_seconds)
                
                # Generate blog if still running
                if self.running:
                    await self._generate_daily_blog()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in blog scheduler loop: {e}")
                # Wait 1 hour before retrying on error
                await asyncio.sleep(3600)
    
    async def _generate_daily_blog(self):
        """Generate and publish a daily blog post"""
        try:
            logger.info("Starting daily blog generation...")
            
            # Get a random topic from a predefined list or generate one
            topics = await self._get_blog_topics()
            topic = random.choice(topics) if topics else self._get_random_topic()
            
            logger.info(f"Generating blog about: {topic['title']}")
            
            # Import the blog generation function
            from routers.blog_router import generate_blog_with_ai, build_link_pyramid, extract_links, generate_slug, Blog, BlogStatus
            import uuid
            
            # Create generation request
            class GenRequest:
                def __init__(self):
                    self.topic = topic['title']
                    self.category = topic['category']
                    self.keywords = topic.get('keywords', [])
                    self.tone = topic.get('tone', 'professional')
                    self.length = topic.get('length', 'medium')
                    self.include_user_profile = topic.get('include_user_profile')
            
            request = GenRequest()
            
            # Get admin user for attribution
            admin_user = await self.db.users.find_one({"role": "admin"})
            if not admin_user:
                admin_user = await self.db.users.find_one({"role": "owner"})
            
            if not admin_user:
                logger.error("No admin user found for blog generation")
                return
            
            # Generate blog content with AI
            ai_generated = await generate_blog_with_ai(request, admin_user.get('name', 'Level Up Agency'))
            
            # Build link pyramid
            enhanced_content = await build_link_pyramid(ai_generated['content'], request.category)
            
            # Extract links
            bigo_links, internal_links = extract_links(enhanced_content)
            
            # Generate unique slug
            slug = generate_slug(ai_generated['title'])
            existing = await self.db.blogs.find_one({"slug": slug})
            if existing:
                slug = f"{slug}-{str(uuid.uuid4())[:8]}"
            
            # Create blog and auto-publish
            blog = Blog(
                title=ai_generated['title'],
                slug=slug,
                excerpt=ai_generated['excerpt'],
                content=enhanced_content,
                author=admin_user.get('name', 'Level Up Agency'),
                author_id=admin_user['id'],
                author_bigo_id=admin_user.get('bigo_id'),
                status=BlogStatus.PUBLISHED,
                category=request.category,
                tags=ai_generated.get('tags', []),
                read_time=ai_generated.get('read_time', '5 min read'),
                published_at=datetime.now(timezone.utc),
                generated_by_ai=True,
                auto_generated=True,
                seo_keywords=ai_generated.get('seo_keywords', []),
                meta_description=ai_generated.get('meta_description', ''),
                internal_links=internal_links,
                bigo_profile_links=bigo_links
            )
            
            result = await self.db.blogs.insert_one(blog.dict())
            logger.info(f"Daily blog published successfully: {blog.title} (ID: {blog.id})")
            
        except Exception as e:
            logger.error(f"Error generating daily blog: {e}", exc_info=True)
    
    async def _get_blog_topics(self) -> list:
        """Get potential blog topics from database (optional future feature)"""
        try:
            # Check if there's a blog_topics collection
            topics = await self.db.blog_topics.find({"active": True}).to_list(100)
            return topics
        except:
            return []
    
    def _get_random_topic(self) -> dict:
        """Get a random blog topic from predefined list"""
        topics = [
            {
                "title": "How to Increase Your BIGO Live Earnings This Week",
                "category": "Monetization",
                "keywords": ["BIGO earnings", "beans", "gifts", "monetization"],
                "tone": "inspirational",
                "length": "medium"
            },
            {
                "title": "Top 5 PK Battle Strategies for BIGO Live Hosts",
                "category": "Strategy",
                "keywords": ["PK battles", "competition", "strategy", "winning"],
                "tone": "professional",
                "length": "medium"
            },
            {
                "title": "Building a Loyal Fanbase on BIGO Live",
                "category": "Community",
                "keywords": ["fans", "community", "engagement", "loyalty"],
                "tone": "professional",
                "length": "long"
            },
            {
                "title": "Essential Streaming Equipment for BIGO Live Success",
                "category": "Equipment",
                "keywords": ["equipment", "setup", "camera", "lighting"],
                "tone": "professional",
                "length": "medium"
            },
            {
                "title": "Creative Content Ideas for Your BIGO Live Stream",
                "category": "Content",
                "keywords": ["content ideas", "creativity", "streaming", "engagement"],
                "tone": "casual",
                "length": "medium"
            },
            {
                "title": "Understanding BIGO Live's Gift System and Rewards",
                "category": "Monetization",
                "keywords": ["gifts", "rewards", "beans", "monetization"],
                "tone": "professional",
                "length": "long"
            },
            {
                "title": "How to Handle Negativity While Streaming on BIGO Live",
                "category": "Mental Health",
                "keywords": ["mental health", "trolls", "negativity", "wellbeing"],
                "tone": "inspirational",
                "length": "medium"
            },
            {
                "title": "Best Times to Stream on BIGO Live for Maximum Viewers",
                "category": "Strategy",
                "keywords": ["timing", "viewers", "schedule", "optimization"],
                "tone": "professional",
                "length": "short"
            },
            {
                "title": "Collaborating with Other BIGO Hosts: Benefits and Tips",
                "category": "Community",
                "keywords": ["collaboration", "networking", "partnerships", "growth"],
                "tone": "professional",
                "length": "medium"
            },
            {
                "title": "Creating Engaging Thumbnails for Your BIGO Profile",
                "category": "Branding",
                "keywords": ["thumbnails", "branding", "visual", "profile"],
                "tone": "casual",
                "length": "short"
            },
            {
                "title": "Mastering Your On-Camera Presence for BIGO Live",
                "category": "Performance",
                "keywords": ["on-camera", "presence", "confidence", "performance"],
                "tone": "inspirational",
                "length": "medium"
            },
            {
                "title": "How to Use BIGO Live Events to Boost Your Income",
                "category": "Events",
                "keywords": ["events", "income", "participation", "rewards"],
                "tone": "professional",
                "length": "medium"
            }
        ]
        
        return random.choice(topics)
    
    async def generate_now(self):
        """Manually trigger blog generation (for testing or admin use)"""
        await self._generate_daily_blog()

# Singleton instance
blog_scheduler = BlogSchedulerService()
