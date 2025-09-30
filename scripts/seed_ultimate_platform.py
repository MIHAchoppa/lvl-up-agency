#!/usr/bin/env python3
"""
Ultimate seed script for the ULTIMATE BIGO Live Host Recruitment & Management Platform
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent / 'backend'))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import uuid
from passlib.context import CryptContext

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_ultimate_platform():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🚀 Seeding ULTIMATE BIGO Live Recruitment & Management Platform...")
    
    # Update demo user to admin role
    print("👤 Updating demo user to admin...")
    await db.users.update_one(
        {"bigo_id": "demo"},
        {"$set": {"role": "admin", "total_points": 500}}
    )
    
    # Seed Influencer Leads for Recruitment System
    print("🌟 Adding Influencer Leads...")
    
    influencer_leads = [
        {
            "id": str(uuid.uuid4()),
            "name": "Sarah Johnson",
            "platform": "instagram",
            "username": "sarahjlive",
            "follower_count": 45000,
            "engagement_rate": 3.2,
            "email": "sarah.johnson@email.com",
            "phone": None,
            "bio": "Lifestyle influencer & content creator. Love connecting with my audience through live streams!",
            "profile_url": "https://instagram.com/sarahjlive",
            "status": "found",
            "contact_attempts": 0,
            "last_contacted": None,
            "notes": None,
            "discovered_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mike Chen",
            "platform": "tiktok",
            "username": "mikechen_official",
            "follower_count": 120000,
            "engagement_rate": 4.8,
            "email": "mike.chen.creator@gmail.com",
            "phone": None,
            "bio": "Gaming & entertainment content. Always looking for new platforms to engage with fans!",
            "profile_url": "https://tiktok.com/@mikechen_official",
            "status": "contacted",
            "contact_attempts": 1,
            "last_contacted": datetime.now(timezone.utc) - timedelta(days=2),
            "notes": "Responded positively to initial outreach",
            "discovered_at": datetime.now(timezone.utc) - timedelta(days=3)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Emma Rodriguez",
            "platform": "youtube",
            "username": "EmmaLiveStream",
            "follower_count": 78000,
            "engagement_rate": 5.1,
            "email": None,
            "phone": "+1-555-0123",
            "bio": "Live streaming enthusiast, beauty & lifestyle content",
            "profile_url": "https://youtube.com/c/EmmaLiveStream",
            "status": "found",
            "contact_attempts": 0,
            "last_contacted": None,
            "notes": "High engagement rate, perfect for BIGO Live format",
            "discovered_at": datetime.now(timezone.utc) - timedelta(hours=6)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Alex Thompson",
            "platform": "instagram",
            "username": "alexthompsonlive",
            "follower_count": 32000,
            "engagement_rate": 3.7,
            "email": "alex.thompson.content@outlook.com",
            "phone": "+1-555-0456",
            "bio": "Music & entertainment creator, love connecting with my community!",
            "profile_url": "https://instagram.com/alexthompsonlive",
            "status": "responded",
            "contact_attempts": 2,
            "last_contacted": datetime.now(timezone.utc) - timedelta(days=1),
            "notes": "Very interested! Scheduling call for next week.",
            "discovered_at": datetime.now(timezone.utc) - timedelta(days=5)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Jessica Kim",
            "platform": "tiktok",
            "username": "jessicakim_streams",
            "follower_count": 89000,
            "engagement_rate": 4.3,
            "email": "jessica.kim.creator@yahoo.com",
            "phone": None,
            "bio": "K-pop dance covers & live streaming. Ready to explore new platforms!",
            "profile_url": "https://tiktok.com/@jessicakim_streams",
            "status": "found",
            "contact_attempts": 0,
            "last_contacted": None,
            "notes": "High potential for BIGO Live success",
            "discovered_at": datetime.now(timezone.utc) - timedelta(hours=12)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "David Martinez",
            "platform": "instagram",
            "username": "davidm_entertainment",
            "follower_count": 156000,
            "engagement_rate": 2.9,
            "email": None,
            "phone": "+1-555-0789",
            "bio": "Comedy skits & live entertainment. Always looking for new ways to engage!",
            "profile_url": "https://instagram.com/davidm_entertainment",
            "status": "found",
            "contact_attempts": 0,
            "last_contacted": None,
            "notes": "Large following, potential for high earnings on BIGO",
            "discovered_at": datetime.now(timezone.utc) - timedelta(hours=18)
        }
    ]
    
    await db.influencer_leads.insert_many(influencer_leads)
    
    # Seed Admin Actions History
    print("⚙️ Adding Admin Actions History...")
    
    admin_actions = [
        {
            "id": str(uuid.uuid4()),
            "admin_id": "demo_user_id",  # Will be updated with actual demo user ID
            "action_type": "create_event",
            "action_data": {"title": "PK Battle Championship", "event_type": "pk"},
            "executed_at": datetime.now(timezone.utc) - timedelta(hours=2),
            "success": True,
            "error_message": None
        },
        {
            "id": str(uuid.uuid4()),
            "admin_id": "demo_user_id",
            "action_type": "system_announcement",
            "action_data": {"title": "Platform Update", "body": "New features added!"},
            "executed_at": datetime.now(timezone.utc) - timedelta(hours=5),
            "success": True,
            "error_message": None
        },
        {
            "id": str(uuid.uuid4()),
            "admin_id": "demo_user_id",
            "action_type": "bulk_user_management",
            "action_data": {"actions": [{"user_id": "user123", "action": "promote"}]},
            "executed_at": datetime.now(timezone.utc) - timedelta(days=1),
            "success": True,
            "error_message": None
        }
    ]
    
    await db.admin_actions.insert_many(admin_actions)
    
    # Seed Enhanced Tasks with Categories
    print("📝 Adding Enhanced Categorized Tasks...")
    
    enhanced_tasks = [
        {
            "id": str(uuid.uuid4()),
            "title": "Complete Advanced PK Battle Training",
            "description": "Watch our exclusive PK battle masterclass and implement 5 strategies in your next battle",
            "points": 50,
            "due_at": datetime.now(timezone.utc) + timedelta(days=7),
            "requires_proof": True,
            "repeat_rule": None,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc),
            "active": True,
            "youtube_video": "https://youtube.com/watch?v=pk-battle-advanced-training",
            "category": "pk_battles"
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Recruitment Success Bonus",
            "description": "Successfully refer a new host who completes onboarding",
            "points": 100,
            "due_at": None,
            "requires_proof": True,
            "repeat_rule": "monthly",
            "created_by": "system",
            "created_at": datetime.now(timezone.utc),
            "active": True,
            "youtube_video": None,
            "category": "recruitment"
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Voice Coaching Session Completion",
            "description": "Complete a voice coaching session with our AI strategy coach",
            "points": 25,
            "due_at": None,
            "requires_proof": False,
            "repeat_rule": "weekly",
            "created_by": "system",
            "created_at": datetime.now(timezone.utc),
            "active": True,
            "youtube_video": None,
            "category": "training"
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Earnings Milestone Achievement",
            "description": "Reach your weekly earnings target as tracked by our quota system",
            "points": 75,
            "due_at": None,
            "requires_proof": False,
            "repeat_rule": "weekly",
            "created_by": "system",
            "created_at": datetime.now(timezone.utc),
            "active": True,
            "youtube_video": "https://youtube.com/watch?v=earnings-optimization-guide",
            "category": "earnings"
        }
    ]
    
    await db.tasks.insert_many(enhanced_tasks)
    
    # Seed Enhanced Rewards with Categories
    print("🎁 Adding Categorized Rewards...")
    
    enhanced_rewards = [
        {
            "id": str(uuid.uuid4()),
            "title": "Premium BIGO Live Coaching Session (30 min)",
            "cost_points": 300,
            "fulfillment_type": "manual",
            "terms": "One-on-one coaching session with top BIGO Live expert. Includes PK strategy, audience building, and earnings optimization.",
            "active": True,
            "category": "coaching",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Voice Assistant Premium Features (1 Month)",
            "cost_points": 150,
            "fulfillment_type": "auto_note",
            "terms": "Unlock advanced voice coaching features including personalized PK battle analysis and earnings projection.",
            "active": True,
            "category": "premium_features",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Influencer Recruitment Tool Access",
            "cost_points": 500,
            "fulfillment_type": "manual",
            "terms": "Get access to our advanced influencer recruitment tools for 1 month. Build your own host network!",
            "active": True,
            "category": "business_tools",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "10,000 BIGO Diamonds",
            "cost_points": 800,
            "fulfillment_type": "manual",
            "terms": "Premium diamond package delivered directly to your BIGO Live account within 24 hours.",
            "active": True,
            "category": "diamonds",
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.rewards.insert_many(enhanced_rewards)
    
    # Seed Enhanced Events with Categories
    print("📅 Adding Categorized Events...")
    
    enhanced_events = [
        {
            "id": str(uuid.uuid4()),
            "title": "AI-Powered PK Battle Workshop",
            "description": "Learn to use our AI coach for real-time PK battle strategy and optimization",
            "event_type": "agency",
            "start_time": datetime.now(timezone.utc) + timedelta(days=3),
            "end_time": datetime.now(timezone.utc) + timedelta(days=3, hours=2),
            "timezone_display": "PST",
            "creator_id": "system",
            "creator_bigo_id": "LEVELUP_AI_TEAM",
            "flyer_url": "https://example.com/ai-pk-workshop-flyer.jpg",
            "bigo_live_link": None,
            "signup_form_link": "https://forms.google.com/ai-pk-workshop",
            "location": "Zoom + Voice Assistant Demo",
            "max_participants": 25,
            "created_at": datetime.now(timezone.utc),
            "active": True,
            "category": "ai_training"
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Influencer Recruitment Masterclass",
            "description": "Learn how to find, contact, and recruit potential BIGO Live hosts using our advanced tools",
            "event_type": "agency",
            "start_time": datetime.now(timezone.utc) + timedelta(days=6),
            "end_time": datetime.now(timezone.utc) + timedelta(days=6, hours=1.5),
            "timezone_display": "EST",
            "creator_id": "system",
            "creator_bigo_id": "RECRUITMENT_EXPERT",
            "flyer_url": "https://example.com/recruitment-masterclass-flyer.jpg",
            "bigo_live_link": None,
            "signup_form_link": "https://forms.google.com/recruitment-masterclass",
            "location": "Platform Demo + Live Training",
            "max_participants": 15,
            "created_at": datetime.now(timezone.utc),
            "active": True,
            "category": "recruitment_training"
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Voice Coaching Beta Testing Event",
            "description": "Test our new voice assistant features and provide feedback. Beta testers get exclusive rewards!",
            "event_type": "community",
            "start_time": datetime.now(timezone.utc) + timedelta(days=4),
            "end_time": datetime.now(timezone.utc) + timedelta(days=4, hours=3),
            "timezone_display": "PST",
            "creator_id": "system",
            "creator_bigo_id": "BETA_TEAM",
            "flyer_url": "https://example.com/voice-beta-testing-flyer.jpg",
            "bigo_live_link": None,
            "signup_form_link": "https://forms.google.com/voice-beta-testing",
            "location": "Platform Integration",
            "max_participants": 50,
            "created_at": datetime.now(timezone.utc),
            "active": True,
            "category": "beta_testing"
        }
    ]
    
    await db.events.insert_many(enhanced_events)
    
    # Seed AI Chat History for Demo
    print("🤖 Adding Sample AI Chat History...")
    
    ai_chats = [
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo_user_id",
            "message": "How can I improve my PK battle win rate?",
            "ai_response": "Great question! Here are the top 5 strategies to dominate PK battles:\n\n1. **Energy & Engagement**: Keep your energy HIGH! Your enthusiasm is contagious and motivates viewers to gift.\n\n2. **Strategic Timing**: Accept PKs when your audience is most active (usually evenings) and engaged with your content.\n\n3. **Gift Psychology**: Thank EVERY gift immediately and specifically. 'Thank you Sarah for the sports car!' makes viewers feel valued.\n\n4. **Battle Preparation**: Warm up your audience for 10-15 minutes before accepting PKs. Get them invested in your success.\n\n5. **Comeback Strategy**: If you're losing, create urgency: 'We need 5 more roses to win this!' Give specific, achievable goals.\n\nYour current win rate can easily improve by 40-60% using these tactics. Which strategy resonates most with you?",
            "chat_type": "strategy_coach",
            "created_at": datetime.now(timezone.utc) - timedelta(hours=3)
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo_user_id",
            "message": "Help me create a flyer for tonight's PK battle event",
            "ai_response": "🔥 **EPIC PK BATTLE TONIGHT** 🔥\n\n⚡ **TIME**: 8 PM PST - Don't Miss It!\n⚡ **PRIZES**: Winner takes 1000 diamonds + crown\n⚡ **SPECIAL**: Double gift bonuses during battle!\n\n🎯 **WHY YOU SHOULD BE THERE**:\n• Watch intense PK battles\n• Support your favorite host\n• Win exclusive rewards\n• Be part of the action!\n\n👑 **FEATURING**: Top BIGO Live hosts\n🎁 **AUDIENCE REWARDS**: Random gift drops!\n\n📱 **JOIN NOW**: [BIGO Live Room Link]\n\n*Use this text with a dynamic background featuring gold/black colors, crown graphics, and battle imagery. Add your BIGO ID prominently at the bottom!*",
            "chat_type": "flyer",
            "created_at": datetime.now(timezone.utc) - timedelta(hours=1)
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo_user_id",
            "message": "Calculate my weekly earnings if I get 5000 diamonds at 45% commission",
            "ai_response": "💰 **EARNINGS CALCULATION BREAKDOWN** 💰\n\n**Given:**\n• Diamonds received: 5,000\n• Commission rate: 45%\n• Standard diamond value: $0.014 USD\n\n**CALCULATION:**\n1. Total diamond value: 5,000 × $0.014 = $70.00\n2. Your earnings (45%): $70.00 × 0.45 = **$31.50**\n3. Platform fee (55%): $70.00 × 0.55 = $38.50\n\n**WEEKLY PROJECTION:**\nIf you maintain this daily: $31.50 × 7 = **$220.50/week**\n\n**💡 OPTIMIZATION TIPS:**\n• Increase to 7,000 diamonds daily → $309/week\n• Negotiate 50% commission → $245/week\n• Combine both → $343/week\n\n**Next goal:** Aim for 7,000 diamonds daily to break $300/week! Your current performance is solid - you're in the top 30% of hosts! 🚀",
            "chat_type": "math",
            "created_at": datetime.now(timezone.utc) - timedelta(minutes=45)
        }
    ]
    
    await db.ai_chats.insert_many(ai_chats)
    
    print("✅ Ultimate BIGO Live Platform seeding completed!")
    print(f"🌟 Added {len(influencer_leads)} influencer leads")
    print(f"⚙️ Added {len(admin_actions)} admin actions")
    print(f"📝 Added {len(enhanced_tasks)} enhanced tasks")
    print(f"🎁 Added {len(enhanced_rewards)} enhanced rewards") 
    print(f"📅 Added {len(enhanced_events)} enhanced events")
    print(f"🤖 Added {len(ai_chats)} AI chat samples")
    print("\n🚀 Platform is now ready for full demonstration!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_ultimate_platform())
