#!/usr/bin/env python3
"""
Comprehensive seed script for the ultimate BIGO Live host platform
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent / 'backend'))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import uuid

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

async def seed_comprehensive_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🚀 Seeding ULTIMATE BIGO Live Host Platform...")
    
    # Clear existing data
    collections = ['quizzes', 'quiz_questions', 'events', 'ai_chats', 'quota_targets', 
                   'private_messages', 'profile_posts', 'channels', 'resources']
    
    for collection in collections:
        await db[collection].delete_many({})
    
    # Seed BIGO Live Quizzes
    print("📚 Adding BIGO Live Quizzes...")
    
    quizzes = [
        {
            "id": str(uuid.uuid4()),
            "title": "BIGO Live Basics",
            "description": "Master the fundamentals of BIGO Live streaming",
            "category": "beginner",
            "pass_mark": 80,
            "points": 25,
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "PK Battle Mastery",
            "description": "Advanced strategies for dominating PK battles",
            "category": "advanced",
            "pass_mark": 85,
            "points": 50,
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Gift Maximization",
            "description": "Proven techniques to increase viewer gifts",
            "category": "earnings",
            "pass_mark": 80,
            "points": 35,
            "created_at": datetime.now(timezone.utc),
            "active": True
        }
    ]
    
    await db.quizzes.insert_many(quizzes)
    
    # Seed Quiz Questions
    print("❓ Adding Quiz Questions...")
    
    quiz_questions = [
        # BIGO Live Basics Quiz
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quizzes[0]["id"],
            "prompt": "What's the best time to go live on BIGO for maximum audience?",
            "options": ["Early morning (6-8 AM)", "Prime time (7-10 PM)", "Late night (11 PM-2 AM)", "It doesn't matter"],
            "correct_index": 1,
            "explanation": "Prime time (7-10 PM) is when most viewers are active and looking for entertainment."
        },
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quizzes[0]["id"],
            "prompt": "How often should you thank viewers for gifts?",
            "options": ["Only for big gifts", "After every stream", "Immediately for each gift", "Once per hour"],
            "correct_index": 2,
            "explanation": "Thank viewers immediately for each gift to encourage more gifting and show appreciation."
        },
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quizzes[0]["id"],
            "prompt": "What's the most important factor for growing your BIGO audience?",
            "options": ["Expensive equipment", "Consistent streaming schedule", "Perfect English", "Gaming skills"],
            "correct_index": 1,
            "explanation": "Consistency helps viewers know when to find you and builds loyal audience relationships."
        },
        
        # PK Battle Mastery Quiz
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quizzes[1]["id"],
            "prompt": "When should you accept PK battles?",
            "options": ["Always accept every PK", "Only when you have 100+ viewers", "When your audience is engaged", "Never do PKs"],
            "correct_index": 2,
            "explanation": "Accept PKs when your audience is engaged and likely to support you with gifts."
        },
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quizzes[1]["id"],
            "prompt": "What's the key to winning PK battles?",
            "options": ["Having the most followers", "Being the loudest", "Audience engagement and energy", "Expensive gifts only"],
            "correct_index": 2,
            "explanation": "High energy and audience engagement motivate viewers to support you with gifts."
        },
        
        # Gift Maximization Quiz
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quizzes[2]["id"],
            "prompt": "What's the best way to encourage gifts without being pushy?",
            "options": ["Constantly ask for gifts", "Ignore gifts completely", "Show genuine appreciation and create entertaining content", "Only talk to big gifters"],
            "correct_index": 2,
            "explanation": "Genuine appreciation and entertainment value naturally encourage viewers to gift."
        }
    ]
    
    await db.quiz_questions.insert_many(quiz_questions)
    
    # Seed Events Calendar
    print("📅 Adding Events & Calendar Data...")
    
    events = [
        {
            "id": str(uuid.uuid4()),
            "title": "MEGA PK Battle Tournament",
            "description": "Join the ultimate PK battle tournament with $1000 cash prizes!",
            "event_type": "pk",
            "start_time": datetime.now(timezone.utc) + timedelta(days=2),
            "end_time": datetime.now(timezone.utc) + timedelta(days=2, hours=3),
            "timezone_display": "PST",
            "creator_id": "system",
            "creator_bigo_id": "LEVELUP_ADMIN",
            "flyer_url": "https://example.com/pk-tournament-flyer.jpg",
            "bigo_live_link": "https://live.bigo.tv/tournament2025",
            "signup_form_link": "https://forms.google.com/pk-tournament-signup",
            "location": "BIGO Live Platform",
            "max_participants": 100,
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "New Host Training Session",
            "description": "Free training for new BIGO Live hosts - learn the basics and get started!",
            "event_type": "agency",
            "start_time": datetime.now(timezone.utc) + timedelta(days=5),
            "end_time": datetime.now(timezone.utc) + timedelta(days=5, hours=2),
            "timezone_display": "EST",
            "creator_id": "system", 
            "creator_bigo_id": "LEVELUP_COACH",
            "flyer_url": "https://example.com/training-session-flyer.jpg",
            "signup_form_link": "https://forms.google.com/host-training",
            "location": "Zoom Meeting",
            "max_participants": 50,
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Weekend PK Marathon",
            "description": "48-hour PK marathon event with special bonuses and prizes every hour!",
            "event_type": "community",
            "start_time": datetime.now(timezone.utc) + timedelta(days=7),
            "end_time": datetime.now(timezone.utc) + timedelta(days=9),
            "timezone_display": "PST",
            "creator_id": "system",
            "creator_bigo_id": "COMMUNITY_TEAM",
            "flyer_url": "https://example.com/weekend-marathon-flyer.jpg",
            "bigo_live_link": "https://live.bigo.tv/weekend-marathon",
            "location": "BIGO Live Platform",
            "created_at": datetime.now(timezone.utc),
            "active": True
        }
    ]
    
    await db.events.insert_many(events)
    
    # Seed Quota Targets
    print("📊 Adding Quota Tracking Data...")
    
    quota_targets = [
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo_user_id",  # This will be updated when we create the demo user
            "target_type": "weekly",
            "target_amount": 2000.0,
            "current_progress": 1250.0,
            "bonus_rate": 0.15,
            "cash_out_threshold": 1500.0,
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo_user_id",
            "target_type": "monthly", 
            "target_amount": 8000.0,
            "current_progress": 4200.0,
            "bonus_rate": 0.20,
            "cash_out_threshold": 6000.0,
            "created_at": datetime.now(timezone.utc),
            "active": True
        }
    ]
    
    await db.quota_targets.insert_many(quota_targets)
    
    # Seed Educational Resources
    print("🎓 Adding BIGO Academy Resources...")
    
    resources = [
        {
            "id": str(uuid.uuid4()),
            "title": "BIGO Live 101: Complete Beginner's Guide",
            "category": "Start Here",
            "type": "video",
            "content_url": "https://youtube.com/watch?v=bigo-basics-101",
            "content_text": None,
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "PK Battle Strategies That Actually Work",
            "category": "Advanced",
            "type": "video", 
            "content_url": "https://youtube.com/watch?v=pk-battle-mastery",
            "content_text": None,
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Gift Psychology: Making Viewers Want to Support You",
            "category": "Grow",
            "type": "text",
            "content_text": "Understanding the psychology behind gifting is crucial for BIGO Live success. Viewers gift when they feel appreciated, entertained, and part of a community...",
            "content_url": None,
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Setting Up Your Streaming Space for Maximum Impact",
            "category": "Start Here",
            "type": "video",
            "content_url": "https://youtube.com/watch?v=streaming-setup-guide",
            "content_text": None,
            "created_at": datetime.now(timezone.utc),
            "active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Advanced Analytics: Tracking Your BIGO Performance",
            "category": "Advanced",
            "type": "pdf",
            "content_url": "https://example.com/analytics-guide.pdf",
            "content_text": None,
            "created_at": datetime.now(timezone.utc),
            "active": True
        }
    ]
    
    await db.resources.insert_many(resources)
    
    # Seed Community Channels
    print("💬 Adding Enhanced Community Channels...")
    
    channels = [
        {
            "id": str(uuid.uuid4()),
            "name": "📢 Important Announcements",
            "description": "Critical updates and announcements from Level Up Agency",
            "visibility": "public",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "🔥 PK Battle Zone",
            "description": "Discuss PK strategies, find PK partners, share battle results",
            "visibility": "public",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "💰 Earnings & Tips",
            "description": "Share earning strategies, gift tips, and success stories",
            "visibility": "public",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "🤝 Collaboration Hub",
            "description": "Find partners for duets, collabs, and joint streams",
            "visibility": "public",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "🏆 Success Stories",
            "description": "Celebrate wins, milestones, and achievements",
            "visibility": "public",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "❓ Q&A Support",
            "description": "Get help with technical issues, streaming problems, and general questions",
            "visibility": "public", 
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.channels.insert_many(channels)
    
    # Update existing tasks with YouTube videos
    print("📹 Updating Tasks with Educational Content...")
    
    youtube_tasks = [
        {
            "title": "Complete BIGO Live Setup Tutorial",
            "youtube_video": "https://youtube.com/watch?v=bigo-setup-tutorial"
        },
        {
            "title": "Master PK Battle Basics",
            "youtube_video": "https://youtube.com/watch?v=pk-battle-basics"
        },
        {
            "title": "Learn Gift Appreciation Techniques", 
            "youtube_video": "https://youtube.com/watch?v=gift-appreciation-guide"
        }
    ]
    
    # Add new tasks with YouTube integration
    new_tasks = [
        {
            "id": str(uuid.uuid4()),
            "title": "Watch & Apply: Stream Optimization Guide",
            "description": "Watch our exclusive stream optimization tutorial and apply 3 techniques in your next stream",
            "points": 30,
            "due_at": datetime.now(timezone.utc) + timedelta(days=14),
            "requires_proof": True,
            "repeat_rule": None,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc),
            "active": True,
            "youtube_video": "https://youtube.com/watch?v=stream-optimization-masterclass"
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Complete BIGO Analytics Training",
            "description": "Learn how to read and use your BIGO analytics to grow faster",
            "points": 25,
            "due_at": None,
            "requires_proof": False,
            "repeat_rule": "monthly",
            "created_by": "system", 
            "created_at": datetime.now(timezone.utc),
            "active": True,
            "youtube_video": "https://youtube.com/watch?v=bigo-analytics-deep-dive"
        }
    ]
    
    await db.tasks.insert_many(new_tasks)
    
    print("✅ Comprehensive BIGO Live platform data seeding completed!")
    print(f"📚 Added {len(quizzes)} quizzes with {len(quiz_questions)} questions")
    print(f"📅 Added {len(events)} events")
    print(f"📊 Added {len(quota_targets)} quota targets")
    print(f"🎓 Added {len(resources)} educational resources")
    print(f"💬 Added {len(channels)} community channels")
    print(f"📹 Added {len(new_tasks)} new tasks with video content")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_comprehensive_data())
