from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
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
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(
    title="Level Up Agency - BIGO Live Host Management Platform",
    description="The Ultimate BIGO Live Host Success Platform - Tasks, Rewards, AI Coaching & More!",
    version="1.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET", "levelup-bigo-hosts-secret-2025")
ALGORITHM = "HS256"

# AI Chat Setup
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

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
    repeat_rule: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True
    youtube_video: Optional[str] = None

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
    description: str
    category: str = "general"
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
    chat_type: str = "general"  # general, content_ideas, flyer, math, quota
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuotaTarget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    target_type: str  # weekly, monthly
    target_amount: float
    current_progress: float = 0.0
    bonus_rate: float = 0.0
    cash_out_threshold: float = 0.0
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

# AI Helper
async def get_ai_response(user_message: str, chat_type: str = "general"):
    try:
        system_messages = {
            "general": "You are a BIGO Live expert AI assistant. You help BIGO hosts maximize their success, earnings, and audience engagement. Provide actionable advice with enthusiasm and positivity.",
            "content_ideas": "You are a content creation specialist for BIGO Live hosts. Generate creative, engaging content ideas that will attract viewers and increase gifts. Focus on trending topics, interactive formats, and audience engagement strategies.",
            "flyer": "You are a marketing expert creating promotional flyers for BIGO Live events. Provide compelling copy, suggest visual elements, and create attention-grabbing headlines that drive participation.",
            "math": "You are a financial calculator for BIGO hosts. Help calculate earnings, conversion rates, gift values, and commission structures. Explain complex calculations in simple terms.",
            "quota": "You are a performance coach for BIGO Live hosts. Help them understand quotas, set realistic goals, track progress, and develop strategies to meet targets for maximum earnings."
        }
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"levelup_{chat_type}_{datetime.now().timestamp()}",
            system_message=system_messages.get(chat_type, system_messages["general"])
        ).with_model("openai", "gpt-4o")
        
        user_msg = UserMessage(text=user_message)
        response = await chat.send_message(user_msg)
        
        return response
    except Exception as e:
        return f"I'm sorry, I'm experiencing technical difficulties. Please try again later. Error: {str(e)}"

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"bigo_id": user_data.bigo_id})
    if existing_user:
        raise HTTPException(status_code=400, detail="BIGO ID already registered")
    
    MEMBER_PASSCODE = "LEVELUP2025"
    discord_access = user_data.passcode == MEMBER_PASSCODE if user_data.passcode else False
    
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
    quiz = Quiz(**quiz_data)
    await db.quizzes.insert_one(quiz.dict())
    return quiz

@api_router.get("/quizzes")
async def get_quizzes(current_user: User = Depends(get_current_user)):
    quizzes = await db.quizzes.find({"active": True}).to_list(1000)
    return [Quiz(**quiz) for quiz in quizzes]

@api_router.get("/quizzes/{quiz_id}/questions")
async def get_quiz_questions(quiz_id: str, current_user: User = Depends(get_current_user)):
    questions = await db.quiz_questions.find({"quiz_id": quiz_id}).to_list(1000)
    return [QuizQuestion(**q) for q in questions]

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

# Calendar/Events Routes
@api_router.post("/events")
async def create_event(event_data: dict, current_user: User = Depends(get_current_user)):
    event = Event(**event_data, creator_id=current_user.id, creator_bigo_id=current_user.bigo_id)
    await db.events.insert_one(event.dict())
    return event

@api_router.get("/events")
async def get_events(event_type: Optional[EventType] = None, current_user: User = Depends(get_current_user)):
    filter_query = {"active": True}
    if event_type:
        filter_query["event_type"] = event_type
    
    events = await db.events.find(filter_query).sort("start_time", 1).to_list(1000)
    return [Event(**event) for event in events]

@api_router.get("/events/personal")
async def get_personal_events(current_user: User = Depends(get_current_user)):
    events = await db.events.find({
        "creator_id": current_user.id,
        "active": True
    }).sort("start_time", 1).to_list(1000)
    return [Event(**event) for event in events]

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

# AI Chat Routes
@api_router.post("/ai/chat")
async def ai_chat(chat_data: dict, current_user: User = Depends(get_current_user)):
    message = chat_data.get("message", "")
    chat_type = chat_data.get("chat_type", "general")
    
    ai_response = await get_ai_response(message, chat_type)
    
    chat_record = AIChat(
        user_id=current_user.id,
        message=message,
        ai_response=ai_response,
        chat_type=chat_type
    )
    
    await db.ai_chats.insert_one(chat_record.dict())
    
    return {"response": ai_response, "chat_type": chat_type}

@api_router.get("/ai/chat/history")
async def get_ai_chat_history(current_user: User = Depends(get_current_user)):
    chats = await db.ai_chats.find({"user_id": current_user.id}).sort("created_at", -1).limit(50).to_list(50)
    return [AIChat(**chat) for chat in chats]

# Quota Management Routes
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

# Admin Routes
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
    
    return {
        "total_users": total_users,
        "total_hosts": total_hosts,
        "active_users_7d": len(active_users_7d),
        "pending_submissions": pending_submissions,
        "pending_redemptions": pending_redemptions,
        "total_points_issued": total_points_issued,
        "total_points_redeemed": total_points_redeemed
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