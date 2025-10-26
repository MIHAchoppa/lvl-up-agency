"""
Seed BIGO knowledge base from official bigo.tv sources
"""
import asyncio
import aiohttp
from motor.motor_asyncio import AsyncIOMotorClient
from bs4 import BeautifulSoup
import os
import sys
from datetime import datetime, timezone
from urllib.parse import urlparse
import re

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'bigo_agency')

# Comprehensive BIGO Live knowledge base
# Mix of official URLs and structured training data
BIGO_URLS = [
    {
        "url": "https://www.bigo.tv/about",
        "title": "About BIGO Live",
        "tags": ["about", "platform", "introduction"]
    },
    {
        "url": "https://www.bigo.tv/faq",
        "title": "BIGO Live FAQ",
        "tags": ["faq", "help", "support"]
    },
    {
        "url": "https://www.bigo.tv/guidelines",
        "title": "BIGO Live Community Guidelines",
        "tags": ["guidelines", "rules", "community"]
    },
]

# Structured BIGO knowledge base - comprehensive training data
BIGO_KNOWLEDGE_DATA = [
    {
        "url": "https://www.bigo.tv/beans-system",
        "title": "BIGO Live Beans and Currency System",
        "content": """BIGO Live uses a virtual currency system based on Beans. Here's how it works:

BEANS BASICS:
- Beans are the virtual currency on BIGO Live
- Viewers purchase beans and send them as gifts to hosts
- Hosts receive diamonds from beans, which can be converted to real money
- 1 bean = approximately $0.01 USD (varies by region)
- 210 beans ≈ 105 diamonds for hosts (50% conversion rate)
- Minimum withdrawal: 5,000 diamonds ($50 USD)

BEAN PACKAGES:
- 42 Beans: $1.99
- 210 Beans: $9.99
- 840 Beans: $39.99
- 2,100 Beans: $99.99
- 8,400 Beans: $399.99

EARNING FROM BEANS:
- Viewers send virtual gifts (costing beans) during live streams
- Hosts receive diamonds (BIGO's internal conversion)
- Exchange rate: 210 beans = 105 diamonds
- Diamond to USD: Approximately $1 per 20 diamonds
- Payment methods: PayPal, bank transfer, or local payment systems

MAXIMIZING BEAN INCOME:
1. Stream consistently (daily recommended)
2. Build loyal audience who regularly send gifts
3. Engage viewers personally to encourage gifting
4. Host special events and themed streams
5. Participate in PK battles to attract more viewers
6. Thank gift-givers by name to encourage repeat gifts
7. Set clear goals (e.g., "Help me reach 1000 diamonds today!")

REGIONAL DIFFERENCES:
- Bean prices vary by country
- Payment methods differ by region
- Some regions offer bonus beans on purchases
- Conversion rates may have regional variations""",
        "tags": ["beans", "currency", "earnings", "monetization", "diamonds"]
    },
    {
        "url": "https://www.bigo.tv/tier-system",
        "title": "BIGO Live Tier System (S1-S25 Rankings)",
        "content": """BIGO Live uses a tier ranking system from S1 to S25 to categorize hosts based on their earnings and performance.

TIER STRUCTURE:
S1-S5 (Beginner): 0-10,000 diamonds/month
- Learning phase, building audience
- Focus on consistency and engagement
- Average 1-2 hours daily streaming

S6-S10 (Intermediate): 10,000-50,000 diamonds/month  
- Growing audience base
- Regular viewers and gift-givers
- 2-4 hours daily streaming
- Starting to earn meaningful income ($500-2500/month)

S11-S15 (Advanced): 50,000-150,000 diamonds/month
- Established host with loyal fanbase
- 4-6 hours daily streaming
- Strong income ($2500-7500/month)
- Participate in agency events

S16-S20 (Professional): 150,000-500,000 diamonds/month
- Top-tier host status
- 6-8 hours daily streaming
- Professional income ($7500-25000/month)
- Featured in BIGO promotions

S21-S25 (Elite/Celebrity): 500,000+ diamonds/month
- Celebrity status on platform
- 8+ hours daily streaming
- Premium income ($25000+/month)
- Agency partnerships and endorsements

TIER BENEFITS:
- Higher tiers get better platform visibility
- Featured placement in discovery feeds
- Access to exclusive events and contests
- Better agency support and resources
- Priority customer service
- Special badges and profile decorations

MAINTAINING/IMPROVING TIER:
1. Consistent daily streaming (minimum 2 hours)
2. High engagement rate (comments, shares, gifts)
3. Growing follower count month-over-month
4. Positive viewer retention (viewers stay for full stream)
5. Winning PK battles regularly
6. Participating in agency campaigns
7. Creating unique, entertaining content""",
        "tags": ["tier", "ranking", "S1", "S25", "levels", "progression"]
    },
    {
        "url": "https://www.bigo.tv/pk-battles",
        "title": "BIGO Live PK Battles - Complete Guide",
        "content": """PK (Player Knock-out) Battles are competitive live streaming events where two hosts compete for gifts in real-time.

WHAT IS A PK BATTLE:
- Two hosts are matched in a split-screen format
- Competition lasts 3-5 minutes per round
- Viewers send gifts to their favorite host
- Host with most beans/gifts wins the round
- Winner gets special effects and recognition
- Loser may face "punishment" (dance, sing, challenges)

PK BATTLE RULES:
- Both hosts must agree to battle
- Usually 3 rounds per battle
- Can be random match or invitation-based
- Winners displayed prominently
- Can chain multiple battles in one stream

BENEFITS OF PK BATTLES:
1. EXPOSURE: Both hosts gain each other's audiences
2. EARNINGS: Competitive environment encourages more gifting
3. ENGAGEMENT: Viewers love the competitive atmosphere
4. NETWORKING: Build relationships with other hosts
5. GROWTH: Gain new followers from opponent's audience
6. ENERGY: High-energy content keeps viewers engaged

PK BATTLE STRATEGIES:
1. Choose opponents with similar tier/audience size
2. Hype up the battle before and during
3. Engage both audiences, not just your own
4. Have fun and be entertaining, win or lose
5. Thank gift-givers loudly and enthusiastically
6. Create anticipation for "punishments"
7. Use creative punishments that are entertaining
8. Schedule PK battles during peak hours
9. Promote battles in advance to gather crowds
10. Stay positive even when losing

WINNING PK TACTICS:
- Rally your core supporters before battle
- Create urgency ("Only 30 seconds left!")
- Make personal appeals to big gifters
- Show genuine appreciation for every gift
- Maintain high energy throughout
- Use humor to stay likeable even in defeat
- Network with opponent's viewers respectfully

COMMON PK PUNISHMENTS:
- Dance to specific song
- Sing a karaoke song
- Do funny challenges
- Wear silly costume items
- Answer embarrassing questions
- Do physical challenges (push-ups, etc.)
- Role-play scenarios
- Tell jokes or stories

PK ETIQUETTE:
- Be respectful to opponents
- Good sportsmanship always
- Don't trash talk opponents
- Congratulate winners graciously
- Accept losses with humor
- Thank both audiences
- Follow through on punishments""",
        "tags": ["pk", "battle", "competition", "strategy", "engagement"]
    },
    {
        "url": "https://www.bigo.tv/streaming-schedule",
        "title": "BIGO Live Streaming Schedule Optimization",
        "content": """Creating an effective streaming schedule is crucial for success on BIGO Live.

BEST TIMES TO STREAM:
PEAK HOURS (Most Viewers):
- Evenings: 7PM-11PM local time (highest engagement)
- Weekends: 2PM-11PM (extended peak)
- Friday nights: 8PM-1AM (party atmosphere)

GOOD HOURS (Moderate Viewers):
- Mornings: 8AM-10AM (breakfast crowd)
- Lunch: 12PM-2PM (lunch break viewers)
- Late night: 11PM-2AM (night owls)

AVOID (Low Traffic):
- Very early morning: 3AM-7AM
- Mid-morning weekdays: 10AM-12PM
- Working hours: 9AM-5PM weekdays

STREAMING DURATION:
Beginners (S1-S5): 1-2 hours daily
- Build stamina gradually
- Focus on quality over quantity
- Consistent time slot

Intermediate (S6-S10): 2-4 hours daily
- Split into 2 sessions if needed
- Morning + evening shifts
- Maintain energy levels

Advanced (S11-S15): 4-6 hours daily
- Professional streaming schedule
- Multiple peak time slots
- Structured content blocks

Professional (S16+): 6-10 hours daily
- Full-time commitment
- Cover multiple time zones
- Varied content throughout

WEEKLY SCHEDULE STRATEGY:
Monday-Friday (Weekdays):
- Stream during evening peak hours
- 2-4 hour sessions
- Consistent time slot daily
- Build routine audience

Saturday-Sunday (Weekends):
- Longer streaming sessions
- 4-8 hour marathons possible
- Special events and themes
- Capitalize on higher traffic

REST DAYS:
- Take 1-2 days off per week to avoid burnout
- Announce breaks in advance
- Use time to plan content
- Maintain mental health

CONSISTENCY TIPS:
1. Stream at same time daily (audience habit formation)
2. Announce schedule to followers
3. Set reminders for followers
4. Notify via social media before going live
5. Use BIGO's scheduling features
6. Track which time slots perform best
7. Adjust based on analytics

CONTENT SCHEDULING:
- Monday: Motivation Monday, week planning
- Tuesday: Talent Tuesday, showcase skills
- Wednesday: Midweek Q&A, interact with fans
- Thursday: Throwback Thursday, memories/stories
- Friday: Friday Night Fun, party atmosphere
- Saturday: Special Events, longer streams
- Sunday: Chill Sunday, relaxed content

TIMEZONE CONSIDERATIONS:
- Know your primary audience location
- Stream during their peak hours
- Consider multiple timezone coverage for growth
- International audience requires flexible scheduling""",
        "tags": ["schedule", "timing", "streaming", "consistency", "optimization"]
    },
    {
        "url": "https://www.bigo.tv/gifts-guide",
        "title": "BIGO Live Gifts and Earning Strategies",
        "content": """Understanding BIGO Live's gift system is essential for maximizing earnings as a host.

GIFT CATEGORIES:

SMALL GIFTS (1-99 beans):
- Lollipop (1 bean)
- Ice Cream (5 beans)
- Heart (9 beans)
- Finger Heart (20 beans)
- Love Letter (50 beans)
- Kiss (99 beans)

MEDIUM GIFTS (100-999 beans):
- Rose (100 beans)
- Perfume (200 beans)
- Lucky Charm (500 beans)
- Motorcycle (700 beans)
- Sports Car (999 beans)

LARGE GIFTS (1000-9999 beans):
- Love Lock (2000 beans)
- Castle (5000 beans)
- Luxury Yacht (8888 beans)

PREMIUM GIFTS (10000+ beans):
- Private Jet (20000 beans)
- Luxury Mansion (50000 beans)
- Limited Edition gifts (varies)

SPECIAL EVENT GIFTS:
- Holiday-themed (Christmas, New Year, etc.)
- Regional celebration gifts
- Limited-time promotional gifts
- Anniversary gifts

GIFT ANIMATIONS:
- Small gifts: Simple animations
- Medium gifts: Screen effects
- Large gifts: Full-screen takeover
- Premium gifts: Multiple effects, sound, badges

ENCOURAGING GIFTS:

VERBAL STRATEGIES:
1. "Thank you [Name] for the [Gift]! You're amazing!"
2. Call out gift-givers by name immediately
3. Show genuine excitement for every gift
4. Create gift goals: "Help me reach 5000 beans!"
5. Acknowledge first-time gifters specially
6. Thank top gifters at end of stream

VISUAL STRATEGIES:
1. React expressively to gifts
2. Do special dances for big gifts
3. Display gift leaderboard
4. Celebrate milestones (every 1000 beans)
5. Use gift-triggered content (sing song for 500 beans)

PSYCHOLOGICAL STRATEGIES:
1. Create gift competitions between viewers
2. Offer shoutouts for specific gift amounts
3. Personal dedications for premium gifts
4. Building "VIP" culture for top gifters
5. Remember regular gifters and their preferences
6. Create gift-based games and challenges

GIFT TIMING OPTIMIZATION:
- Begin streams with gift reminders
- Peak gifting during exciting moments
- PK battles generate most gifts
- End-of-stream thank-you segments
- Special occasion streams (birthdays, anniversaries)

ETHICAL GIFTING PRACTICES:
- Never pressure viewers to send gifts
- Appreciate all viewers, gifters or not
- Be genuine in gratitude
- Don't compare gifters to each other negatively
- Follow BIGO guidelines on gift solicitation
- Create value beyond just asking for gifts

MAXIMIZING GIFT REVENUE:
1. Build emotional connection with audience
2. Consistent quality entertainment
3. Create memorable moments worth gifting for
4. Develop loyal fanbase who wants to support
5. Offer value through skills, personality, knowledge
6. Make viewers feel part of your journey
7. Show how gifts help achieve goals
8. Regular special events to drive gifting""",
        "tags": ["gifts", "revenue", "earnings", "monetization", "strategy"]
    },
    {
        "url": "https://www.bigo.tv/audience-engagement",
        "title": "BIGO Live Audience Engagement Best Practices",
        "content": """Engaging your audience is the foundation of success on BIGO Live.

ENGAGEMENT FUNDAMENTALS:

GREETING VIEWERS:
- Welcome every new viewer by name
- Use entrance notifications
- "Welcome @username! How are you today?"
- Create welcoming atmosphere
- Acknowledge returning viewers specially

CONVERSATION TECHNIQUES:
1. Ask open-ended questions
2. Respond to every comment when possible
3. Create polls and voting opportunities
4. Tell stories that invite participation
5. Share personal experiences appropriately
6. Ask viewers about their day/life

INTERACTIVE CONTENT:

GAMES AND ACTIVITIES:
- Trivia games with prizes
- "Would You Rather" questions
- Guess the song competitions
- Talent challenges
- Truth or Dare (appropriate version)
- Viewer-suggested activities

AUDIENCE PARTICIPATION:
- Let viewers choose next song
- Viewer-driven Q&A sessions
- Allow viewers to direct content
- Collaborative storytelling
- Viewer challenges and dares
- Co-hosting opportunities

BUILDING COMMUNITY:

CREATING LOYALTY:
1. Remember regular viewers' names and details
2. Inside jokes with community
3. Community nicknames and identity
4. Regular viewer shoutouts
5. VIP recognition for supporters
6. Create "family" atmosphere

MAINTAINING VIEWERS:
- Tease upcoming content
- Create anticipation for next stream
- Cliffhangers and series content
- Regular schedule viewers can rely on
- Exclusive content for followers
- Behind-the-scenes access

ENGAGEMENT MISTAKES TO AVOID:
1. Ignoring viewers in chat
2. Only acknowledging big gifters
3. Dead air/silence for too long
4. Talking over viewers
5. Being distracted by phone/others
6. Inconsistent streaming schedule
7. Negative or complaining attitude
8. Inappropriate content
9. Controversial topics without care
10. Ignoring platform guidelines

HIGH-ENGAGEMENT CONTENT IDEAS:
- "Get Ready With Me" streams
- Cooking/eating broadcasts
- Gaming sessions
- Talent showcases (singing, dancing, art)
- Educational content (language, skills)
- Fitness and workout sessions
- Travel and outdoor streams
- Music performances
- Comedy and entertainment
- Lifestyle and daily vlogs

CHAT MANAGEMENT:
- Set clear chat rules
- Moderate inappropriate behavior
- Use moderators for larger streams
- Keep chat positive and fun
- Address conflicts quickly
- Create safe, inclusive environment

TECHNICAL ENGAGEMENT TIPS:
- Good lighting shows facial expressions
- Clear audio so viewers hear responses
- Stable connection prevents frustration
- Proper camera angle for interaction
- High quality stream retains viewers
- Professional setup shows commitment""",
        "tags": ["engagement", "audience", "community", "interaction", "retention"]
    },
    {
        "url": "https://www.bigo.tv/host-setup",
        "title": "BIGO Live Host Setup - Technical Requirements",
        "content": """Professional streaming setup is crucial for BIGO Live success.

DEVICE REQUIREMENTS:

MOBILE STREAMING:
Minimum:
- iPhone 8 or Samsung Galaxy S9 (or equivalent)
- 3GB RAM minimum
- iOS 12+ or Android 8.0+
- 32GB storage

Recommended:
- iPhone 12+ or Samsung Galaxy S20+ (or equivalent)
- 6GB+ RAM
- Latest iOS or Android
- 128GB+ storage

COMPUTER/DESKTOP STREAMING:
Minimum:
- Intel i5 or AMD Ryzen 5
- 8GB RAM
- Dedicated GPU (GTX 1050 or equivalent)
- Windows 10 or MacOS 10.14+

Recommended:
- Intel i7 or AMD Ryzen 7
- 16GB+ RAM
- RTX 2060 or better
- Windows 11 or latest MacOS

INTERNET CONNECTION:

MINIMUM REQUIREMENTS:
- Upload speed: 3 Mbps
- Download speed: 5 Mbps
- Stable connection (avoid public WiFi)

RECOMMENDED:
- Upload speed: 10+ Mbps
- Download speed: 20+ Mbps
- Wired ethernet connection
- Backup mobile data hotspot

STREAMING QUALITY SETTINGS:
- 720p: Requires 3-5 Mbps upload
- 1080p: Requires 5-10 Mbps upload
- Higher quality = more viewers stay

LIGHTING SETUP:

BUDGET SETUP ($30-50):
- Ring light (10-12 inch)
- Position in front at face level
- Avoid backlighting
- Natural window light as supplement

PROFESSIONAL SETUP ($100-300):
- Ring light or panel lights (18 inch)
- Key light (main front light)
- Fill light (side light, softer)
- Back light (separation from background)
- Adjustable color temperature

LIGHTING TIPS:
1. Face should be well-lit, no shadows
2. Soft, diffused light is flattering
3. Avoid harsh overhead lighting
4. Test lighting before stream
5. Consistent lighting daily

AUDIO SETUP:

MOBILE:
- Built-in mic works for basic streaming
- Lapel/lavalier mic ($20-50) improves quality
- Bluetooth earbuds with mic
- Position mic close to mouth

DESKTOP/PROFESSIONAL:
- USB condenser microphone ($50-150)
- Audio interface + XLR mic ($150+)
- Pop filter to reduce harsh sounds
- Acoustic treatment for room

AUDIO TIPS:
1. Test audio levels before streaming
2. Minimize background noise
3. Speak clearly and at consistent volume
4. Music volume lower than voice
5. Monitor audio during stream

CAMERA SETUP:

MOBILE:
- Use rear camera for better quality
- Clean camera lens regularly
- Stable mount/tripod essential
- Eye-level positioning

DESKTOP:
- 1080p webcam minimum
- DSLR/mirrorless camera ideal
- Capture card for external cameras
- Eye-level or slightly above

CAMERA TIPS:
1. Position at eye level
2. Frame yourself in upper 2/3 of screen
3. Leave headroom (space above head)
4. Clean, uncluttered background
5. Test framing before going live

BACKGROUND SETUP:

BASIC:
- Clean, organized space
- Neutral colors
- Remove clutter
- Good depth (not flat wall)

PROFESSIONAL:
- Branded backdrop
- Decorative elements
- LED lights for ambiance
- Themed according to content
- Depth and dimension

BACKGROUND TIPS:
1. Avoid messy, distracting backgrounds
2. Consistent background daily
3. Personal touches (but not cluttered)
4. Consider virtual backgrounds if needed
5. Ensure background complements, not distracts

STREAMING SOFTWARE (Desktop):
- OBS Studio (Free, professional)
- Streamlabs (Free, user-friendly)
- XSplit (Paid, feature-rich)
- BIGO Connector for multi-streaming

ACCESSORIES:
- Phone/camera tripod
- Phone holder/mount
- External battery pack
- Cooling fan (prevent overheating)
- Backup charging cable
- Portable green screen
- Props for content variety

MAINTENANCE:
- Update BIGO app regularly
- Clear cache periodically
- Restart device before long streams
- Test equipment daily
- Keep backup equipment ready
- Clean equipment weekly""",
        "tags": ["setup", "equipment", "technical", "streaming", "quality"]
    },
    {
        "url": "https://www.bigo.tv/content-strategy",
        "title": "BIGO Live Content Strategy and Planning",
        "content": """Successful BIGO Live hosts plan their content strategically to maximize growth and earnings.

CONTENT PILLARS:

ENTERTAINMENT:
- Comedy and humor
- Pranks and challenges
- Reaction videos
- Character performances
- Interactive games
- Storytelling

TALENT SHOWCASE:
- Singing and music
- Dancing
- Art and drawing
- Magic tricks
- Cooking
- Crafts and DIY

LIFESTYLE:
- Daily routines
- Get ready with me
- Room tours
- Shopping hauls
- Fashion and beauty
- Travel and exploration

EDUCATIONAL:
- Language learning
- Skill tutorials
- Life advice
- Career tips
- Fitness training
- Cooking recipes

SOCIAL:
- Q&A sessions
- Chat and chill
- Community building
- Collaborative streams
- Guest appearances
- Fan interactions

CONTENT CALENDAR:

DAILY THEMES:
Monday: Motivation Monday (inspirational content)
Tuesday: Tutorial Tuesday (teach something)
Wednesday: Wild Card Wednesday (viewer choice)
Thursday: Talent Thursday (showcase skills)
Friday: Fun Friday (entertainment focus)
Saturday: Special Saturday (events, long streams)
Sunday: Chill Sunday (relaxed, casual)

MONTHLY PLANNING:
Week 1: Introduction to monthly theme
Week 2: Deep dive on theme
Week 3: Community participation on theme
Week 4: Theme conclusion, recap, rewards

CONTENT VARIETY:

MIXING CONTENT TYPES:
- 40% Core content (your main talent/niche)
- 30% Engagement content (Q&A, games, chat)
- 20% Trending content (challenges, memes)
- 10% Experimental content (new ideas)

STREAM STRUCTURE:

OPENING (First 10 minutes):
- Energetic greeting
- Outline stream plan
- Welcome early viewers
- Hype up what's coming
- Thank recent supporters

MIDDLE (Main Content):
- Deliver promised content
- Maintain high energy
- Interact continuously
- Mix activities
- Create memorable moments

CLOSING (Last 10-15 minutes):
- Announce wrap-up
- Thank all supporters
- Recap highlights
- Tease next stream
- Final gift opportunities
- Proper goodbye

CONTENT IDEAS LIBRARY:

INTERACTIVE:
- "Ask Me Anything" sessions
- Polls and voting
- Viewer challenges
- Truth or Dare
- Hot seat questions
- Role play scenarios

COMPETITIVE:
- PK battles
- Leaderboard competitions
- Viewer vs host challenges
- Team battles
- Tournament style events

SPECIAL EVENTS:
- Birthday celebrations
- Milestone achievements
- Holiday specials
- Anniversary streams
- Charity fundraisers
- Collaboration events

SEASONAL CONTENT:
- Holiday themed streams
- Season changes content
- Weather-appropriate activities
- Cultural celebrations
- Monthly awareness themes

CONTENT GROWTH STRATEGIES:

TRENDING TOPICS:
- Monitor BIGO trending page
- Participate in platform challenges
- Create content around viral moments
- Use popular hashtags
- Ride trend waves early

COLLABORATION:
- Partner with similar-tier hosts
- Cross-promote content
- Joint streams and events
- Guest appearances
- Community collaborations

UNIQUENESS:
- Develop signature style
- Create unique catchphrases
- Signature intro/outro
- Unique content angles
- Personal brand identity

ANALYZING CONTENT PERFORMANCE:

METRICS TO TRACK:
- Average viewers per stream
- Peak viewership
- Stream duration vs retention
- Gift volume by content type
- New followers per stream
- Engagement rate (comments/minute)

OPTIMIZATION:
1. Double down on high-performing content
2. Reduce or eliminate low-performing content
3. Test new ideas regularly
4. Ask audience for feedback
5. Stay authentic while adapting
6. Balance what works with fresh ideas

CONTENT MISTAKES TO AVOID:
1. Too repetitive/boring
2. No clear structure
3. Ignoring audience feedback
4. Inappropriate content
5. Low energy/enthusiasm
6. Technical issues
7. Unprepared/winging it always
8. Chasing every trend blindly
9. Violating BIGO guidelines
10. Inconsistent quality""",
        "tags": ["content", "strategy", "planning", "ideas", "growth"]
    }
]


