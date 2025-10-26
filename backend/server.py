from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, AsyncGenerator
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from enum import Enum
import asyncio
import json
import aiofiles
import openpyxl
# from groq import AsyncGroq  # deprecated direct client, now via REST in ai_service
import re
from contextlib import asynccontextmanager
# Email imports removed - not used in current implementation

# Import new services and routers
from services.ai_service import ai_service
from services.voice_service import voice_service  
from services.websocket_service import connection_manager
from services.lead_scanner_service import lead_scanner_service
from services.blog_scheduler_service import blog_scheduler
# from routers.voice_router import voice_router
# from routers.admin_assistant_router import admin_assistant_router
from routers import blog_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup code
    # Set database reference for AI service
    ai_service.set_db(db)
    
    try:
        admin = await db.users.find_one({"bigo_id": "Admin"})
        if not admin:
            hashed = hash_password("admin333")
            user = User(bigo_id="Admin", email="admin@lvlup.ca", name="admin", role=UserRole.ADMIN)
            doc = user.dict()
            doc["password"] = hashed
            await db.users.insert_one(doc)
            logging.getLogger(__name__).info("Seeded default Admin user")
    except Exception as e:
        logging.getLogger(__name__).error(f"Failed to seed admin: {e}")
    
    # ensure admins collection exists and is synced before serving
    await sync_admins_collection(rebuild=False)
    
    # Create text index on BIGO knowledge base for search
    try:
        existing_indexes = await db.bigo_knowledge.list_indexes().to_list(100)
        has_text_index = any(idx.get("name") == "content_text_title_text" for idx in existing_indexes)
        if not has_text_index:
            await db.bigo_knowledge.create_index([("content", "text"), ("title", "text")])
            logging.getLogger(__name__).info("Created text index on bigo_knowledge collection")
    except Exception as e:
        logging.getLogger(__name__).warning(f"Could not create bigo_knowledge text index: {e}")
    
    # Create indexes for blogs collection
    try:
        await db.blogs.create_index([("slug", 1)], unique=True)
        await db.blogs.create_index([("status", 1)])
        await db.blogs.create_index([("category", 1)])
        await db.blogs.create_index([("published_at", -1)])
        logging.getLogger(__name__).info("Created indexes on blogs collection")
    except Exception as e:
        logging.getLogger(__name__).warning(f"Could not create blogs indexes: {e}")
    
    # Initialize blog scheduler
    blog_scheduler.set_dependencies(db, ai_service)
    await blog_scheduler.start()
    logging.getLogger(__name__).info("Blog scheduler started")
    
    yield
    # shutdown code
    await blog_scheduler.stop()
    client.close()

# Admins collection sync and rebuild
async def sync_admins_collection(rebuild: bool = False):
    try:
        if rebuild:
            await db.admins.delete_many({})
        cursor = db.users.find({"role": {"$in": ["admin", "owner"]}})
        async for u in cursor:
            admin_doc = {
                "id": u.get("admin_id") or str(uuid.uuid4()),
                "user_id": u["id"],
                "bigo_id": u.get("bigo_id"),
                "email": u.get("email"),
                "name": u.get("name"),
                "role": u.get("role"),
                "permissions": u.get("permissions") or [
                    "manage_users", "manage_events", "manage_announcements", "view_analytics"
                ],
                "created_at": u.get("created_at") or datetime.now(timezone.utc)
            }
            await db.admins.update_one({"user_id": u["id"]}, {"$set": admin_doc}, upsert=True)
        logging.getLogger(__name__).info("Admins collection synced")
    except Exception as e:
        logging.getLogger(__name__).error(f"Admins sync failed: {e}")


# Create the main app without a prefix
app = FastAPI(
    lifespan=lifespan,
    title="Level Up Agency - Ultimate BIGO Live Host Recruitment & Management Platform",
    description="The Most Advanced BIGO Live Host Success Platform with AI Agents, Voice Coaching & Automated Recruitment!",
    version="2.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET", "levelup-bigo-hosts-secret-2025")
ALGORITHM = "HS256"

# Groq AI Setup
# GROQ direct client deprecated; using REST via ai_service

# Enums
class UserRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin" 
    COACH = "coach"
    HOST = "host"
    MODERATOR = "moderator"

class TaskStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class RedemptionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    FULFILLED = "fulfilled"

class EventType(str, Enum):
    PERSONAL = "personal"
    PK = "pk"
    SHOW = "show"
    COMMUNITY = "community"
    AGENCY = "agency"

class MessageStatus(str, Enum):
    SENT = "sent"
    READ = "read"
    ARCHIVED = "archived"

class InfluencerStatus(str, Enum):
    FOUND = "found"
    CONTACTED = "contacted"
    RESPONDED = "responded"
    RECRUITED = "recruited"
    REJECTED = "rejected"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bigo_id: str
    email: Optional[EmailStr] = None
    role: UserRole = UserRole.HOST
    name: str
    timezone: str = "UTC"
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"
    total_points: int = 0
    discord_access: bool = False
    calendly_link: Optional[str] = None
    quota_target: Optional[int] = None
    cash_out_method: Optional[str] = None

class UserCreate(BaseModel):
    bigo_id: str
    password: str
    email: EmailStr  # Now required
    name: str
    timezone: str = "UTC"
    passcode: Optional[str] = None

class UserLogin(BaseModel):
    bigo_id: str
    password: str

class AdminAction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    action_type: str  # create_event, update_category, manage_user, etc.
    action_data: Dict[str, Any]
    executed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Groq TTS voices (PlayAI)
AVAILABLE_TTS_VOICES = [
    "Fritz-PlayAI", "Arista-PlayAI", "Atlas-PlayAI", "Celeste-PlayAI", "Thunder-PlayAI"
]

class VoiceRequest(BaseModel):
    text: str
    voice_type: str = "admin"  # admin, strategy_coach
    user_id: Optional[str] = None

