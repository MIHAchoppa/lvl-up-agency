from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Level Up Agency API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

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

class UserCreate(BaseModel):
    bigo_id: str
    password: str
    email: Optional[EmailStr] = None
    name: str
    timezone: str = "UTC"
    passcode: Optional[str] = None

class UserLogin(BaseModel):
    bigo_id: str
    password: str

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    points: int
    due_at: Optional[datetime] = None
    requires_proof: bool = False
    repeat_rule: Optional[str] = None  # weekly, monthly
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True

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

class Quiz(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    pass_mark: int = 80
    points: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True

class QuizQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quiz_id: str
    prompt: str
    options: List[str]
    correct_index: int

class QuizAttempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    quiz_id: str
    score: int
    passed: bool
    attempted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Reward(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    cost_points: int
    fulfillment_type: str = "manual"  # manual, auto_note
    terms: str
    active: bool = True
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
    delta: int  # positive for earning, negative for spending
    reason: str
    ref_type: str  # task, quiz, manual, adjustment, redemption
    ref_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Announcement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    body: str
    publish_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pinned: bool = False
    audience: str = "all"  # all, hosts, coaches
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Channel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    visibility: str = "public"  # public, role_based
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    channel_id: str
    user_id: str
    body: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    flagged: bool = False

class Resource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    category: str  # Start Here, Grow, Advanced
    type: str  # text, pdf, video
    content_url: Optional[str] = None
    content_text: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True

class ProfilePost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    content: str
    image_url: Optional[str] = None
    post_type: str = "update"  # update, flyer, merch
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True

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

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"bigo_id": user_data.bigo_id})
    if existing_user:
        raise HTTPException(status_code=400, detail="BIGO ID already registered")
    
    # Validate passcode for members (if provided)
    MEMBER_PASSCODE = "LEVELUP2025"  # Change this in production
    if user_data.passcode and user_data.passcode == MEMBER_PASSCODE:
        discord_access = True
    else:
        discord_access = False
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user = User(
        bigo_id=user_data.bigo_id,
        email=user_data.email,
        name=user_data.name,
        timezone=user_data.timezone,
        discord_access=discord_access
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return {"access_token": access_token, "token_type": "bearer", "user": user}

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

# Task Routes
@api_router.post("/tasks")
async def create_task(task_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN, UserRole.COACH]))):
    task = Task(**task_data, created_by=current_user.id)
    await db.tasks.insert_one(task.dict())
    return task

@api_router.get("/tasks")
async def get_tasks(current_user: User = Depends(get_current_user)):
    tasks = await db.tasks.find({"active": True}).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.post("/tasks/{task_id}/submit")
async def submit_task(task_id: str, submission_data: dict, current_user: User = Depends(get_current_user)):
    # Check if task exists
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if already submitted
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

@api_router.put("/task-submissions/{submission_id}/review")
async def review_submission(submission_id: str, review_data: dict, current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN, UserRole.COACH]))):
    submission = await db.task_submissions.find_one({"id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Update submission
    update_data = {
        "status": review_data["status"],
        "reviewed_by": current_user.id,
        "reviewed_at": datetime.now(timezone.utc)
    }
    
    await db.task_submissions.update_one(
        {"id": submission_id},
        {"$set": update_data}
    )
    
    # Award points if approved
    if review_data["status"] == "approved":
        task = await db.tasks.find_one({"id": submission["task_id"]})
        if task:
            # Add points to user
            await db.users.update_one(
                {"id": submission["user_id"]},
                {"$inc": {"total_points": task["points"]}}
            )
            
            # Log point transaction
            point_entry = PointLedger(
                user_id=submission["user_id"],
                delta=task["points"],
                reason=f"Task completed: {task['title']}",
                ref_type="task",
                ref_id=task["id"]
            )
            await db.point_ledger.insert_one(point_entry.dict())
    
    return {"message": "Submission reviewed successfully"}

# Rewards Routes
@api_router.get("/rewards")
async def get_rewards(current_user: User = Depends(get_current_user)):
    rewards = await db.rewards.find({"active": True}).to_list(1000)
    return [Reward(**reward) for reward in rewards]

@api_router.post("/rewards/{reward_id}/redeem")
async def redeem_reward(reward_id: str, current_user: User = Depends(get_current_user)):
    reward = await db.rewards.find_one({"id": reward_id})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    if current_user.total_points < reward["cost_points"]:
        raise HTTPException(status_code=400, detail="Insufficient points")
    
    # Create redemption request
    redemption = Redemption(
        user_id=current_user.id,
        reward_id=reward_id
    )
    
    await db.redemptions.insert_one(redemption.dict())
    
    # Deduct points
    await db.users.update_one(
        {"id": current_user.id},
        {"$inc": {"total_points": -reward["cost_points"]}}
    )
    
    # Log point transaction
    point_entry = PointLedger(
        user_id=current_user.id,
        delta=-reward["cost_points"],
        reason=f"Redeemed: {reward['title']}",
        ref_type="redemption",
        ref_id=redemption.id
    )
    await db.point_ledger.insert_one(point_entry.dict())
    
    return redemption

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

# Profile Posts Routes
@api_router.get("/profile-posts")
async def get_profile_posts(current_user: User = Depends(get_current_user)):
    posts = await db.profile_posts.find({"active": True}).sort("created_at", -1).to_list(100)
    return [ProfilePost(**post) for post in posts]

@api_router.post("/profile-posts")
async def create_profile_post(post_data: dict, current_user: User = Depends(get_current_user)):
    post = ProfilePost(**post_data, user_id=current_user.id)
    await db.profile_posts.insert_one(post.dict())
    return post

# Dashboard/Analytics Routes
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN]))):
    # Total users
    total_users = await db.users.count_documents({})
    
    # Active users (7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_users_7d = await db.task_submissions.distinct("user_id", {"submitted_at": {"$gte": week_ago}})
    
    # Total points issued
    points_issued = await db.point_ledger.aggregate([
        {"$match": {"delta": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$delta"}}}
    ]).to_list(1)
    total_points_issued = points_issued[0]["total"] if points_issued else 0
    
    # Total points redeemed
    points_redeemed = await db.point_ledger.aggregate([
        {"$match": {"delta": {"$lt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$delta"}}}
    ]).to_list(1)
    total_points_redeemed = abs(points_redeemed[0]["total"]) if points_redeemed else 0
    
    return {
        "total_users": total_users,
        "active_users_7d": len(active_users_7d),
        "total_points_issued": total_points_issued,
        "total_points_redeemed": total_points_redeemed
    }

# Include the router in the main app
app.include_router(api_router)

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()