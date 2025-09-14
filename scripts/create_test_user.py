#!/usr/bin/env python3
"""
Create a test user for immediate login
"""
import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path so we can import from backend
sys.path.append(str(Path(__file__).parent.parent / 'backend'))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid
from passlib.context import CryptContext

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_user():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("👤 Creating test user for immediate login...")
    
    # Remove existing test user if exists
    await db.users.delete_many({"bigo_id": "demo"})
    
    # Create test user
    test_user = {
        "id": str(uuid.uuid4()),
        "bigo_id": "demo",
        "password": pwd_context.hash("demo123"),
        "email": "demo@levelup.com",
        "role": "host",
        "name": "Demo Host",
        "timezone": "UTC",
        "joined_at": datetime.now(timezone.utc),
        "status": "active",
        "total_points": 250,  # Give some starting points
        "discord_access": True  # Give Discord access
    }
    
    await db.users.insert_one(test_user)
    
    # Add some point history for the demo user
    point_entries = [
        {
            "id": str(uuid.uuid4()),
            "user_id": test_user["id"],
            "delta": 50,
            "reason": "Welcome bonus",
            "ref_type": "manual",
            "ref_id": "welcome",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": test_user["id"],
            "delta": 100,
            "reason": "Completed first week tasks",
            "ref_type": "manual",
            "ref_id": "weekly_bonus",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": test_user["id"],
            "delta": 100,
            "reason": "Community engagement bonus",
            "ref_type": "manual",
            "ref_id": "community_bonus",
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.point_ledger.insert_many(point_entries)
    
    print("✅ Test user created successfully!")
    print("\n🔑 LOGIN CREDENTIALS:")
    print("   BIGO ID: demo")
    print("   Password: demo123")
    print("   Starting Points: 250")
    print("   Discord Access: Yes")
    print("\n🎯 You can now login to test the application!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_user())