class InfluencerLead(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    platform: str  # instagram, tiktok, youtube, etc.
    username: str
    follower_count: Optional[int] = None
    engagement_rate: Optional[float] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    profile_url: str
    status: InfluencerStatus = InfluencerStatus.FOUND
    contact_attempts: int = 0
    last_contacted: Optional[datetime] = None
    notes: Optional[str] = None
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    points: int
    due_at: Optional[datetime] = None
    requires_proof: bool = False
    repeat_rule: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True
    youtube_video: Optional[str] = None
    category: str = "general"

class TaskSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    task_id: str
    proof_url: Optional[str] = None
    note: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    event_type: EventType
    start_time: datetime
    end_time: Optional[datetime] = None
    timezone_display: str = "PST"
    creator_id: str
    creator_bigo_id: str
    flyer_url: Optional[str] = None
    bigo_live_link: Optional[str] = None
    signup_form_link: Optional[str] = None
    location: Optional[str] = None
    max_participants: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True
    category: str = "general"

class QuizModelDuplicate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: str = "general"
    pass_mark: int = 80
    points: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True

class QuizQuestionDuplicate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quiz_id: str
    prompt: str
    options: List[str]
    correct_index: int
    explanation: Optional[str] = None

class QuizAttempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    quiz_id: str
    answers: List[int]
    score: int
    passed: bool
    attempted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Reward(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    cost_points: int
    fulfillment_type: str = "manual"
    terms: str
    active: bool = True
    category: str = "general"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Redemption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    reward_id: str
    status: RedemptionStatus = RedemptionStatus.PENDING
    notes: Optional[str] = None
    handled_by: Optional[str] = None
    handled_at: Optional[datetime] = None
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PointLedger(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    delta: int
    reason: str
    ref_type: str
    ref_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Announcement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    body: str
    publish_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pinned: bool = False
    audience: str = "all"
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PrivateMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    recipient_id: str
    message: str
    status: MessageStatus = MessageStatus.SENT
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_at: Optional[datetime] = None

class AIChat(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    message: str
    ai_response: str
    chat_type: str = "general"
    session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Setting(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: Optional[str] = None

class UpdateSettingRequest(BaseModel):
    value: str

class AIAssistRequest(BaseModel):
    field_name: str
    current_value: str = ""
    context: Dict[str, Any] = {}
    mode: str = "fill"  # fill or improve

class QuotaTarget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    target_type: str
    target_amount: float
    current_progress: float = 0.0
    bonus_rate: float = 0.0
    cash_out_threshold: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True

class Resource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    category: str
    type: str
    content_url: Optional[str] = None
    content_text: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True

class Channel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    visibility: str = "public"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    channel_id: str
    user_id: str
    body: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    flagged: bool = False

class ProfilePost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    content: str
    image_url: Optional[str] = None
    post_type: str = "update"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True

class BigoKnowledge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    title: str
    content: str
    tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def search_bigo_knowledge(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search BIGO knowledge base using text search"""
    try:
        if not query.strip():
            return []
        
        # Use MongoDB text search
        results = await db.bigo_knowledge.find(
            {"$text": {"$search": query}},
            {"score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"})]).limit(limit).to_list(limit)
        
        return results
    except Exception as e:
        logging.getLogger(__name__).error(f"BIGO knowledge search error: {e}")
        return []

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(required_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

# Advanced BIGO Live Bean/Tier System Data
BIGO_TIER_SYSTEM = {
    "S25": {"hours_streamed": 50, "min_billable": 25, "max_billable": 2, "local_bean_target": 5000000, "max_local_bean": 535000, "broadcaster_earnings": 535000},
    "S23": {"hours_streamed": 50, "min_billable": 25, "max_billable": 2, "local_bean_target": 5000000, "max_local_bean": 528573, "broadcaster_earnings": 528000},
    "S22": {"hours_streamed": 50, "min_billable": 25, "max_billable": 2, "local_bean_target": 4500000, "max_local_bean": 521145, "broadcaster_earnings": 521000},
    "S21": {"hours_streamed": 50, "min_billable": 25, "max_billable": 2, "local_bean_target": 4000000, "max_local_bean": 513718, "broadcaster_earnings": 513000},
    "S20": {"hours_streamed": 50, "min_billable": 25, "max_billable": 2, "local_bean_target": 4000000, "max_local_bean": 119043, "broadcaster_earnings": 237000},
    "S19": {"hours_streamed": 48, "min_billable": 25, "max_billable": 2, "local_bean_target": 3750000, "max_local_bean": 117857, "broadcaster_earnings": 237000},
    "S18": {"hours_streamed": 48, "min_billable": 25, "max_billable": 2, "local_bean_target": 3500000, "max_local_bean": 116667, "broadcaster_earnings": 226000},
    "S17": {"hours_streamed": 50, "min_billable": 25, "max_billable": 2, "local_bean_target": 3250000, "max_local_bean": 115476, "broadcaster_earnings": 215000},
    "S16": {"hours_streamed": 50, "min_billable": 25, "max_billable": 2, "local_bean_target": 3000000, "max_local_bean": 114286, "broadcaster_earnings": 224000},
    "S15": {"hours_streamed": 50, "min_billable": 25, "max_billable": 2, "local_bean_target": 2750000, "max_local_bean": 113096, "broadcaster_earnings": 219000},
    "S14": {"hours_streamed": 50, "min_billable": 25, "max_billable": 2, "local_bean_target": 2500000, "max_local_bean": 111905, "broadcaster_earnings": 216000},
    "S13": {"hours_streamed": 48, "min_billable": 25, "max_billable": 2, "local_bean_target": 2250000, "max_local_bean": 110714, "broadcaster_earnings": 217000},
    "S12": {"hours_streamed": 48, "min_billable": 25, "max_billable": 2, "local_bean_target": 2000000, "max_local_bean": 109524, "broadcaster_earnings": 216000},
    "S11": {"hours_streamed": 46, "min_billable": 25, "max_billable": 2, "local_bean_target": 1750000, "max_local_bean": 108333, "broadcaster_earnings": 213000},
    "S10": {"hours_streamed": 46, "min_billable": 25, "max_billable": 2, "local_bean_target": 1500000, "max_local_bean": 107143, "broadcaster_earnings": 212000},
    "S9": {"hours_streamed": 44, "min_billable": 25, "max_billable": 2, "local_bean_target": 1250000, "max_local_bean": 105952, "broadcaster_earnings": 210000},
    "S8": {"hours_streamed": 42, "min_billable": 25, "max_billable": 2, "local_bean_target": 1000000, "max_local_bean": 104762, "broadcaster_earnings": 209000},
    "S7": {"hours_streamed": 40, "min_billable": 25, "max_billable": 2, "local_bean_target": 800000, "max_local_bean": 103571, "broadcaster_earnings": 205000},
    "S6": {"hours_streamed": 38, "min_billable": 25, "max_billable": 2, "local_bean_target": 600000, "max_local_bean": 102381, "broadcaster_earnings": 205700},
    "S5": {"hours_streamed": 36, "min_billable": 25, "max_billable": 2, "local_bean_target": 400000, "max_local_bean": 101905, "broadcaster_earnings": 203200},
    "S4": {"hours_streamed": 34, "min_billable": 25, "max_billable": 2, "local_bean_target": 300000, "max_local_bean": 101429, "broadcaster_earnings": 202600},
    "S3": {"hours_streamed": 33, "min_billable": 25, "max_billable": 2, "local_bean_target": 240000, "max_local_bean": 101095, "broadcaster_earnings": 202000},
    "S2": {"hours_streamed": 32, "min_billable": 25, "max_billable": 2, "local_bean_target": 170000, "max_local_bean": 100850, "broadcaster_earnings": 201500},
    "S1": {"hours_streamed": 32, "min_billable": 25, "max_billable": 2, "local_bean_target": 140000, "max_local_bean": 100619, "broadcaster_earnings": 201120}
}

BEAN_CONVERSION_RATES = {
    "beans_to_usd": 210,  # 210 beans = $1
    "beans_to_diamonds_low": {"beans": 8, "diamonds": 2},  # Lowest rate
    "beans_to_diamonds_bulk": {"beans": 10299, "diamonds": 2900},  # Bulk rate
    "diamond_to_bean": 1  # 1 diamond sent = 1 bean received
}

# Updated AI response function using new AI service
async def get_groq_response(user_message: str, chat_type: str = "strategy_coach"):
    """Legacy function - now uses new AI service"""
    try:
        if chat_type == "strategy_coach":
            return await ai_service.get_bigo_strategy_response(user_message)
        elif chat_type == "admin_assistant":
            admin_prompt = f"""You are an Admin Assistant for Level Up Agency BIGO Live platform.

User Query: {user_message}

Provide helpful admin-focused responses about:
- User management
- Analytics and metrics
- Platform operations
- Strategy recommendations

Be concise and actionable."""

            result = await ai_service.chat_completion(
                messages=[{"role": "user", "content": admin_prompt}],
                temperature=0.7,
                max_completion_tokens=500
            )
            if result.get("success"):
                return result.get("content", "Admin assistant unavailable")
            else:
                return "Admin assistant unavailable"
        else:
            return await ai_service.get_bigo_strategy_response(user_message)
    except Exception as e:
        return f"AI service temporarily unavailable. Error: {str(e)}"

# Advanced Admin Agent
async def execute_admin_action(action_type: str, action_data: Dict[str, Any], admin_id: str):
    try:
        if action_type == "create_event":
            event = Event(**action_data, creator_id=admin_id, creator_bigo_id="ADMIN")
            await db.events.insert_one(event.dict())
            return {"success": True, "message": f"Event '{event.title}' created successfully", "data": event}
            
        elif action_type == "update_categories":
            category_updates = action_data.get("updates", [])
            updated_count = 0
            
            for update in category_updates:
                collection = update.get("collection")
                old_category = update.get("old_category") 
                new_category = update.get("new_category")
                
                if collection and old_category and new_category:
                    result = await db[collection].update_many(
                        {"category": old_category},
                        {"$set": {"category": new_category}}
                    )
                    updated_count += result.modified_count
            
            return {"success": True, "message": f"Updated {updated_count} items across categories"}
            
        elif action_type == "bulk_user_management":
            user_actions = action_data.get("actions", [])
            processed = 0
            
            for user_action in user_actions:
                user_id = user_action.get("user_id")
                action = user_action.get("action")  # promote, demote, suspend, activate
                
                if user_id and action:
                    if action == "promote":
                        await db.users.update_one({"id": user_id}, {"$set": {"role": "coach"}})
                    elif action == "suspend":
                        await db.users.update_one({"id": user_id}, {"$set": {"status": "suspended"}})
                    elif action == "activate":
                        await db.users.update_one({"id": user_id}, {"$set": {"status": "active"}})
                    processed += 1
            
            return {"success": True, "message": f"Processed {processed} user management actions"}
            
        elif action_type == "system_announcement":
            announcement = Announcement(**action_data, created_by=admin_id)
            await db.announcements.insert_one(announcement.dict())
            return {"success": True, "message": "System announcement created", "data": announcement}
            
        else:
            return {"success": False, "message": f"Unknown action type: {action_type}"}
            
    except Exception as e:
        return {"success": False, "message": f"Action failed: {str(e)}"}

# Influencer Search and Auto-Outreach System
async def search_influencers(platform: str, keywords: List[str], min_followers: int = 1000):
    try:
        search_query = (
            f"Find {platform} influencers with keywords: {', '.join(keywords)} minimum {min_followers} followers contact information email"
        )
        ai = await ai_service.chat_completion([
            {"role": "system", "content": "You are an expert at finding social media influencers with public contact information. Extract names, usernames, follower counts, emails, and profile URLs."},
            {"role": "user", "content": search_query}
        ], temperature=0.3, max_completion_tokens=1200)
        if not ai.get("success"):
            return []
        content = ai.get("content", "")
        influencers = []
        lines = content.split('\n')
        current_influencer = {}
        for line in lines:
            line = line.strip()
            if '@' in line and 'http' in line:
                if current_influencer.get('name'):
                    influencers.append(current_influencer)
                current_influencer = {"platform": platform}
            email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', line)
            if email_match:
                current_influencer['email'] = email_match.group()
        return influencers
    except Exception as e:
        print(f"Influencer search error: {e}")
        return []

async def create_outreach_email(influencer_data: Dict[str, Any]) -> str:
    try:
        prompt = f"""Create a compelling recruitment email for a {influencer_data.get('platform')} influencer named {influencer_data.get('name')} with {influencer_data.get('follower_count', 'many')} followers.

The email should:
- Be personalized and engaging
- Introduce Level Up Agency as the #1 BIGO Live host success platform
- Highlight earning potential on BIGO Live (mention 5x earnings potential)
- Include our AI coaching and support system
- Create urgency with limited spots available
- Include a clear call-to-action to join

Keep it under 200 words and professional but exciting."""

        # migrated to ai_service.chat_completion
        ai = await ai_service.chat_completion([
            {"role": "system", "content": "You are an expert email copywriter specializing in influencer recruitment for BIGO Live hosting."},
            {"role": "user", "content": prompt}
        ], temperature=0.7, max_completion_tokens=800)
        if not ai.get("success"):
            return "We couldn't generate the email right now. Please try again."
        return ai.get("content", "")
        
    except Exception as e:
        return f"Error creating email: {str(e)}"

# Voice TTS/STT Integration (placeholder for Groq's upcoming TTS)
async def generate_voice_response(text: str, voice_type: str = "strategy_coach"):
    try:
        # For now, return the text - would integrate with Groq TTS when available
        return {
            "audio_url": None,  # Would contain generated audio URL
            "text": text,
            "voice_type": voice_type,
            "duration_seconds": len(text) * 0.1  # Estimated
        }
    except Exception as e:
        return {"error": f"Voice generation failed: {str(e)}"}

# Audition System Model
class AuditionUploadInitAuth(BaseModel):
    filename: str
    content_type: Optional[str] = None
    total_chunks: Optional[int] = None
    file_size: Optional[int] = None

class AuditionSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    bigo_id: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    video_url: Optional[str] = None
    status: str = "submitted"  # uploading, submitted, reviewed, approved, rejected
    submission_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = None

# GridFS setup for audition videos
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
import shutil
import mimetypes

gridfs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="audition_videos")

class AuditionUploadInit(BaseModel):
    name: str
    bigo_id: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    filename: str
    content_type: Optional[str] = None
    total_chunks: Optional[int] = None  # required for chunked upload
    file_size: Optional[int] = None

MAX_VIDEO_BYTES = 500 * 1024 * 1024  # 500MB
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}

class EventRSVP(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    user_id: str
    status: str = "going"  # going | interested | cancelled
    responded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# AUTH-REQUIRED audition endpoints
@api_router.post("/audition/upload/init")
async def audition_upload_init_auth(meta: AuditionUploadInitAuth, current_user: User = Depends(get_current_user)):
    # Validate
    if meta.content_type and meta.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported video type")
    if meta.file_size and meta.file_size > MAX_VIDEO_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 500MB)")

    # Enforce single active submission (uploading/submitted)
    existing = await db.audition_submissions.find_one({
        "bigo_id": current_user.bigo_id,
        "status": {"$in": ["uploading", "submitted"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active audition. Please wait for review or ask admin to reset.")

    # Create submission placeholder linked to user
    submission = AuditionSubmission(
        name=current_user.name,
        bigo_id=current_user.bigo_id,
        email=current_user.email,
        phone=None,
        video_url=None,
        status="uploading"
    )
    await db.audition_submissions.insert_one(submission.dict())

    # Create upload session record
    upload_id = str(uuid.uuid4())
    await db.audition_uploads.insert_one({
        "id": upload_id,
        "submission_id": submission.id,
        "user_id": current_user.id,
        "filename": meta.filename,
        "content_type": meta.content_type or mimetypes.guess_type(meta.filename)[0] or "application/octet-stream",
        "total_chunks": meta.total_chunks,
        "received_bytes": 0,
        "created_at": datetime.now(timezone.utc)
    })
    return {"upload_id": upload_id, "submission_id": submission.id}

@api_router.post("/audition/upload/chunk")
async def audition_upload_chunk_auth(upload_id: str = Query(...), chunk_index: int = Query(...), chunk: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    upload_rec = await db.audition_uploads.find_one({"id": upload_id, "user_id": current_user.id})
    if not upload_rec:
        raise HTTPException(status_code=404, detail="Upload session not found")
    gridfs_filename = f"{upload_id}_{upload_rec['filename']}"
    tmp_path = f"/tmp/{gridfs_filename}_{chunk_index}.part"
    try:
        async with aiofiles.open(tmp_path, 'wb') as f:
            while True:
                data = await chunk.read(1024 * 1024)
                if not data:
                    break
                await f.write(data)
        with open(tmp_path, 'rb') as fsrc:
            await gridfs_bucket.upload_from_stream(filename=f"{gridfs_filename}:{chunk_index}", source=fsrc, metadata={
                "upload_id": upload_id,
                "chunk_index": chunk_index,
                "type": "chunk",
                "user_id": current_user.id
            })
        try:
            size = os.path.getsize(tmp_path)
        except Exception:
            size = 0
        await db.audition_uploads.update_one({"id": upload_id}, {"$inc": {"received_bytes": size}})
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


@api_router.post("/audition/upload/complete")
async def audition_upload_complete_auth(upload_id: str = Query(...), current_user: User = Depends(get_current_user)):
    upload_rec = await db.audition_uploads.find_one({"id": upload_id, "user_id": current_user.id})
    if not upload_rec:
        raise HTTPException(status_code=404, detail="Upload session not found")
    gridfs_filename = f"{upload_id}_{upload_rec['filename']}"

    # Compose final file
    chunks = []
    async for file in gridfs_bucket.find({"filename": {"$regex": f"^{gridfs_filename}:"}, "metadata.upload_id": upload_id}):
        chunks.append({"id": file._id, "filename": file.filename})
    if not chunks:
        raise HTTPException(status_code=400, detail="No chunks found")
    def idx(name: str):
        try:
            return int(name.split(":")[-1])
        except Exception:
            return 0
    chunks.sort(key=lambda c: idx(c["filename"]))

    try:
        final_tmp = f"/tmp/{gridfs_filename}.final"
        with open(final_tmp, 'wb') as fout:
            for c in chunks:
                try:
                    stream = await gridfs_bucket.open_download_stream_by_name(c["filename"]) 
                    if stream:
                        while True:
                            b = await stream.read(1024 * 1024)
                            if not b:
                                break
                            fout.write(b)
                        await stream.close()
                except Exception as e:
                    print(f"Error processing chunk {c['filename']}: {e}")
                    continue
        with open(final_tmp, 'rb') as fin:
            await gridfs_bucket.upload_from_stream(filename=gridfs_filename, source=fin, metadata={
                "upload_id": upload_id,
                "content_type": upload_rec.get("content_type"),
                "type": "final",
                "user_id": current_user.id
            })
    finally:
        try:
            os.remove(final_tmp)
        except Exception:
            pass

    # Clean chunk parts
    async for file in gridfs_bucket.find({"filename": {"$regex": f"^{gridfs_filename}:"}, "metadata.upload_id": upload_id}):
        try:
            await gridfs_bucket.delete(file._id)
        except Exception:
            pass

    # Link to submission
    final_url = f"gridfs://auditions/byname/{gridfs_filename}"
    await db.audition_submissions.update_one({"id": upload_rec["submission_id"]}, {"$set": {"video_url": final_url, "status": "submitted"}})

    # Notify admins
    await db.admin_notifications.insert_one({
        "type": "new_audition",
        "message": "New audition submitted (upload completed)",
        "audition_id": upload_rec["submission_id"],
        "created_at": datetime.now(timezone.utc)
    })

    return {"message": "Upload completed", "submission_id": upload_rec["submission_id"]}

# TTS: simple synth endpoint using Groq
class TTSRequest(BaseModel):
    text: str
    voice: str = "Gail-PlayAI"
    format: str = "wav"


# Public onboarding chat (no auth) for landing agent – recruitment focused
class OnboardingChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

@api_router.post("/public/ai/onboarding-chat")
async def public_onboarding_chat(req: OnboardingChatRequest):
    msg = (req.message or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Message required")
    system_prompt = (
        "You are Lvl-Up, the LVL-UP onboarding agent for a BIGO Live agency. "
        "Your only goal is to warmly recruit visitors to become paid BIGO Live broadcasters. "
        "Be concise, persuasive, and helpful. Offer next steps like starting a video audition, learning earnings, schedule tips, and WhatsApp contact. "
        "Avoid making promises; emphasize coaching, community, and realistic earnings ranges based on effort."
    )
    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": msg}
        ]
        ai_resp = await ai_service.chat_completion(messages, temperature=0.6, max_completion_tokens=500)
        if not ai_resp.get("success"):
            raise HTTPException(status_code=500, detail=ai_resp.get("error", "AI error"))
        text = ai_resp.get("content", "")
        # Store lightweight transcript (best-effort)
        try:
            await db.public_onboarding_chats.insert_one({
                "session_id": req.session_id or str(uuid.uuid4()),
                "message": msg,
                "response": text,
                "created_at": datetime.now(timezone.utc)
            })
        except Exception:
            pass
        return {"response": text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/tts/voices")
async def tts_voices():
    return {"voices": AVAILABLE_TTS_VOICES}

@api_router.post("/tts/speak")
async def tts_speak(req: TTSRequest, current_user: User = Depends(get_current_user)):
    text = (req.text or '').strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text required")
    voice = req.voice or 'Fritz-PlayAI'
    resp_format = req.format or 'wav'
    res = await ai_service.tts_generate(text, voice=voice, response_format=resp_format)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error","TTS failed"))
    return {"audio_base64": res.get("audio_base64"), "mime": res.get("mime")}


# DEPRECATE old public endpoints (force auth)
@api_router.post("/public/audition/upload/init")
async def audition_upload_init_deprecated():
    raise HTTPException(status_code=401, detail="Login required to submit an audition")

@api_router.post("/public/audition/upload/chunk")
async def audition_upload_chunk_deprecated():
    raise HTTPException(status_code=401, detail="Login required to submit an audition")

@api_router.post("/public/audition/upload/complete")
async def audition_upload_complete_deprecated():
    raise HTTPException(status_code=401, detail="Login required to submit an audition")


@api_router.post("/public/audition/upload/init")
async def audition_upload_init(meta: AuditionUploadInit):
    # Validate type if provided
    if meta.content_type and meta.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported video type")
    if meta.file_size and meta.file_size > MAX_VIDEO_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 500MB)")

    # Create submission placeholder
    submission = AuditionSubmission(
        name=meta.name,
        bigo_id=meta.bigo_id,
        email=meta.email,
        phone=meta.phone,
        video_url=None,
        status="uploading"
    )
    await db.audition_submissions.insert_one(submission.dict())

    # Create a GridFS file and return its id as upload_id
    upload_id = str(uuid.uuid4())
    await db.audition_uploads.insert_one({
        "id": upload_id,
        "submission_id": submission.id,
        "filename": meta.filename,
        "content_type": meta.content_type or mimetypes.guess_type(meta.filename)[0] or "application/octet-stream",
        "total_chunks": meta.total_chunks,
        "received_bytes": 0,
        "created_at": datetime.now(timezone.utc)
    })
    return {"upload_id": upload_id, "submission_id": submission.id}

@api_router.post("/public/audition/upload/chunk")
async def audition_upload_chunk(upload_id: str = Query(...), chunk_index: int = Query(...), chunk: UploadFile = File(...)):
    upload_rec = await db.audition_uploads.find_one({"id": upload_id})
    if not upload_rec:
        raise HTTPException(status_code=404, detail="Upload session not found")

    # Append chunk to GridFS file stream named by upload_id
    gridfs_filename = f"{upload_id}_{upload_rec['filename']}"
    # We store each chunk as a temp file under /tmp then append via GridFS upload_from_stream
    tmp_path = f"/tmp/{gridfs_filename}_{chunk_index}.part"
    try:
        async with aiofiles.open(tmp_path, 'wb') as f:
            while True:
                data = await chunk.read(1024 * 1024)
                if not data:
                    break
                await f.write(data)

        # Save chunk into GridFS as separate file chunk refs
        with open(tmp_path, 'rb') as fsrc:
            await gridfs_bucket.upload_from_stream(filename=f"{gridfs_filename}:{chunk_index}", source=fsrc, metadata={
                "upload_id": upload_id,
                "chunk_index": chunk_index,
                "type": "chunk"
            })
        # increment received bytes based on actual chunk file size
        try:
            size = os.path.getsize(tmp_path)
        except Exception:
            size = 0
        await db.audition_uploads.update_one({"id": upload_id}, {"$inc": {"received_bytes": size}})
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
    return {"message": "Chunk received"}

@api_router.post("/public/audition/upload/complete")
async def audition_upload_complete(upload_id: str = Query(...)):
    upload_rec = await db.audition_uploads.find_one({"id": upload_id})
    if not upload_rec:
        raise HTTPException(status_code=404, detail="Upload session not found")

    # Reassemble by streaming all chunk files in order into final GridFS file
    gridfs_filename = f"{upload_id}_{upload_rec['filename']}"

    # List chunk files stored in GridFS
    chunks = []
    async for file in gridfs_bucket.find({"filename": {"$regex": f"^{gridfs_filename}:"}, "metadata.upload_id": upload_id}):
        chunks.append({"id": file._id, "filename": file.filename})
    if not chunks:
        raise HTTPException(status_code=400, detail="No chunks found")

    # Sort by chunk index
    def idx(name: str):
        try:
            return int(name.split(":")[-1])
        except Exception:
            return 0
    chunks.sort(key=lambda c: idx(c["filename"]))

    # Create final file
    # Compose final file into GridFS by filename (no ObjectId tracking)
    try:
        # Create a pipe via temporary file to compose
        final_tmp = f"/tmp/{gridfs_filename}.final"
        with open(final_tmp, 'wb') as fout:
            for c in chunks:
                # download each chunk and append
                try:
                    stream = await gridfs_bucket.open_download_stream_by_name(c["filename"]) 
                    if stream:
                        while True:
                            b = await stream.read(1024 * 1024)
                            if not b:
                                break
                            fout.write(b)
                        await stream.close()
                except Exception as e:
                    print(f"Error processing chunk {c['filename']}: {e}")
                    continue
        # upload composed file
        with open(final_tmp, 'rb') as fin:
            await gridfs_bucket.upload_from_stream(filename=gridfs_filename, source=fin, metadata={
                "upload_id": upload_id,
                "content_type": upload_rec.get("content_type"),
                "type": "final"
            })
    finally:
        try:
            os.remove(final_tmp)
        except Exception:
            pass

    # Clean up chunk files
    async for file in gridfs_bucket.find({"filename": {"$regex": f"^{gridfs_filename}:"}, "metadata.upload_id": upload_id}):
        try:
            await gridfs_bucket.delete(file._id)
        except Exception:
            pass

    # Link to submission
    # Store URL by filename to avoid ObjectId usage
    final_url = f"gridfs://auditions/byname/{gridfs_filename}"
    submission_id = upload_rec["submission_id"]
    await db.audition_submissions.update_one({"id": submission_id}, {"$set": {"video_url": final_url, "status": "submitted"}})

    # Notify admin in-app
    await db.admin_notifications.insert_one({
        "type": "new_audition",
        "message": "New audition submitted (upload completed)",
        "audition_id": submission_id,
        "created_at": datetime.now(timezone.utc)
    })

    return {"message": "Upload completed", "submission_id": submission_id}

@api_router.get("/admin/auditions")
async def list_auditions(status: Optional[str] = None, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN, UserRole.COACH]))):
    q = {}
    if status:
        q["status"] = status
    items = await db.audition_submissions.find(q).sort("submission_date", -1).to_list(1000)
    return [AuditionSubmission(**x) for x in items]

@api_router.put("/admin/auditions/{submission_id}/review")
async def review_audition(submission_id: str, body: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN, UserRole.COACH]))):
    status_val = body.get("status")
    notes = body.get("review_notes")
    if status_val not in ["reviewed", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.audition_submissions.update_one({"id": submission_id}, {"$set": {
        "status": status_val,
        "review_notes": notes,
        "reviewed_by": current_user.id,
        "reviewed_at": datetime.now(timezone.utc)
    }})
    return {"message": "Audition updated"}

@api_router.get("/admin/auditions/{submission_id}/video")
async def stream_audition_video(submission_id: str, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN, UserRole.COACH]))):
    sub = await db.audition_submissions.find_one({"id": submission_id})
    if not sub or not sub.get("video_url"):
        raise HTTPException(status_code=404, detail="Video not found")
    # parse gridfs url
    file_name = sub["video_url"].split("byname/")[-1]
    stream = await gridfs_bucket.open_download_stream_by_name(file_name)

    async def iterfile() -> AsyncGenerator[bytes, None]:
        try:
            if stream:
                while True:
                    chunk = await stream.read(1024 * 1024)
                    if not chunk:
                        break
                    yield chunk
        finally:
            if stream:
                await stream.close()

    return StreamingResponse(iterfile(), media_type="video/mp4")

@api_router.delete("/admin/auditions/{submission_id}")
async def delete_audition(submission_id: str, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    sub = await db.audition_submissions.find_one({"id": submission_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    # delete video
    if sub.get("video_url") and sub["video_url"].startswith("gridfs://"):
        file_id = sub["video_url"].split("/")[-1]
        try:
            await gridfs_bucket.delete(file_id)
        except Exception:
            pass
    await db.audition_submissions.delete_one({"id": submission_id})
    return {"message": "Deleted"}

# Public Routes (No authentication required)
@api_router.post("/public/audition/submit")
async def submit_audition(audition_data: dict):
    """Submit video audition - PUBLIC endpoint, no auth required"""
    try:
        audition = AuditionSubmission(
            name=audition_data.get("name", ""),
            bigo_id=audition_data.get("bigo_id", ""),
            email=audition_data.get("email"),
            phone=audition_data.get("phone"),
            video_url=audition_data.get("video_url"),
        )
        
        await db.audition_submissions.insert_one(audition.dict())
        
        # Send notification to admin (in production, this would be email/SMS)
        admin_notification = {
            "type": "new_audition",
            "message": f"New audition submitted by {audition.name} (BIGO ID: {audition.bigo_id})",
            "audition_id": audition.id,
            "created_at": datetime.now(timezone.utc)
        }
        await db.admin_notifications.insert_one(admin_notification)
        
        return {"message": "Audition submitted successfully", "audition_id": audition.id}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to submit audition: {str(e)}")

@api_router.get("/public/stats")
async def get_public_stats():
    """Get public statistics - no auth required"""
    try:
        # Real statistics from database
        total_users = await db.users.count_documents({})
        active_hosts = await db.users.count_documents({"status": "active", "role": "host"})

        # Calculate total points earned (proxy for earnings)
        points_pipeline = [
            {"$match": {"delta": {"$gt": 0}}},
            {"$group": {"_id": None, "total_points": {"$sum": "$delta"}}}
        ]
        points_result = await db.point_ledger.aggregate(points_pipeline).to_list(1)
        total_points = points_result[0]["total_points"] if points_result else 0

        return {
            "total_users": total_users,
            "active_hosts": active_hosts,
            "total_points_earned": total_points
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"bigo_id": user_data.bigo_id})
    if existing_user:
        raise HTTPException(status_code=400, detail="BIGO ID already registered")
    
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    # sync admins table after any registration
    await sync_admins_collection(rebuild=False)

    
    # Agency codes for special access
    AGENCY_CODES = {
        "LVLUP2025": {"discord_access": True, "role": "host"},
        "COACH2025": {"discord_access": True, "role": "coach"},
        "ADMIN2025": {"discord_access": True, "role": "admin"}
    }
    
    passcode_benefits = AGENCY_CODES.get(user_data.passcode, {"discord_access": False, "role": "host"})
    
    hashed_password = hash_password(user_data.password)

    user = User(
        bigo_id=user_data.bigo_id,
        email=user_data.email,
        name=user_data.name,
        timezone=user_data.timezone,
        role=passcode_benefits["role"],
        discord_access=passcode_benefits["discord_access"]
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user.id})
    
    # sync admins table after inserting user (covers admin/owner)
    await sync_admins_collection(rebuild=False)

    return {"access_token": access_token, "token_type": "bearer", "user": user}

@api_router.post("/auth/register/admin/rebuild")
async def rebuild_admins(current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    await sync_admins_collection(rebuild=True)
    return {"message": "Admins collection rebuilt"}

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user_doc = await db.users.find_one({"bigo_id": login_data.bigo_id})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_doc)
    access_token = create_access_token(data={"sub": user.id})
    
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Enhanced AI Routes with Groq
@api_router.post("/ai/chat")
async def ai_chat(chat_data: dict, current_user: User = Depends(get_current_user)):
    message = chat_data.get("message", "").strip()
    chat_type = chat_data.get("chat_type", "strategy_coach")
    use_research = bool(chat_data.get("use_research", False))

    if not message:
        raise HTTPException(status_code=400, detail="Message required")

    # Enforce admin-only research tools
    if use_research and current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Research mode requires admin")

    # Route to specialized prompts
    if chat_type == "admin_assistant":
        admin_prompt = f"""You are an Admin Assistant for Level Up Agency BIGO Live platform.

User Query: {message}

Provide helpful admin-focused responses about:
- User management
- Analytics and metrics
- Platform operations
- Strategy recommendations

Be concise and actionable."""

        ai_res = await ai_service.chat_completion(
            messages=[{"role": "user", "content": admin_prompt}],
            temperature=0.7,
            max_completion_tokens=500
        )
        if not ai_res.get("success"):
            raise HTTPException(status_code=500, detail=ai_res.get("error","AI error"))
        ai_text = ai_res.get("content", "")
    else:
        ai_text = await ai_service.get_bigo_strategy_response(message, user_context={
            "tier": getattr(current_user, "tier", None),
            "beans": getattr(current_user, "beans", 0),
            "role": current_user.role
        })

    chat_record = AIChat(
        user_id=current_user.id,
        message=message,
        ai_response=ai_text,
        chat_type=chat_type
    )
    await db.ai_chats.insert_one(chat_record.dict())
    return {"response": ai_text, "chat_type": chat_type}

@api_router.get("/ai/models")
async def list_groq_models(current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))):
    res = await ai_service.list_models()
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error","Failed to list models"))
    return res.get("data", [])

@api_router.get("/ai/chat/history")
async def get_ai_chat_history(current_user: User = Depends(get_current_user)):
    chats = await db.ai_chats.find({"user_id": current_user.id}).sort("created_at", -1).limit(50).to_list(50)
    return [AIChat(**chat) for chat in chats]

# Voice Assistant Routes
@api_router.post("/voice/generate")
async def generate_voice(voice_request: VoiceRequest, current_user: User = Depends(get_current_user)):
    # Get AI response first
    ai_response = await get_groq_response(voice_request.text, voice_request.voice_type)
    
    # Generate voice response
    voice_result = await generate_voice_response(ai_response, voice_request.voice_type)
    
    return {
        "response": ai_response,
        "voice_result": voice_result
    }

# STT endpoint (Whisper-like processing)
@api_router.post("/stt")
async def stt_transcribe(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    # Save temp and send to Groq Whisper
    tmp_path = f"/tmp/stt_{uuid.uuid4().hex}_{file.filename}"
    with open(tmp_path, "wb") as f:
        f.write(await file.read())
    try:
        res = await ai_service.stt_transcribe_file(tmp_path)
        if not res.get("success"):
            raise HTTPException(status_code=500, detail=res.get("error","STT failed"))
        return {"transcription": res.get("text", "")}
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

# ===== Quizzes Models (continue) =====
# Keeping single definitions above; remove stray fields

# Duplicate QuizModelDuplicate removed; using the primary definition above

class QuizSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quiz_id: str
    user_id: str
    answers: List[dict]
    score: Optional[float] = 0.0
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuizGenRequest(BaseModel):
    topic: str
    difficulty: str = "medium"
    count: int = 10
    audience: str = "all"
    tone: Optional[str] = "motivational"
    types: Optional[List[str]] = ["mcq", "tf", "short"]

# ===== Quiz Endpoints =====
@api_router.post("/admin/quizzes/generate")
async def generate_quiz(req: QuizGenRequest, current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.COACH, UserRole.OWNER]))):
    # Use Groq to generate questions in a simple JSON-friendly format
    prompt = (
        f"Generate {req.count} {req.difficulty} questions about {req.topic} for BIGO hosts."
        f" Types allowed: {', '.join(req.types or [])}."
        f" Include for MCQ: 4 options and one correct answer. For TF: correct answer true/false."
        f" Provide a brief explanation per question. Return JSON list with fields: qtype, question, options, correct_answer, explanation."
    )
    try:
        ai = await ai_service.chat_completion([
            {"role": "user", "content": prompt}
        ], temperature=0.5, max_completion_tokens=1200)
        if not ai.get("success"):
            raise HTTPException(status_code=500, detail=ai.get("error","AI error"))
        content = ai.get("content","")
        # Try to parse JSON; fallback to simple splitter if needed
        try:
            data = json.loads(content)
            items = data if isinstance(data, list) else data.get("questions", [])
        except Exception:
            # Fallback: simplistic parsing - create template questions
            items = []
            for i in range(req.count):
                qtype = (req.types or ["mcq"])[i % len(req.types or ["mcq"])]
                if qtype == "mcq":
                    items.append({
                        "qtype": "mcq",
                        "question": f"Sample question {i+1} about {req.topic}?",
                        "options": ["A", "B", "C", "D"],
                        "correct_answer": "A",
                        "explanation": "Sample explanation"
                    })
                elif qtype == "tf":
                    items.append({
                        "qtype": "tf",
                        "question": f"True or False: {req.topic} matters (sample) ",
                        "correct_answer": "true",
                        "explanation": "Sample explanation"
                    })
                else:
                    items.append({
                        "qtype": "short",
                        "question": f"Briefly explain: {req.topic} (sample)",
                        "explanation": "Sample guidance"
                    })
        questions = [QuizQuestionDuplicate(**{
            "qtype": it.get("qtype", "mcq"),
            "question": it.get("question", ""),
            "options": it.get("options"),
            "correct_answer": it.get("correct_answer"),
            "explanation": it.get("explanation")
        }) for it in items]
        title = f"{req.topic.title()} – {req.difficulty.title()}"
        quiz = QuizModelDuplicate(
            title=title,
            topic=req.topic,
            difficulty=req.difficulty,
            audience=req.audience,
            questions=questions,
            created_by=current_user.id,
            published=False
        )
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/quizzes")
async def save_quiz(body: dict, current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.COACH, UserRole.OWNER]))):
    try:
        quiz = QuizModelDuplicate(**body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid quiz payload: {e}")
    await db.quizzes.insert_one(quiz.dict())
    publish = body.get("published") or body.get("publish_all")
    # publish flag already on quiz; if publish_all true, leave published True
    if publish:
        await db.quizzes.update_one({"id": quiz.id}, {"$set": {"published": True}})
    return {"message": "Quiz saved", "id": quiz.id}

@api_router.get("/quizzes")
async def list_quizzes(current_user: User = Depends(get_current_user)):
    items = await db.quizzes.find({"published": True}).sort("created_at", -1).to_list(100)
    return [QuizModelDuplicate(**x) for x in items]

@api_router.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, current_user: User = Depends(get_current_user)):
    q = await db.quizzes.find_one({"id": quiz_id})
    if not q:
        raise HTTPException(status_code=404, detail="Not found")
    return QuizModelDuplicate(**q)

@api_router.post("/quizzes/{quiz_id}/submit")
async def submit_quiz(quiz_id: str, body: dict, current_user: User = Depends(get_current_user)):
    q = await db.quizzes.find_one({"id": quiz_id})
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    answers = body.get("answers", [])
    # score MCQ/TF; short answers not auto-scored
    score = 0
    total_scored = 0
    for ans in answers:
        qid = ans.get("question_id")
        given = str(ans.get("answer", "")).strip().lower()
        match = next((qq for qq in q.get("questions", []) if qq.get("id") == qid), None)
        if not match:
            continue
        qtype = match.get("qtype")
        correct = str(match.get("correct_answer", "")).strip().lower()
        if qtype in ("mcq", "tf"):
            total_scored += 1
            if given == correct:
                score += 1
    percent = (score / total_scored * 100.0) if total_scored else 0.0
    sub = QuizSubmission(quiz_id=quiz_id, user_id=current_user.id, answers=answers, score=percent)
    await db.quiz_submissions.insert_one(sub.dict())
    return {"message": "Submitted", "score": percent}

# Advanced Admin Routes
@api_router.post("/admin/execute")
async def execute_admin_command(action_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    action_type = action_data.get("action_type")
    action_params = action_data.get("params", {})
    
    result = await execute_admin_action(action_type, action_params, current_user.id)
    
    # Log admin action
    admin_action = AdminAction(
        admin_id=current_user.id,
        action_type=action_type,
        action_data=action_params,
        success=result.get("success", False),
        error_message=result.get("message") if not result.get("success") else None
    )
    
    await db.admin_actions.insert_one(admin_action.dict())
    
    return result

@api_router.get("/admin/actions/history")
async def get_admin_actions(current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    actions = await db.admin_actions.find({}).sort("executed_at", -1).limit(100).to_list(100)
    return [AdminAction(**action) for action in actions]

# Influencer Recruitment Routes
@api_router.post("/recruitment/search")
async def search_potential_hosts(search_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    platform = search_data.get("platform", "instagram")
    keywords = search_data.get("keywords", ["lifestyle", "entertainment", "streaming"])
    min_followers = search_data.get("min_followers", 5000)
    
    influencers = await search_influencers(platform, keywords, min_followers)
    
    # Save found influencers to database
    saved_count = 0
    for inf_data in influencers:
        try:
            influencer = InfluencerLead(
                name=inf_data.get("name", "Unknown"),
                platform=platform,
                username=inf_data.get("username", ""),
                follower_count=inf_data.get("followers"),
                email=inf_data.get("email"),
                phone=inf_data.get("phone"),
                profile_url=inf_data.get("profile_url", ""),
                bio=inf_data.get("bio", "")
            )
            
            await db.influencer_leads.insert_one(influencer.dict())
            saved_count += 1
        except Exception:
            continue
    
    return {
        "found_count": len(influencers),
        "saved_count": saved_count,
        "influencers": influencers[:10]  # Return first 10 for preview
    }

@api_router.get("/recruitment/leads")
async def get_influencer_leads(current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    leads = await db.influencer_leads.find({}).sort("discovered_at", -1).to_list(1000)
    return [InfluencerLead(**lead) for lead in leads]

@api_router.post("/recruitment/outreach")
async def send_outreach_emails(outreach_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    lead_ids = outreach_data.get("lead_ids", [])
    custom_message = outreach_data.get("custom_message", "")
    
    contacted_count = 0
    failed_count = 0
    
    for lead_id in lead_ids:
        try:
            lead = await db.influencer_leads.find_one({"id": lead_id})
            if not lead or not lead.get("email"):
                failed_count += 1
                continue
            
            # Generate personalized email
            email_content = await create_outreach_email(lead)
            if custom_message:
                email_content = f"{custom_message}\n\n{email_content}"
            
            # TODO: Integrate actual email sender later (SendGrid/SMTP)
            await db.influencer_leads.update_one(
                {"id": lead_id},
                {
                    "$set": {
                        "status": "contacted",
                        "last_contacted": datetime.now(timezone.utc),
                        "contact_attempts": lead.get("contact_attempts", 0) + 1
                    }
                }
            )
            contacted_count += 1
        except Exception:
            failed_count += 1
            continue
    
    return {
        "contacted_count": contacted_count,
        "failed_count": failed_count,
        "message": f"Outreach completed: {contacted_count} emails sent, {failed_count} failed"
    }

# ============================================
# LEAD SCANNER AGENT ENDPOINTS
# ============================================

class ScanRequest(BaseModel):
    platforms: List[str] = ["instagram", "tiktok", "youtube"]
    keywords: List[str]
    min_followers: int = 5000
    max_results: int = 50
    auto_enrich: bool = True

@api_router.post("/recruitment/scan")
async def scan_for_leads(
    scan_request: ScanRequest,
    current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))
):
    """
    Scan the internet for potential leads using the Lead Scanner Agent
    Admin/Owner only endpoint
    """
    try:
        # Validate input
        if not scan_request.keywords:
            raise HTTPException(status_code=400, detail="At least one keyword required")
        
        if scan_request.min_followers < 1000:
            raise HTTPException(status_code=400, detail="Minimum followers must be at least 1000")
        
        # Create scan record
        scan_id = str(uuid.uuid4())
        scan_doc = {
            "id": scan_id,
            "initiated_by": current_user.id,
            "initiated_by_name": current_user.name,
            "status": "running",
            "platforms": scan_request.platforms,
            "keywords": scan_request.keywords,
            "filters": {
                "min_followers": scan_request.min_followers,
                "max_results": scan_request.max_results
            },
            "started_at": datetime.now(timezone.utc),
            "completed_at": None,
            "results": {
                "total_found": 0,
                "total_saved": 0,
                "total_duplicates": 0
            }
        }
        await db.lead_scans.insert_one(scan_doc)
        
        # Run the scan
        logger.info(f"Starting lead scan {scan_id} with keywords: {scan_request.keywords}")
        
        scan_results = await lead_scanner_service.scan_for_leads(
            platforms=scan_request.platforms,
            keywords=scan_request.keywords,
            min_followers=scan_request.min_followers,
            max_results=scan_request.max_results
        )
        
        # Process and save leads
        saved_count = 0
        duplicate_count = 0
        
        for lead_data in scan_results.get('leads', []):
            try:
                # Enrich lead if requested
                if scan_request.auto_enrich:
                    lead_data = await lead_scanner_service.enrich_lead(lead_data)
                
                # Validate lead
                if not await lead_scanner_service.validate_lead(lead_data):
                    continue
                
                # Check for duplicates (by username and platform)
                existing = await db.influencer_leads.find_one({
                    "username": lead_data['username'],
                    "platform": lead_data['platform']
                })
                
                if existing:
                    duplicate_count += 1
                    continue
                
                # Create influencer lead
                lead = InfluencerLead(
                    name=lead_data.get('name', 'Unknown'),
                    platform=lead_data.get('platform', 'unknown'),
                    username=lead_data.get('username', ''),
                    follower_count=lead_data.get('follower_count'),
                    engagement_rate=lead_data.get('engagement_rate'),
                    email=lead_data.get('email'),
                    phone=lead_data.get('phone'),
                    bio=lead_data.get('bio'),
                    profile_url=lead_data.get('profile_url', ''),
                    notes=lead_data.get('notes', f"Discovered via scan {scan_id}")
                )
                
                lead_dict = lead.dict()
                lead_dict['scan_id'] = scan_id
                lead_dict['quality_score'] = lead_data.get('quality_score', 50)
                
                await db.influencer_leads.insert_one(lead_dict)
                saved_count += 1
                
            except Exception as e:
                logger.error(f"Error saving lead: {e}")
                continue
        
        # Update scan record
        await db.lead_scans.update_one(
            {"id": scan_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc),
                    "results": {
                        "total_found": scan_results.get('total_found', 0),
                        "total_saved": saved_count,
                        "total_duplicates": duplicate_count,
                        "by_platform": scan_results.get('by_platform', {})
                    }
                }
            }
        )
        
        logger.info(f"Scan {scan_id} completed: {saved_count} leads saved, {duplicate_count} duplicates")
        
        return {
            "success": True,
            "scan_id": scan_id,
            "results": {
                "total_found": scan_results.get('total_found', 0),
                "total_saved": saved_count,
                "total_duplicates": duplicate_count,
                "by_platform": scan_results.get('by_platform', {})
            },
            "message": f"Scan completed successfully. Found {scan_results.get('total_found', 0)} leads, saved {saved_count} new leads."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lead scan error: {e}")
        # Update scan status to failed
        if 'scan_id' in locals():
            await db.lead_scans.update_one(
                {"id": scan_id},
                {
                    "$set": {
                        "status": "failed",
                        "error": str(e),
                        "completed_at": datetime.now(timezone.utc)
                    }
                }
            )
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")

@api_router.get("/recruitment/scans")
async def get_scan_history(
    limit: int = 50,
    current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))
):
    """Get history of lead scans"""
    try:
        scans = await db.lead_scans.find({}).sort("started_at", -1).limit(limit).to_list(limit)
        return {
            "scans": scans,
            "total": len(scans)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/recruitment/scans/{scan_id}")
async def get_scan_details(
    scan_id: str,
    current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))
):
    """Get details of a specific scan"""
    try:
        scan = await db.lead_scans.find_one({"id": scan_id})
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        # Get leads from this scan
        leads = await db.influencer_leads.find({"scan_id": scan_id}).to_list(1000)
        
        return {
            "scan": scan,
            "leads": [InfluencerLead(**lead) for lead in leads]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/recruitment/scans/{scan_id}")
async def delete_scan(
    scan_id: str,
    delete_leads: bool = False,
    current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))
):
    """Delete a scan record and optionally its leads"""
    try:
        scan = await db.lead_scans.find_one({"id": scan_id})
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        # Delete scan record
        await db.lead_scans.delete_one({"id": scan_id})
        
        # Optionally delete associated leads
        leads_deleted = 0
        if delete_leads:
            result = await db.influencer_leads.delete_many({"scan_id": scan_id})
            leads_deleted = result.deleted_count
        
        return {
            "success": True,
            "message": f"Scan deleted successfully",
            "leads_deleted": leads_deleted
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/recruitment/stats")
async def get_recruitment_stats(
    current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))
):
    """Get recruitment and lead statistics"""
    try:
        # Total leads
        total_leads = await db.influencer_leads.count_documents({})
        
        # Leads by status
        status_pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        status_counts = await db.influencer_leads.aggregate(status_pipeline).to_list(10)
        status_breakdown = {item['_id']: item['count'] for item in status_counts}
        
        # Leads by platform
        platform_pipeline = [
            {"$group": {"_id": "$platform", "count": {"$sum": 1}}}
        ]
        platform_counts = await db.influencer_leads.aggregate(platform_pipeline).to_list(10)
        platform_breakdown = {item['_id']: item['count'] for item in platform_counts}
        
        # Recent scans
        recent_scans = await db.lead_scans.count_documents({
            "started_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}
        })
        
        # Quality metrics
        quality_pipeline = [
            {"$match": {"quality_score": {"$exists": True}}},
            {"$group": {
                "_id": None,
                "avg_quality": {"$avg": "$quality_score"},
                "high_quality": {"$sum": {"$cond": [{"$gte": ["$quality_score", 70]}, 1, 0]}}
            }}
        ]
        quality_result = await db.influencer_leads.aggregate(quality_pipeline).to_list(1)
        quality_metrics = quality_result[0] if quality_result else {"avg_quality": 0, "high_quality": 0}
        
        return {
            "total_leads": total_leads,
            "status_breakdown": status_breakdown,
            "platform_breakdown": platform_breakdown,
            "recent_scans_7d": recent_scans,
            "avg_quality_score": round(quality_metrics.get('avg_quality', 0), 1),
            "high_quality_leads": quality_metrics.get('high_quality', 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Calendar RSVP and visibility
@api_router.post("/events/{event_id}/rsvp")
async def rsvp_event(event_id: str, body: dict, current_user: User = Depends(get_current_user)):
    status_val = body.get("status", "going")
    if status_val not in ["going", "interested", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid RSVP status")
    # upsert RSVP
    await db.event_rsvps.update_one(
        {"event_id": event_id, "user_id": current_user.id},
        {"$set": {"status": status_val, "responded_at": datetime.now(timezone.utc), "id": str(uuid.uuid4())}},
        upsert=True
    )
    return {"message": "RSVP updated"}

@api_router.get("/events/{event_id}/attendees")
async def list_attendees(event_id: str, current_user: User = Depends(get_current_user)):
    rsvps = await db.event_rsvps.find({"event_id": event_id, "status": {"$in": ["going", "interested"]}}).to_list(1000)
    # Return minimal data
    users_map = {}
    for r in rsvps:
        uid = r["user_id"]
        if uid not in users_map:
            u = await db.users.find_one({"id": uid})
            if u:
                users_map[uid] = {"id": u["id"], "name": u.get("name"), "bigo_id": u.get("bigo_id")}
    attendees = [{"user": users_map.get(r["user_id"]) , "status": r.get("status")} for r in rsvps if r["user_id"] in users_map]
    return attendees

# Group chat (Agency Lounge) and DMs
DEFAULT_AGENCY_CHANNEL_NAME = "agency-lounge"

@api_router.post("/chat/channels/init-default")
async def init_default_channel(current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    existing = await db.channels.find_one({"name": DEFAULT_AGENCY_CHANNEL_NAME})
    if not existing:
        ch = Channel(name=DEFAULT_AGENCY_CHANNEL_NAME, description="Agency-wide chat", visibility="private")
        await db.channels.insert_one(ch.dict())
        return {"message": "Default channel created", "channel": ch}
    return {"message": "Already exists"}

@api_router.get("/chat/channels")
async def list_channels(current_user: User = Depends(get_current_user)):
    # Only return private default channel id; guests excluded because they cannot auth
    chans = await db.channels.find({"visibility": {"$in": ["public", "private"]}}).to_list(100)
    return [Channel(**c) for c in chans]

@api_router.post("/chat/channels/{channel_id}/messages")
async def post_channel_message(channel_id: str, body: dict, current_user: User = Depends(get_current_user)):
    # Ensure channel exists
    ch = await db.channels.find_one({"id": channel_id})
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")
    # prevent guests - but guests cannot auth, so safe
    msg = Message(channel_id=channel_id, user_id=current_user.id, body=body.get("body", ""))
    await db.messages.insert_one(msg.dict())
    return msg

@api_router.get("/chat/channels/{channel_id}/messages")
async def list_channel_messages(channel_id: str, current_user: User = Depends(get_current_user)):
    msgs = await db.messages.find({"channel_id": channel_id}).sort("created_at", 1).to_list(1000)
    return [Message(**m) for m in msgs]

@api_router.get("/recruitment/export")
async def export_leads_spreadsheet(current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    leads = await db.influencer_leads.find({}).to_list(1000)
    
    # Create Excel workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "BIGO Influencer Leads"
    
    # Headers
    headers = ["Name", "Platform", "Username", "Followers", "Email", "Phone", "Status", "Contact Attempts", "Profile URL", "Discovered Date"]
    ws.append(headers)
    
    # Data
    for lead in leads:
        row = [
            lead.get("name", ""),
            lead.get("platform", ""),
            lead.get("username", ""),
            lead.get("follower_count", 0),
            lead.get("email", ""),
            lead.get("phone", ""),
            lead.get("status", ""),
            lead.get("contact_attempts", 0),
            lead.get("profile_url", ""),
            lead.get("discovered_at", "").strftime("%Y-%m-%d %H:%M") if lead.get("discovered_at") else ""
        ]
        ws.append(row)
    
    # Save to file
    filename = f"bigo_influencer_leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = f"/tmp/{filename}"
    wb.save(filepath)
    
    return {"download_url": f"/api/recruitment/download/{filename}", "filename": filename}

# Task Routes
@api_router.post("/tasks")
async def create_task(task_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN, UserRole.COACH]))):
    task = Task(**task_data, created_by=current_user.id)
    await db.tasks.insert_one(task.dict())
    return task

@api_router.get("/tasks")
async def get_tasks(category: Optional[str] = None, current_user: User = Depends(get_current_user)):
    filter_query = {"active": True}
    if category:
        filter_query["category"] = category
    
    tasks = await db.tasks.find(filter_query).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.post("/tasks/{task_id}/submit")
async def submit_task(task_id: str, submission_data: dict, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    existing = await db.task_submissions.find_one({"user_id": current_user.id, "task_id": task_id})
    if existing:
        raise HTTPException(status_code=400, detail="Task already submitted")
    
    submission = TaskSubmission(
        user_id=current_user.id,
        task_id=task_id,
        **submission_data
    )
    
    await db.task_submissions.insert_one(submission.dict())
    return submission

# SEO helper public endpoint (no sensitive data). Could be used by frontend for meta tags.
@api_router.get("/public/seo/summary")
async def seo_summary():
    return {
        "h1": "LEVEL UP AGENCY – Become a Top-Earning BIGO Live Host",
        "keywords": [
            "BIGO Live agency", "BIGO host audition", "BIGO beans to USD", "BIGO tier calculator", "BIGO coach",
            "become a streamer", "audition video upload", "Agent Mihanna"
        ],
        "description": "Audition to join LEVEL UP AGENCY by Agent Mihanna. Upload your video, access elite coaching, events, and earn more with our bean/tier mastery."
    }

@api_router.put("/task-submissions/{submission_id}/review")
async def review_submission(submission_id: str, review_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN, UserRole.COACH]))):
    submission = await db.task_submissions.find_one({"id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    update_data = {
        "status": review_data["status"],
        "reviewed_by": current_user.id,
        "reviewed_at": datetime.now(timezone.utc)
    }
    
    await db.task_submissions.update_one(
        {"id": submission_id},
        {"$set": update_data}
    )
    
    if review_data["status"] == "approved":
        task = await db.tasks.find_one({"id": submission["task_id"]})
        if task:
            await db.users.update_one(
                {"id": submission["user_id"]},
                {"$inc": {"total_points": task["points"]}}
            )
            
            point_entry = PointLedger(
                user_id=submission["user_id"],
                delta=task["points"],
                reason=f"Task completed: {task['title']}",
                ref_type="task",
                ref_id=task["id"]
            )
            await db.point_ledger.insert_one(point_entry.dict())
    
    return {"message": "Submission reviewed successfully"}

# Quiz Routes
@api_router.post("/quizzes")
async def create_quiz(quiz_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    quiz = QuizModelDuplicate(**quiz_data)
    await db.quizzes.insert_one(quiz.dict())
    return quiz

@api_router.get("/quizzes")
async def get_quizzes(category: Optional[str] = None, current_user: User = Depends(get_current_user)):
    filter_query = {"active": True}
    if category:
        filter_query["category"] = category
    
    quizzes = await db.quizzes.find(filter_query).to_list(1000)
    return [QuizModelDuplicate(**quiz) for quiz in quizzes]

@api_router.get("/quizzes/{quiz_id}/questions")
async def get_quiz_questions(quiz_id: str, current_user: User = Depends(get_current_user)):
    questions = await db.quiz_questions.find({"quiz_id": quiz_id}).to_list(1000)
    return [QuizQuestionDuplicate(**q) for q in questions]

@api_router.post("/quizzes/{quiz_id}/attempt")
async def attempt_quiz(quiz_id: str, answers: List[int], current_user: User = Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"id": quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = await db.quiz_questions.find({"quiz_id": quiz_id}).to_list(1000)
    
    correct_count = 0
    for i, question in enumerate(questions):
        if i < len(answers) and question["correct_index"] == answers[i]:
            correct_count += 1
    
    score = (correct_count / len(questions)) * 100 if questions else 0
    passed = score >= quiz["pass_mark"]
    
    attempt = QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz_id,
        answers=answers,
        score=int(score),
        passed=passed
    )
    
    await db.quiz_attempts.insert_one(attempt.dict())
    
    if passed:
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"total_points": quiz["points"]}}
        )
        
        point_entry = PointLedger(
            user_id=current_user.id,
            delta=quiz["points"],
            reason=f"Quiz passed: {quiz['title']}",
            ref_type="quiz",
            ref_id=quiz["id"]
        )
        await db.point_ledger.insert_one(point_entry.dict())
    
    return {"attempt": attempt, "correct_answers": [q["correct_index"] for q in questions]}

# Event Routes
@api_router.post("/events")
async def create_event(event_data: dict, current_user: User = Depends(get_current_user)):
    event = Event(**event_data, creator_id=current_user.id, creator_bigo_id=current_user.bigo_id)
    await db.events.insert_one(event.dict())
    return event

@api_router.get("/events")
async def get_events(event_type: Optional[EventType] = None, category: Optional[str] = None, current_user: User = Depends(get_current_user)):
    filter_query = {"active": True}
    if event_type:
        filter_query["event_type"] = event_type
    if category:
        filter_query["category"] = category
    
    events = await db.events.find(filter_query).sort("start_time", 1).to_list(1000)
    return [Event(**event) for event in events]

@api_router.get("/events/personal")
async def get_personal_events(current_user: User = Depends(get_current_user)):
    events = await db.events.find({
        "creator_id": current_user.id,
        "active": True
    }).sort("start_time", 1).to_list(1000)
    return [Event(**event) for event in events]

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    """Update an existing event"""
    try:
        event = await db.events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Update allowed fields
        update_fields = {}
        allowed_fields = ["title", "description", "event_type", "start_time", "end_time", 
                         "timezone_display", "flyer_url", "bigo_live_link", "signup_form_link", 
                         "location", "max_participants", "category"]
        
        for field in allowed_fields:
            if field in event_data:
                update_fields[field] = event_data[field]
        
        if update_fields:
            await db.events.update_one({"id": event_id}, {"$set": update_fields})
        
        updated_event = await db.events.find_one({"id": event_id})
        return Event(**updated_event)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    """Delete (soft delete) an event"""
    try:
        event = await db.events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Soft delete by setting active=False
        await db.events.update_one({"id": event_id}, {"$set": {"active": False}})
        
        return {"success": True, "message": "Event deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rewards Routes
@api_router.get("/rewards")
async def get_rewards(category: Optional[str] = None, current_user: User = Depends(get_current_user)):
    # Dynamic bean-tier rewards driven by monthly beans and tier system
    # Respectable threshold to start rewards
    try:
        beans = getattr(current_user, 'current_month_beans', None)
        if beans is None:
            # fallback to user record from DB
            urec = await db.users.find_one({"id": current_user.id})
            beans = (urec or {}).get("current_month_beans", 0)
    except Exception:
        beans = 0

    START_THRESHOLD = 100_000  # respectable but not too high
    dynamic = []
    # Map approximate tiers by local_bean_target in BIGO_TIER_SYSTEM
    # Build tier thresholds sorted by target
    try:
        tiers = []
        for tname, tdata in BIGO_TIER_SYSTEM.items():
            tiers.append({"tier": tname, "target": int(tdata.get("local_bean_target", 0))})
        tiers = sorted(tiers, key=lambda x: x["target"])
    except Exception:
        tiers = []

    # Define dynamic rewards at progressive bean targets
    # removed milestones variable; using labels directly
    labels = [
        (100_000, "Bronze Bean Achiever", "Profile review + shoutout in Lounge"),
        (250_000, "Silver Bean Achiever", "Small promo + schedule audit"),
        (500_000, "Gold Bean Achiever", "1:1 coaching session + featured post"),
        (1_000_000, "Platinum Bean Achiever", "Homepage feature + PK priority"),
        (1_500_000, "Diamond Bean Achiever", "Agency showcase + custom promo kit"),
    ]
    for target, title, desc in labels:
        unlocked = beans >= target and beans >= START_THRESHOLD
        dynamic.append({
            "id": f"bean_{target}",
            "title": title,
            "description": desc,
            "category": "bean_tier",
            "min_beans": target,
            "unlocked": unlocked,
            "locked_reason": None if unlocked else f"Requires {target:,} beans this month",
        })

    # If a category is specified, filter dynamic by it
    if category:
        dynamic = [r for r in dynamic if r.get("category") == category]

    return dynamic

@api_router.post("/rewards/{reward_id}/redeem")
async def redeem_reward(reward_id: str, current_user: User = Depends(get_current_user)):
    reward = await db.rewards.find_one({"id": reward_id})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    if current_user.total_points < reward["cost_points"]:
        raise HTTPException(status_code=400, detail="Insufficient points")
    
    redemption = Redemption(
        user_id=current_user.id,
        reward_id=reward_id
    )
    
    await db.redemptions.insert_one(redemption.dict())
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$inc": {"total_points": -reward["cost_points"]}}
    )
    
    point_entry = PointLedger(
        user_id=current_user.id,
        delta=-reward["cost_points"],
        reason=f"Redeemed: {reward['title']}",
        ref_type="redemption",
        ref_id=redemption.id
    )
    await db.point_ledger.insert_one(point_entry.dict())
    
    return redemption

# Private Messaging Routes
@api_router.post("/messages")
async def send_message(message_data: dict, current_user: User = Depends(get_current_user)):
    message = PrivateMessage(**message_data, sender_id=current_user.id)
    await db.private_messages.insert_one(message.dict())
    return message

@api_router.get("/messages")
async def get_messages(current_user: User = Depends(get_current_user)):
    messages = await db.private_messages.find({
        "$or": [
            {"sender_id": current_user.id},
            {"recipient_id": current_user.id}
        ]
    }).sort("sent_at", -1).to_list(1000)
    return [PrivateMessage(**msg) for msg in messages]

@api_router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_user: User = Depends(get_current_user)):
    await db.private_messages.update_one(
        {"id": message_id, "recipient_id": current_user.id},
        {"$set": {"status": "read", "read_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Message marked as read"}

# Quota Routes
@api_router.post("/quotas")
async def create_quota_target(quota_data: dict, current_user: User = Depends(get_current_user)):
    quota = QuotaTarget(**quota_data, user_id=current_user.id)
    await db.quota_targets.insert_one(quota.dict())
    return quota

@api_router.get("/quotas")
async def get_quota_targets(current_user: User = Depends(get_current_user)):
    quotas = await db.quota_targets.find({"user_id": current_user.id, "active": True}).to_list(1000)
    return [QuotaTarget(**quota) for quota in quotas]

@api_router.put("/quotas/{quota_id}/progress")
async def update_quota_progress(quota_id: str, progress_data: dict, current_user: User = Depends(get_current_user)):
    await db.quota_targets.update_one(
        {"id": quota_id, "user_id": current_user.id},
        {"$set": {"current_progress": progress_data.get("current_progress", 0.0)}}
    )
    return {"message": "Quota progress updated"}

# Announcements Routes
@api_router.get("/announcements")
async def get_announcements(current_user: User = Depends(get_current_user)):
    announcements = await db.announcements.find().sort("created_at", -1).to_list(100)
    return [Announcement(**ann) for ann in announcements]

@api_router.post("/announcements")
async def create_announcement(ann_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    announcement = Announcement(**ann_data, created_by=current_user.id)
    await db.announcements.insert_one(announcement.dict())
    return announcement

# Admin Dashboard Routes
@api_router.get("/admin/dashboard")
async def get_admin_dashboard(current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    total_users = await db.users.count_documents({})
    total_hosts = await db.users.count_documents({"role": "host"})
    
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_users_7d = await db.task_submissions.distinct("user_id", {"submitted_at": {"$gte": week_ago}})
    
    pending_submissions = await db.task_submissions.count_documents({"status": "pending"})
    pending_redemptions = await db.redemptions.count_documents({"status": "pending"})
    
    points_issued = await db.point_ledger.aggregate([
        {"$match": {"delta": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$delta"}}}
    ]).to_list(1)
    total_points_issued = points_issued[0]["total"] if points_issued else 0
    
    points_redeemed = await db.point_ledger.aggregate([
        {"$match": {"delta": {"$lt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$delta"}}}
    ]).to_list(1)
    total_points_redeemed = abs(points_redeemed[0]["total"]) if points_redeemed else 0
    
    # Influencer recruitment stats
    total_leads = await db.influencer_leads.count_documents({})
    contacted_leads = await db.influencer_leads.count_documents({"status": "contacted"})
    
    return {
        "total_users": total_users,
        "total_hosts": total_hosts,
        "active_users_7d": len(active_users_7d),
        "pending_submissions": pending_submissions,
        "pending_redemptions": pending_redemptions,
        "total_points_issued": total_points_issued,
        "total_points_redeemed": total_points_redeemed,
        "total_influencer_leads": total_leads,
        "contacted_leads": contacted_leads
    }

@api_router.get("/admin/users")
async def get_all_users(current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    users = await db.users.find({}).to_list(1000)
    return [User(**user) for user in users]

@api_router.get("/admin/submissions")
async def get_all_submissions(current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    submissions = await db.task_submissions.find({}).sort("submitted_at", -1).to_list(1000)
    return [TaskSubmission(**sub) for sub in submissions]

@api_router.get("/admin/redemptions") 
async def get_all_redemptions(current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    redemptions = await db.redemptions.find({}).sort("requested_at", -1).to_list(1000)
    return [Redemption(**red) for red in redemptions]

# Voice router endpoints (moved to /api/voice)
@api_router.get("/voice/voices")
async def get_voice_voices(current_user: User = Depends(get_current_user)):
    """Get available voices from voice service (fallback implementation)"""
    try:
        # Return fallback voices list
        return {
            "voices": [
                {"id": "coach_voice", "name": "Strategy Coach", "type": "coach"},
                {"id": "admin_voice", "name": "Admin Assistant", "type": "admin"},
                {"id": "motivational_voice", "name": "Motivational Coach", "type": "motivational"}
            ],
            "status": "fallback"
        }
    except Exception as e:
        return {"voices": [], "error": str(e)}

# Admin assistant router endpoints (moved to /api/admin-assistant)
@api_router.post("/admin-assistant/chat")
async def admin_assistant_chat(chat_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    """Enhanced intelligent Admin assistant chat endpoint with structured action extraction"""
    message = chat_data.get("message", "")
    context = chat_data.get("context", {})
    
    try:
        # Enhanced intelligent admin prompt with BIGO platform knowledge
        admin_prompt = f"""You are an intelligent AI Admin Assistant for Level Up Agency, a BIGO Live host management platform.

You have deep knowledge of:
- BIGO Live platform mechanics (beans, diamonds, tiers S1-S25, PK battles)
- Agency operations and host management
- Analytics interpretation and data-driven decision making
- Event planning and calendar management
- User performance tracking and tier progression
- Revenue optimization strategies
- Host training and development

ADMIN CONTEXT:
User: {current_user.name} ({current_user.role})
Query: {message}
Additional Context: {context}

YOUR CAPABILITIES:
1. User Management: Analyze host performance, suggest tier adjustments, identify struggling hosts
2. Analytics: Interpret platform metrics, identify trends, recommend actions
3. Event Management: Create, update, delete calendar events with smart defaults
4. Strategy: Provide data-driven recommendations for agency growth
5. Operations: Automate routine tasks, generate reports, manage workflows
6. BIGO Expertise: Answer questions about platform features, best practices, monetization

RESPONSE GUIDELINES:
- Be professional yet conversational
- Provide specific, actionable insights
- Use data and metrics when available from context
- Suggest proactive improvements
- Be concise (200-300 words max)
- Show intelligence by connecting different aspects of platform

ACTION EXTRACTION (for Calendar Events):
If the user wants to CREATE, UPDATE, or DELETE an event, extract structured action data.

For CREATE EVENT:
- Extract: title, description, start_time (ISO 8601 UTC), end_time, event_type (personal/pk/show/community/agency)
- Optional: timezone_display, flyer_url, signup_form_link, location, max_participants, category
- Smart defaults: If no end_time, assume 2 hours after start; If no timezone_display, use "UTC"

For UPDATE EVENT:
- Extract: event_id (from user message or context)
- Fields to update: Only the ones user mentions

For DELETE EVENT:
- Extract: event_id (from user message or context)

RESPONSE FORMAT:
1. Provide natural language response addressing the query
2. If applicable, end with ACTION_JSON block:

ACTION_JSON:
{{"action": "create_event|update_event|delete_event", "payload": {{...}}}}

EXAMPLES:

User: "Schedule a PK battle event next Friday at 7pm PST"
Response: "I'll schedule that PK battle for you! This will be a great opportunity for hosts to compete and earn beans.

ACTION_JSON:
{{"action": "create_event", "payload": {{"title": "Friday Night PK Battle", "description": "Weekly competitive PK battle - bring your A-game!", "start_time": "2025-10-31T02:00:00Z", "event_type": "pk", "timezone_display": "PST", "max_participants": 20}}}}"

User: "Show me analytics for top performers this month"
Response: "Based on the platform data, here are key insights for your top performers:
- Focus on hosts maintaining S11+ tier consistently
- PK battle participation correlates with 40% higher earnings
- Evening streams (7-11pm) show 2x better engagement
Would you like detailed metrics for specific hosts?"

Now respond to the admin's query intelligently and professionally."""

        result = await ai_service.chat_completion(
            messages=[{"role": "user", "content": admin_prompt}],
            temperature=0.7,
            max_completion_tokens=700  # Increased for more comprehensive responses
        )
        
        if not result.get("success"):
            raise Exception(result.get("error", "AI error"))
        
        ai_response = result.get("content", "Admin assistant is currently unavailable.")
        
        # Extract action JSON if present
        action = None
        payload = None
        
        if "ACTION_JSON:" in ai_response:
            parts = ai_response.split("ACTION_JSON:")
            response_text = parts[0].strip()
            try:
                action_json_str = parts[1].strip()
                action_data = json.loads(action_json_str)
                action = action_data.get("action")
                payload = action_data.get("payload", {})
            except (json.JSONDecodeError, IndexError) as e:
                logging.getLogger(__name__).warning(f"Failed to parse action JSON: {e}")
                response_text = ai_response
        else:
            response_text = ai_response
        
        # Return structured response
        return {
            "response": response_text,
            "action": action,
            "payload": payload,
            "context": context,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": current_user.id
        }
    except Exception as e:
        logging.getLogger(__name__).error(f"Admin assistant error: {e}")
        return {
            "response": "I can help with admin tasks. What would you like to know?",
            "action": None,
            "payload": None,
            "context": context,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": current_user.id
        }

# ============================================
# ADMIN SETTINGS ENDPOINTS
# ============================================

@api_router.get("/admin/settings")
async def get_admin_settings(current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))):
    """Get all admin settings"""
    try:
        settings = await db.settings.find({}).to_list(100)
        # Mask sensitive values partially
        for setting in settings:
            if "key" in setting["key"].lower() or "secret" in setting["key"].lower():
                val = setting.get("value", "")
                if len(val) > 8:
                    setting["value_masked"] = val[:4] + "•" * (len(val) - 8) + val[-4:]
                else:
                    setting["value_masked"] = "•" * len(val)
            else:
                setting["value_masked"] = setting.get("value", "")
        return {"settings": settings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/settings/{key}")
async def get_setting(key: str, current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))):
    """Get specific setting"""
    try:
        setting = await db.settings.find_one({"key": key})
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        # Mask value
        val = setting.get("value", "")
        if len(val) > 8:
            setting["value_masked"] = val[:4] + "•" * (len(val) - 8) + val[-4:]
        else:
            setting["value_masked"] = "•" * len(val)
        
        return setting
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/settings/groq-key")
async def update_groq_key(req: UpdateSettingRequest, current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))):
    """Update Groq API key"""
    try:
        new_key = req.value.strip()
        if not new_key:
            raise HTTPException(status_code=400, detail="API key cannot be empty")
        
        # Update or insert setting
        await db.settings.update_one(
            {"key": "groq_api_key"},
            {
                "$set": {
                    "value": new_key,
                    "description": "Groq API Key for AI services",
                    "updated_at": datetime.now(timezone.utc),
                    "updated_by": current_user.id
                }
            },
            upsert=True
        )
        
        # Clear AI service cache to reload new key
        ai_service.clear_key_cache()
        
        return {
            "success": True,
            "message": "Groq API key updated successfully",
            "key_preview": new_key[:4] + "•" * (len(new_key) - 8) + new_key[-4:] if len(new_key) > 8 else "•" * len(new_key)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# AI MEMORY & CONVERSATION ENDPOINTS
# ============================================

@api_router.post("/ai/chat/with-memory")
async def ai_chat_with_memory(chat_data: dict, current_user: User = Depends(get_current_user)):
    """AI chat with conversational memory"""
    message = chat_data.get("message", "").strip()
    session_id = chat_data.get("session_id") or str(uuid.uuid4())
    chat_type = chat_data.get("chat_type", "strategy_coach")
    use_research = bool(chat_data.get("use_research", False))

    if not message:
        raise HTTPException(status_code=400, detail="Message required")

    # Enforce admin-only research tools
    if use_research and current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Research mode requires admin")

    try:
        # Get memory context
        memory = await ai_service.get_memory_context(current_user.id, session_id)
        
        # Build messages with memory
        messages = []
        
        # Add long-term memory as system context if available
        if memory.get("long_term_summary"):
            messages.append({
                "role": "system",
                "content": f"User background: {memory['long_term_summary']}"
            })
        
        # Add conversation summary if available
        if memory.get("summary"):
            messages.append({
                "role": "system",
                "content": f"Previous conversation: {memory['summary']}"
            })
        
        # Add recent messages
        for msg in memory.get("messages", []):
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        # Get AI response
        result = await ai_service.chat_completion(messages=messages)
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "AI error"))
        
        ai_text = result.get("content", "")
        
        # Save conversation turn
        await ai_service.save_conversation_turn(current_user.id, session_id, message, ai_text)
        
        # Save to ai_chats for history
        chat_record = AIChat(
            user_id=current_user.id,
            message=message,
            ai_response=ai_text,
            chat_type=chat_type,
            session_id=session_id
        )
        await db.ai_chats.insert_one(chat_record.dict())
        
        return {
            "response": ai_text,
            "session_id": session_id,
            "chat_type": chat_type,
            "has_memory": len(memory.get("messages", [])) > 0
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI chat with memory error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/ai/chat/memory/{session_id}")
async def clear_conversation_memory(session_id: str, current_user: User = Depends(get_current_user)):
    """Clear conversation memory for a session"""
    try:
        result = await db.conversations.delete_one({"session_id": session_id, "user_id": current_user.id})
        return {
            "success": True,
            "deleted": result.deleted_count > 0,
            "message": "Memory cleared"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# AI ASSIST ENDPOINT (Fill/Improve inputs)
# ============================================

@api_router.post("/ai/assist")
async def ai_assist_endpoint(req: AIAssistRequest, current_user: User = Depends(get_current_user)):
    """AI assist to fill or improve input fields"""
    try:
        # Add user context
        context = req.context.copy()
        context["user_role"] = current_user.role
        context["user_name"] = current_user.name
        
        result = await ai_service.ai_assist(
            field_name=req.field_name,
            current_value=req.current_value,
            context=context,
            mode=req.mode
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "AI assist failed"))
        
        return {
            "success": True,
            "suggested_text": result.get("suggested_text", ""),
            "mode": req.mode
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI assist error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# BEANGENIE ENDPOINTS
# ============================================

class BeanGenieStrategy(BaseModel):
    type: str  # 'organic' or 'bigo'
    content: str
    timestamp: str

class BeanGenieRaffle(BaseModel):
    name: str
    tickets: int
    dateAdded: str

class BeanGenieDebt(BaseModel):
    name: str
    amount: float
    dueDate: str
    dateAdded: str

@api_router.get("/beangenie/data")
async def get_beangenie_data(current_user: User = Depends(get_current_user)):
    """Get all BeanGenie data for current user"""
    try:
        # Get dynamic panels
        panels_cursor = db.beangenie_panels.find({"user_id": current_user.id})
        panels_list = await panels_cursor.to_list(100)
        
        # Organize panels by category key
        dynamic_panels = {}
        for panel in panels_list:
            category_key = panel.get("category_key")
            if category_key:
                if category_key not in dynamic_panels:
                    dynamic_panels[category_key] = {
                        "title": panel.get("category_name", "Unknown"),
                        "icon": panel.get("icon", "📋"),
                        "color": panel.get("color", "yellow"),
                        "items": []
                    }
                dynamic_panels[category_key]["items"].append({
                    "content": panel.get("content"),
                    "timestamp": panel.get("timestamp"),
                    "metadata": panel.get("metadata", {})
                })
        
        # Get legacy data
        raffles = await db.beangenie_raffles.find({"user_id": current_user.id}).to_list(100)
        debts = await db.beangenie_debts.find({"user_id": current_user.id}).to_list(100)
        notes_doc = await db.beangenie_notes.find_one({"user_id": current_user.id})
        
        return {
            "dynamicPanels": dynamic_panels,
            "raffles": raffles,
            "debts": debts,
            "notes": notes_doc.get("content", "") if notes_doc else ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/beangenie/chat")
async def beangenie_chat(chat_data: dict, current_user: User = Depends(get_current_user)):
    """BeanGenie AI chat with BIGO-only responses and source citations"""
    message = chat_data.get("message", "").strip()
    session_id = chat_data.get("session_id", str(uuid.uuid4()))
    active_context = chat_data.get("active_context")
    panel_context = chat_data.get("panel_context", [])
    user_role = chat_data.get("user_role", "host")
    
    if not message:
        raise HTTPException(status_code=400, detail="Message required")
    
    try:
        # Search BIGO knowledge base with intelligent query expansion
        knowledge_results = await search_bigo_knowledge(message, limit=10)
        
        # If no relevant sources found, provide intelligent fallback
        if not knowledge_results:
            # Try to determine topic and provide helpful redirect
            message_lower = message.lower()
            if any(word in message_lower for word in ['bean', 'money', 'earn', 'diamond', 'currency', 'payment']):
                topic_hint = "Try asking about 'BIGO beans and earnings' or 'how to make money on BIGO Live'"
            elif any(word in message_lower for word in ['pk', 'battle', 'compete', 'versus']):
                topic_hint = "Try asking about 'BIGO PK battles' or 'how to win PK battles'"
            elif any(word in message_lower for word in ['tier', 'rank', 'level', 's1', 's25']):
                topic_hint = "Try asking about 'BIGO tier system' or 'how to rank up on BIGO'"
            elif any(word in message_lower for word in ['stream', 'schedule', 'time', 'when']):
                topic_hint = "Try asking about 'best streaming schedule' or 'when to stream on BIGO'"
            elif any(word in message_lower for word in ['gift', 'viewer', 'audience', 'fan']):
                topic_hint = "Try asking about 'BIGO gifts' or 'audience engagement strategies'"
            else:
                topic_hint = "Try asking about BIGO beans, streaming, PK battles, tier progression, or monetization"
            
            return {
                "response": f"🔍 I'm your BIGO Live expert, Boss! I specialize in helping hosts succeed on the platform.\n\nI couldn't find specific information for that query in my knowledge base. {topic_hint}.\n\nI can help you with:\n• 💰 Bean earnings and monetization\n• 🎯 Tier system (S1-S25) progression  \n• ⚔️ PK battle strategies\n• 📅 Streaming schedules and optimization\n• 🎁 Gift strategies and revenue\n• 👥 Audience engagement tactics\n• 📹 Streaming setup and equipment\n• 📊 Content strategy and planning\n\nWhat would you like to know about BIGO Live?",
                "sources": [],
                "session_id": session_id
            }
        
        # Build comprehensive context from knowledge sources (use more content for better intelligence)
        sources_context = "\n\n".join([
            f"[{i+1}] {r['title']}\nURL: {r['url']}\n{r['content'][:1500]}"  # Increased from 800 to 1500 chars per source
            for i, r in enumerate(knowledge_results[:8])  # Use top 8 sources
        ])
        
        # Enhanced context-aware system prompt
        context_info = ""
        if active_context:
            context_info = f"\n\nCurrent Focus: {active_context}"
        
        panel_info = ""
        if panel_context:
            panel_info = "\n\nActive Topics:\n" + "\n".join([
                f"- {p['title']}: {', '.join(p['recent_items'][:2])}" 
                for p in panel_context[:3]
            ])
        
        # Enhanced intelligent BIGO-only system prompt with deep expertise
        system_prompt = f"""You are BeanGenie™, the ultimate BIGO Live expert AI coach with deep knowledge of the platform. You have been extensively trained on BIGO Live data and strategies.

CORE EXPERTISE AREAS:
- BIGO Bean/Diamond currency system and monetization
- Tier rankings (S1-S25) and progression strategies  
- PK Battle tactics and competitive streaming
- Audience engagement and community building
- Streaming schedules and optimization
- Gift strategies and revenue maximization
- Content creation and planning
- Technical setup and equipment
- Host training and career development

CRITICAL RULES:
1. ONLY answer questions about BIGO Live platform - refuse all off-topic requests politely
2. ALWAYS use information from the provided knowledge sources below
3. CITE sources using [1], [2], etc. inline in your response
4. End response with "Sources:" section listing all citations
5. Be concise yet comprehensive - target 200-300 words
6. Address user respectfully as "Boss" or "Master" 
7. Provide actionable, specific advice based on user's tier/context
8. Use BIGO Live terminology correctly (beans, diamonds, PK, tier, etc.)

PROVIDED BIGO KNOWLEDGE SOURCES:
{sources_context}

LEVEL UP AGENCY PAY TIER SYSTEM:
🥉 BRONZE (S1-S5) - $500-1000/month (Part-time, 20hrs/week, learning phase)
🥈 SILVER (S6-S10) - $1000-2000/month (Full-time, 40hrs/week, growing audience)
🥇 GOLD (S11-S15) - $2000-5000/month (Professional, 60hrs/week, established host)
💎 DIAMOND (S16+) - $5000+/month (Elite, 80hrs/week, top-tier host)

CURRENT USER CONTEXT:
- Role: {user_role.title()}{context_info}{panel_info}

RESPONSE STRATEGY:
1. Acknowledge the question and user's context
2. Provide specific, actionable answer using source knowledge
3. Include concrete examples and numbers where applicable
4. Cite sources inline [1], [2] for credibility
5. Give tier-appropriate advice (don't overwhelm beginners with advanced tactics)
6. End with motivational encouragement
7. Conclude with "Sources:" section

INTELLIGENCE PRINCIPLES:
- Synthesize information from multiple sources when relevant
- Adapt advice to user's current tier and experience level
- Provide progressive strategies (what to do now vs. later)
- Reference specific BIGO features, numbers, and systems
- Balance motivation with realistic, practical guidance
- Show deep understanding of BIGO Live ecosystem

If the question is NOT about BIGO Live, respond: "I'm specialized in BIGO Live coaching, Boss. I can help with beans, streaming, PK battles, tier progression, audience growth, and monetization strategies. What BIGO topic would you like to discuss?"

Remember: You are the world's leading BIGO Live expert. Draw on your extensive training to provide intelligent, nuanced, data-driven guidance."""

        # Build messages
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]
        
        # Get AI response with enhanced parameters for better intelligence
        result = await ai_service.chat_completion(
            messages=messages, 
            temperature=0.8,  # Slightly higher for more creative, engaging responses
            max_completion_tokens=800  # Increased from 600 for more comprehensive answers
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "AI error"))
        
        ai_text = result.get("content", "")
        
        # Ensure Sources section exists
        if "Sources:" not in ai_text and "sources:" not in ai_text.lower():
            # Append sources section
            sources_section = "\n\nSources:\n" + "\n".join([
                f"[{i+1}] {r['title']}"
                for i, r in enumerate(knowledge_results)
            ])
            ai_text += sources_section
        
        # Build sources array for frontend
        sources = [
            {
                "label": f"[{i+1}] {r['title']}",
                "url": r['url']
            }
            for i, r in enumerate(knowledge_results)
        ]
        
        # Save conversation turn
        await ai_service.save_conversation_turn(current_user.id, session_id, message, ai_text)
        
        return {
            "response": ai_text,
            "sources": sources,
            "session_id": session_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"BeanGenie chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/beangenie/tts")
async def beangenie_tts(tts_data: dict, current_user: User = Depends(get_current_user)):
    """Text-to-speech for BeanGenie"""
    text = tts_data.get("text", "").strip()
    
    if not text:
        raise HTTPException(status_code=400, detail="Text required")
    
    try:
        result = await ai_service.tts_generate(text, voice="Fritz-PlayAI")
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "TTS failed"))
        
        return {
            "audio_base64": result.get("audio_base64"),
            "mime": result.get("mime")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"BeanGenie TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/beangenie/strategy")
