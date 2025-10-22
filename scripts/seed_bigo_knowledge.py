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

# Curated list of official BIGO Live resources
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
    # Add more official bigo.tv URLs here as needed
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
    
    try:
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
                
                print(f"Processing: {title} ({url})")
                
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
        
        print(f"\n✅ Successfully seeded {len(BIGO_URLS)} entries into BIGO knowledge base")
        
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