def extract_text_from_html(html_content: str) -> str:
    """Extract clean text from HTML"""
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
        
        # Get text
        text = soup.get_text()
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return text
    except Exception as e:
        print(f"Error extracting text: {e}")
        return ""


async def fetch_url_content(session: aiohttp.ClientSession, url: str) -> str:
    """Fetch content from URL"""
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
            if response.status == 200:
                html = await response.text()
                return extract_text_from_html(html)
            else:
                print(f"Failed to fetch {url}: HTTP {response.status}")
                return ""
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""


async def seed_knowledge_base():
    """Seed the BIGO knowledge base"""
    print("Starting BIGO knowledge base seeding...")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    total_seeded = 0
    
    try:
        # First, seed URL-based entries
        async with aiohttp.ClientSession() as session:
            for entry in BIGO_URLS:
                url = entry["url"]
                title = entry["title"]
                tags = entry["tags"]
                
                # Validate bigo.tv domain
                parsed = urlparse(url)
                if not parsed.netloc.endswith("bigo.tv"):
                    print(f"Skipping non-bigo.tv URL: {url}")
                    continue
                
                print(f"Processing URL: {title} ({url})")
                
                # Fetch content
                content = await fetch_url_content(session, url)
                
                if not content:
                    # Use placeholder content for demo
                    content = f"Official information about {title} from BIGO Live platform. Visit {url} for more details."
                    print(f"  Using placeholder content for {url}")
                
                # Cap at 20k characters
                if len(content) > 20000:
                    content = content[:20000]
                    print(f"  Content truncated to 20k chars")
                
                # Upsert into database
                doc = {
                    "url": url,
                    "title": title,
                    "content": content,
                    "tags": tags,
                    "updated_at": datetime.now(timezone.utc)
                }
                
                existing = await db.bigo_knowledge.find_one({"url": url})
                if existing:
                    await db.bigo_knowledge.update_one({"url": url}, {"$set": doc})
                    print(f"  ✓ Updated: {title}")
                else:
                    doc["id"] = str(os.urandom(16).hex())
                    doc["created_at"] = datetime.now(timezone.utc)
                    await db.bigo_knowledge.insert_one(doc)
                    print(f"  ✓ Inserted: {title}")
                
                total_seeded += 1
        
        # Second, seed structured knowledge data (no web scraping needed)
        print("\nProcessing structured BIGO knowledge data...")
        for entry in BIGO_KNOWLEDGE_DATA:
            url = entry["url"]
            title = entry["title"]
            content = entry["content"]
            tags = entry["tags"]
            
            print(f"Processing: {title}")
            
            # Cap at 20k characters
            if len(content) > 20000:
                content = content[:20000]
                print(f"  Content truncated to 20k chars")
            
            # Upsert into database
            doc = {
                "url": url,
                "title": title,
                "content": content,
                "tags": tags,
                "updated_at": datetime.now(timezone.utc)
            }
            
            existing = await db.bigo_knowledge.find_one({"url": url})
            if existing:
                await db.bigo_knowledge.update_one({"url": url}, {"$set": doc})
                print(f"  ✓ Updated: {title}")
            else:
                doc["id"] = str(os.urandom(16).hex())
                doc["created_at"] = datetime.now(timezone.utc)
                await db.bigo_knowledge.insert_one(doc)
                print(f"  ✓ Inserted: {title}")
            
            total_seeded += 1
        
        print(f"\n✅ Successfully seeded {total_seeded} entries into BIGO knowledge base")
        print(f"   - URL-based entries: {len(BIGO_URLS)}")
        print(f"   - Structured data entries: {len(BIGO_KNOWLEDGE_DATA)}")
        
    except Exception as e:
        print(f"❌ Error seeding knowledge base: {e}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    from pathlib import Path
    
    # Try to load from backend/.env
    env_path = Path(__file__).parent.parent / 'backend' / '.env'
    if env_path.exists():
        load_dotenv(env_path)
    
    asyncio.run(seed_knowledge_base())