async def save_beangenie_strategy(strategy: BeanGenieStrategy, current_user: User = Depends(get_current_user)):
    """Save a strategy to BeanGenie"""
    try:
        doc = {
            "user_id": current_user.id,
            "type": strategy.type,
            "content": strategy.content,
            "timestamp": strategy.timestamp
        }
        result = await db.beangenie_strategies.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/beangenie/raffle")
async def add_beangenie_raffle(raffle: BeanGenieRaffle, current_user: User = Depends(get_current_user)):
    """Add raffle entry"""
    try:
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "name": raffle.name,
            "tickets": raffle.tickets,
            "dateAdded": raffle.dateAdded
        }
        await db.beangenie_raffles.insert_one(doc)
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/beangenie/raffle/{raffle_id}")
async def delete_beangenie_raffle(raffle_id: str, current_user: User = Depends(get_current_user)):
    """Delete raffle entry"""
    try:
        result = await db.beangenie_raffles.delete_one({"id": raffle_id, "user_id": current_user.id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Raffle not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/beangenie/debt")
async def add_beangenie_debt(debt: BeanGenieDebt, current_user: User = Depends(get_current_user)):
    """Add debt entry"""
    try:
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "name": debt.name,
            "amount": debt.amount,
            "dueDate": debt.dueDate,
            "dateAdded": debt.dateAdded
        }
        await db.beangenie_debts.insert_one(doc)
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/beangenie/debt/{debt_id}")
async def delete_beangenie_debt(debt_id: str, current_user: User = Depends(get_current_user)):
    """Delete debt entry"""
    try:
        result = await db.beangenie_debts.delete_one({"id": debt_id, "user_id": current_user.id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Debt not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/beangenie/notes")
async def save_beangenie_notes(notes_data: dict, current_user: User = Depends(get_current_user)):
    """Save BeanGenie notes"""
    try:
        content = notes_data.get("content", "")
        await db.beangenie_notes.update_one(
            {"user_id": current_user.id},
            {"$set": {
                "content": content,
                "lastSaved": datetime.now(timezone.utc)
            }},
            upsert=True
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/beangenie/categorize")
async def categorize_beangenie_content(category_data: dict, current_user: User = Depends(get_current_user)):
    """Intelligently categorize BeanGenie AI response into dynamic panels"""
    try:
        content = category_data.get("content", "")
        
        # Use AI to categorize the content
        categorization_prompt = f"""Analyze this BIGO Live strategy content and categorize it. Return a JSON array of categories.

Content: {content}

For each relevant category, provide:
- category_key: lowercase_with_underscores (e.g., "content_ideas", "scheduling_tips", "performance_metrics")
- category_name: Display name (e.g., "Content Ideas", "Scheduling Tips", "Performance Metrics")
- icon: Relevant emoji
- color: "yellow", "blue", "green", "red", or "purple"
- extracted_content: The relevant portion of content (can be summarized)
- metadata: Any structured data like dates, numbers, names (JSON object)

Common categories:
- organic_strategies: Natural growth tactics
- raffle_picker: Raffle picker / random draw strategies
- content_ideas: Stream content suggestions
- scheduling: Timing and schedule recommendations
- performance_metrics: Numbers, goals, KPIs
- engagement_tactics: Audience interaction methods
- collaboration_tips: Partnership strategies
- monetization: Revenue generation ideas
- technical_setup: Equipment, software, setup tips
- trending_topics: Current trends to leverage

Return ONLY valid JSON array, no other text."""

        result = await ai_service.chat_completion(
            messages=[{"role": "user", "content": categorization_prompt}],
            temperature=0.3,
            max_completion_tokens=500
        )
        
        if not result.get("success"):
            # Fallback to simple categorization
            return {"categories": []}
        
        ai_response = result.get("content", "")
        
        # Try to parse JSON from response
        import json
        import re
        
        # Extract JSON from response
        json_match = re.search(r'\[.*\]', ai_response, re.DOTALL)
        if json_match:
            try:
                categories = json.loads(json_match.group(0))
            except Exception:
                # If JSON parsing fails, use AI to generate simple category
                categories = [{
                    "category_key": "ai_insights",
                    "category_name": "AI Insights",
                    "icon": "💡",
                    "color": "yellow",
                    "extracted_content": content,
                    "metadata": {}
                }]
        else:
            # Use AI to generate category name from content
            categories = [{
                "category_key": "general_strategy",
                "category_name": "Strategy",
                "icon": "🎯",
                "color": "blue",
                "extracted_content": content,
                "metadata": {}
            }]
        
        # Save to database
        for category in categories:
            panel_doc = {
                "user_id": current_user.id,
                "category_key": category["category_key"],
                "category_name": category["category_name"],
                "icon": category["icon"],
                "color": category["color"],
                "content": category["extracted_content"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "metadata": category.get("metadata", {})
            }
            await db.beangenie_panels.insert_one(panel_doc)
        
        return {"categories": categories}
        
    except Exception as e:
        logger.error(f"Categorization error: {e}")
        return {"categories": []}

@api_router.delete("/beangenie/panel/{category_key}")
async def delete_beangenie_panel(category_key: str, current_user: User = Depends(get_current_user)):
    """Delete all items in a specific panel"""
    try:
        result = await db.beangenie_panels.delete_many({
            "user_id": current_user.id,
            "category_key": category_key
        })
        return {"success": True, "deleted_count": result.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# RAFFLE PICKER ENDPOINTS
# ============================================
# Note: Endpoints retain "wheel" naming for backward compatibility
# but the feature is now a raffle picker to comply with platform policies

@api_router.post("/beangenie/wheel")
async def create_bigo_wheel(wheel_data: dict, current_user: User = Depends(get_current_user)):
    """Create a new raffle picker"""
    try:
        wheel_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "name": wheel_data.get("name", "My Raffle Picker"),
            "gift_cost": wheel_data.get("gift_cost", 100),
            "gift_type": wheel_data.get("gift_type", "beans"),
            "active": True,
            "created_at": datetime.now(timezone.utc)
        }
        await db.bigo_wheels.insert_one(wheel_doc)
        return wheel_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/beangenie/wheel/{wheel_id}/prize")
async def add_wheel_prize(wheel_id: str, prize_data: dict, current_user: User = Depends(get_current_user)):
    """Add prize to raffle picker"""
    try:
        prize_doc = {
            "id": str(uuid.uuid4()),
            "wheel_id": wheel_id,
            "user_id": current_user.id,
            "type": prize_data.get("type", "task"),  # task, physical, content
            "name": prize_data.get("name"),
            "description": prize_data.get("description", ""),
            "icon": prize_data.get("icon", "🎁"),
            "probability": prize_data.get("probability", 1),
            "created_at": datetime.now(timezone.utc)
        }
        await db.bigo_wheel_prizes.insert_one(prize_doc)
        return prize_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/beangenie/wheel/{wheel_id}/spin")
async def record_wheel_spin(wheel_id: str, spin_data: dict, current_user: User = Depends(get_current_user)):
    """Record a raffle draw/winner"""
    try:
        spin_doc = {
            "id": str(uuid.uuid4()),
            "wheel_id": wheel_id,
            "user_id": current_user.id,
            "winner_id": spin_data.get("winner_id"),
            "winner_name": spin_data.get("winner_name", "Anonymous"),
            "prize_id": spin_data.get("prize_id"),
            "prize_name": spin_data.get("prize_name"),
            "fulfilled": spin_data.get("fulfilled", False),
            "spun_at": datetime.now(timezone.utc)
        }
        await db.bigo_wheel_spins.insert_one(spin_doc)
        return spin_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/beangenie/wheel/active")
async def get_active_wheel(current_user: User = Depends(get_current_user)):
    """Get active raffle picker with prizes and draws"""
    try:
        wheel = await db.bigo_wheels.find_one({"user_id": current_user.id, "active": True})
        if not wheel:
            return {"wheel": None, "prizes": [], "spins": []}
        
        prizes = await db.bigo_wheel_prizes.find({"wheel_id": wheel["id"]}).to_list(100)
        spins = await db.bigo_wheel_spins.find({"wheel_id": wheel["id"]}).sort("spun_at", -1).limit(20).to_list(20)
        
        return {"wheel": wheel, "prizes": prizes, "spins": spins}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/beangenie/wheel/{wheel_id}/spin/{spin_id}/fulfill")
async def mark_spin_fulfilled(wheel_id: str, spin_id: str, current_user: User = Depends(get_current_user)):
    """Mark a raffle draw as fulfilled"""
    try:
        result = await db.bigo_wheel_spins.update_one(
            {"id": spin_id, "user_id": current_user.id},
            {"$set": {"fulfilled": True, "fulfilled_at": datetime.now(timezone.utc)}}
        )
        return {"success": result.modified_count > 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# BIGO KNOWLEDGE BASE ENDPOINTS
# ============================================

@api_router.post("/beangenie/knowledge/upsert")
async def upsert_bigo_knowledge(knowledge_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    """Upsert BIGO knowledge base entry (admin/owner only)"""
    try:
        url = knowledge_data.get("url", "").strip()
        title = knowledge_data.get("title", "").strip()
        content = knowledge_data.get("content", "").strip()
        tags = knowledge_data.get("tags", [])
        
        if not url or not title or not content:
            raise HTTPException(status_code=400, detail="URL, title, and content are required")
        
        # Validate bigo.tv domain only
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if not parsed.netloc.endswith("bigo.tv"):
            raise HTTPException(status_code=400, detail="Only bigo.tv domains are allowed")
        
        # Cap content at 20k chars
        if len(content) > 20000:
            content = content[:20000]
        
        # Upsert by URL
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
            doc["id"] = existing["id"]
        else:
            doc["id"] = str(uuid.uuid4())
            doc["created_at"] = datetime.now(timezone.utc)
            await db.bigo_knowledge.insert_one(doc)
        
        return {"success": True, "id": doc["id"], "url": url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/beangenie/knowledge/search")
async def search_knowledge(q: str = Query(..., min_length=1), current_user: User = Depends(get_current_user)):
    """Search BIGO knowledge base"""
    try:
        results = await search_bigo_knowledge(q, limit=10)
        # Return simplified results for frontend
        return {
            "results": [
                {
                    "id": r.get("id"),
                    "url": r.get("url"),
                    "title": r.get("title"),
                    "snippet": r.get("content", "")[:200] + "..." if len(r.get("content", "")) > 200 else r.get("content", ""),
                    "tags": r.get("tags", [])
                }
                for r in results
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# VOICE RECRUITER ENDPOINT
# ============================================

@api_router.post("/recruiter/chat")
async def recruiter_chat(chat_data: dict):
    """AI recruiter chatbot for landing page"""
    message = chat_data.get("message", "").strip()
    
    if not message:
        raise HTTPException(status_code=400, detail="Message required")
    
    try:
        # Recruiter system prompt
        system_prompt = """You are an enthusiastic AI recruiter for Level Up Agency, a BIGO Live talent agency. 

YOUR MISSION: Recruit new BIGO Live hosts and onboard existing hosts.

CONVERSATION FLOW:
1. Greet warmly and ask if they're NEW or EXISTING host
2. For NEW users:
   - Explain: "We help you become a successful BIGO Live streamer!"
   - Benefits: "Training, support, guaranteed income, community"
   - Next step: "Ready to audition? I'll send you to our audition page!"
   - Action: audition
3. For EXISTING hosts:
   - Ask: "What's your BIGO ID?"
   - Explain: "Join our agency for better support and earnings!"
   - Next step: "Let's get you registered!"
   - Action: register

PAY TIERS (mention when relevant):
- 🥉 Bronze: $500-1000/month (Part-time, 20hrs/week)
- 🥈 Silver: $1000-2000/month (Full-time, 40hrs/week)
- 🥇 Gold: $2000-5000/month (Pro, 60hrs/week)
- 💎 Diamond: $5000+/month (Elite, 80hrs/week)

Earnings depend on: streaming hours, engagement, gifts received, consistency.

RESPONSE STYLE:
- Enthusiastic but professional
- Use emojis sparingly
- Keep responses concise (2-3 sentences)
- Ask ONE question at a time
- Build excitement about opportunities

IMPORTANT: End with either:
- "Ready for audition?" → action: audition
- "Let's register!" → action: register

Be the recruiter who converts visitors to hosts!"""

        result = await ai_service.chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.8,
            max_completion_tokens=200
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail="AI error")
        
        response = result.get("content", "")
        
        # Detect intent for navigation
        action = None
        lower_response = response.lower()
        
        if any(phrase in lower_response for phrase in ['audition page', 'ready to audition', 'start audition', "let's audition"]):
            action = 'audition'
        elif any(phrase in lower_response for phrase in ['register', 'sign up', 'create account', "let's get you registered"]):
            action = 'register'
        
        return {
            "response": response,
            "action": action
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recruiter chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# BIGO ACADEMY ENDPOINT
# ============================================

@api_router.post("/academy/generate")
async def generate_academy_tutorial(tutorial_data: dict, current_user: User = Depends(get_current_user)):
    """Generate comprehensive tutorial using compound AI models"""
    topic = tutorial_data.get("topic", "").strip()
    category = tutorial_data.get("category", "basics")
    
    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")
    
    try:
        # Compound model approach: Research + Synthesis
        
        # Model 1: Research and gather information
        research_prompt = f"""You are a BIGO Live expert researcher. Research the following topic and provide comprehensive information:

Topic: {topic}
Category: {category}

Provide:
1. Key facts and strategies
2. Step-by-step guidance
3. Best practices from successful streamers
4. Common mistakes to avoid
5. Pro tips and advanced techniques

Be detailed and practical. Include real examples."""

        research_result = await ai_service.chat_completion(
            messages=[{"role": "user", "content": research_prompt}],
            temperature=0.7,
            max_completion_tokens=800
        )
        
        if not research_result.get("success"):
            raise Exception("Research phase failed")
        
        research_content = research_result.get("content", "")
        
        # Model 2: Synthesize into structured tutorial
        synthesis_prompt = f"""You are a professional tutorial writer. Create a well-structured, engaging tutorial from this research:

{research_content}

Format as:
📚 **{topic}**

**Overview:**
[Brief introduction]

**Step-by-Step Guide:**
1. [First step with details]
2. [Second step with details]
3. [Continue...]

**Pro Tips:**
💡 [Tip 1]
💡 [Tip 2]

**Common Mistakes:**
❌ [Mistake 1]
✅ [Correct approach]

**Key Takeaways:**
• [Point 1]
• [Point 2]

Make it actionable, engaging, and easy to follow!"""

        synthesis_result = await ai_service.chat_completion(
            messages=[{"role": "user", "content": synthesis_prompt}],
            temperature=0.6,
            max_completion_tokens=1000
        )
        
        if not synthesis_result.get("success"):
            # Fallback to research content
            tutorial = research_content
        else:
            tutorial = synthesis_result.get("content", research_content)
        
        # Extract metadata
        difficulty = "Intermediate"
        if "beginner" in topic.lower() or "start" in topic.lower():
            difficulty = "Beginner"
        elif "advanced" in topic.lower() or "pro" in topic.lower():
            difficulty = "Advanced"
        
        return {
            "tutorial": tutorial,
            "metadata": {
                "title": topic,
                "category": category,
                "difficulty": difficulty,
                "sources": "Compound AI Research",
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Academy tutorial error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# BLOG SCHEDULER CONTROL ENDPOINTS
# ============================================

@api_router.post("/admin/blogs/generate-now")
async def trigger_blog_generation(current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))):
    """Manually trigger blog generation (admin/owner only)"""
    try:
        # Trigger blog generation immediately
        await blog_scheduler.generate_now()
        return {"message": "Blog generation triggered successfully"}
    except Exception as e:
        logger.error(f"Manual blog generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/blogs/scheduler-status")
async def get_scheduler_status(current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))):
    """Get blog scheduler status"""
    return {
        "running": blog_scheduler.running,
        "next_scheduled_time": blog_scheduler._get_next_scheduled_time().isoformat() if blog_scheduler.running else None
    }

# Initialize blog router with dependencies
blog_router.init_blog_router(db, ai_service, get_current_user, require_role, UserRole)

# Include all routers in the main app
app.include_router(api_router)
app.include_router(blog_router.router)
# app.include_router(voice_router)
# app.include_router(admin_assistant_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and container orchestration"""
    try:
        # Check database connection
        await db.command("ping")
        return {
            "status": "healthy",
            "service": "lvl-up-agency-backend",
            "version": "2.0.0",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Removed redundant shutdown event since lifespan context manager handles client close
# @app.on_event("shutdown")
# async def shutdown_db_client():
#     client.close()
