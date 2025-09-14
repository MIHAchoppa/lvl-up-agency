#!/usr/bin/env python3
"""
Seed script to populate the Level Up Agency database with initial data
"""
import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path so we can import from backend
sys.path.append(str(Path(__file__).parent.parent / 'backend'))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import uuid

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

async def seed_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🌱 Seeding Level Up Agency database...")
    
    # Clear existing data
    await db.tasks.delete_many({})
    await db.rewards.delete_many({})
    await db.announcements.delete_many({})
    await db.channels.delete_many({})
    await db.resources.delete_many({})
    
    # Seed Tasks
    tasks = [
        {
            "id": str(uuid.uuid4()),
            "title": "Submit a 30-sec testimonial",
            "description": "Record a vertical video saying how Level Up helped you grow",
            "points": 10,
            "due_at": datetime.now(timezone.utc) + timedelta(days=7),
            "requires_proof": True,
            "repeat_rule": None,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Complete weekly 5-task streak",
            "description": "Complete 5 different tasks within a week",
            "points": 20,
            "due_at": None,
            "requires_proof": False,
            "repeat_rule": "weekly",
            "created_by": "system",
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Post a collaboration story",
            "description": "Share a story about collaborating with another host",
            "points": 15,
            "due_at": datetime.now(timezone.utc) + timedelta(days=14),
            "requires_proof": True,
            "repeat_rule": None,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Engage with community",
            "description": "Like and comment on 5 posts in the community feed",
            "points": 5,
            "due_at": None,
            "requires_proof": False,
            "repeat_rule": "daily",
            "created_by": "system",
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Share agency flyer",
            "description": "Share the latest agency promotional material on your social media",
            "points": 8,
            "due_at": datetime.now(timezone.utc) + timedelta(days=3),
            "requires_proof": True,
            "repeat_rule": None,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc),
            "active": True
        }
    ]
    
    await db.tasks.insert_many(tasks)
    print(f"✅ Added {len(tasks)} tasks")
    
    # Seed Rewards
    rewards = [
        {
            "id": str(uuid.uuid4()),
            "title": "1,000 Diamonds",
            "cost_points": 200,
            "fulfillment_type": "manual",
            "terms": "Diamonds delivered in-app within 5 business days. Agency will contact you directly.",
            "active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Priority Feature on Agency IG",
            "cost_points": 100,
            "fulfillment_type": "manual",
            "terms": "Your content will be featured on our Instagram story for 24 hours. Submit your best content!",
            "active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "1:1 Content Audit (15 min)",
            "cost_points": 150,
            "fulfillment_type": "manual",
            "terms": "15-minute one-on-one session with a coach to review your content strategy.",
            "active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "5,000 Diamonds",
            "cost_points": 1000,
            "fulfillment_type": "manual",
            "terms": "Premium reward! 5,000 diamonds delivered within 3 business days.",
            "active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Agency Merch Package",
            "cost_points": 300,
            "fulfillment_type": "manual",
            "terms": "Exclusive Level Up Agency merchandise package. Shipping within 2 weeks.",
            "active": True,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.rewards.insert_many(rewards)
    print(f"✅ Added {len(rewards)} rewards")
    
    # Seed Announcements
    announcements = [
        {
            "id": str(uuid.uuid4()),
            "title": "🎉 Welcome to Level Up Agency!",
            "body": "We're excited to have you join our exclusive community! Complete tasks, earn points, and unlock amazing rewards. Let's level up together! 🚀",
            "publish_at": datetime.now(timezone.utc),
            "pinned": True,
            "audience": "all",
            "created_by": "system",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "New Tasks Available",
            "body": "Check out the latest tasks in your dashboard! Don't forget to submit proof where required. Every completed task gets you closer to amazing rewards!",
            "publish_at": datetime.now(timezone.utc) - timedelta(hours=2),
            "pinned": False,
            "audience": "hosts",
            "created_by": "system",
            "created_at": datetime.now(timezone.utc) - timedelta(hours=2)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Weekly Leaderboard Update",
            "body": "Congratulations to our top performers this week! Keep up the amazing work and remember - consistency is key to success. 👑",
            "publish_at": datetime.now(timezone.utc) - timedelta(days=1),
            "pinned": False,
            "audience": "all",
            "created_by": "system",
            "created_at": datetime.now(timezone.utc) - timedelta(days=1)
        }
    ]
    
    await db.announcements.insert_many(announcements)
    print(f"✅ Added {len(announcements)} announcements")
    
    # Seed Community Channels
    channels = [
        {
            "id": str(uuid.uuid4()),
            "name": "📢 Announcements",
            "description": "Official announcements from the agency team",
            "visibility": "public",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "💬 General Chat",
            "description": "General discussion and community chat",
            "visibility": "public",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "🤝 Collaborations",
            "description": "Find partners for collaborations and joint projects",
            "visibility": "public",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "🏆 Wins & Achievements",
            "description": "Share your successes and celebrate others!",
            "visibility": "public",
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.channels.insert_many(channels)
    print(f"✅ Added {len(channels)} community channels")
    
    # Seed Resources
    resources = [
        {
            "id": str(uuid.uuid4()),
            "title": "Getting Started Guide",
            "category": "Start Here",
            "type": "text",
            "content_text": "Welcome to Level Up Agency! This guide will help you understand how to maximize your success...",
            "content_url": None,
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Content Creation Best Practices",
            "category": "Grow",
            "type": "pdf",
            "content_text": None,
            "content_url": "https://example.com/content-guide.pdf",
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Advanced Streaming Techniques",
            "category": "Advanced",
            "type": "video",
            "content_text": None,
            "content_url": "https://example.com/advanced-streaming-video",
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Building Your Personal Brand",
            "category": "Grow",
            "type": "text",
            "content_text": "Your personal brand is your most valuable asset. Here's how to build it effectively...",
            "content_url": None,
            "created_at": datetime.now(timezone.utc),
            "active": True
        }
    ]
    
    await db.resources.insert_many(resources)
    print(f"✅ Added {len(resources)} resources")
    
    print("🎉 Database seeding completed successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())