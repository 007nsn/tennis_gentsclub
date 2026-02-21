from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'tennis-buddies-secret')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    created_at: str

class TeamCreate(BaseModel):
    name: str
    member_ids: List[str]

class TeamResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    member_ids: List[str]
    member_names: List[str] = []
    wins: int = 0
    losses: int = 0
    points: int = 0

class SoloPlayerResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    wins: int = 0
    losses: int = 0
    points: int = 0

class MatchCreate(BaseModel):
    match_type: str  # "team" or "solo"
    team_a_id: Optional[str] = None
    team_b_id: Optional[str] = None
    player_a_id: Optional[str] = None
    player_b_id: Optional[str] = None
    score_a: int
    score_b: int
    match_date: str

class MatchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    match_type: str
    team_a_id: Optional[str] = None
    team_b_id: Optional[str] = None
    team_a_name: Optional[str] = None
    team_b_name: Optional[str] = None
    player_a_id: Optional[str] = None
    player_b_id: Optional[str] = None
    player_a_name: Optional[str] = None
    player_b_name: Optional[str] = None
    score_a: int
    score_b: int
    match_date: str
    status: str  # pending, approved, rejected
    submitted_by: str
    submitted_at: str

class ScheduleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    match_date: str
    match_time: str
    location: str
    teams: List[str]  # team IDs or names for round robin

class ScheduleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = None
    match_date: str
    match_time: str
    location: str
    teams: List[str]
    created_at: str

class ArticleCreate(BaseModel):
    title: str
    content: str
    category: str  # technique, strategy, fitness, equipment
    video_url: Optional[str] = None
    image_url: Optional[str] = None

class ArticleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    category: str
    video_url: Optional[str] = None
    image_url: Optional[str] = None
    author_id: str
    author_name: str
    created_at: str

class ChatMessageCreate(BaseModel):
    message: str

class ChatMessageResponse(BaseModel):
    role: str
    content: str

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"  # normal, high, urgent

class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    priority: str
    author_id: str
    author_name: str
    created_at: str

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    # First user becomes admin
    count = await db.users.count_documents({})
    role = "admin" if count == 0 else "member"
    
    user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "role": role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Create solo player entry
    solo_player = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": user_data.name,
        "wins": 0,
        "losses": 0,
        "points": 1000  # Starting ELO-like points
    }
    await db.solo_players.insert_one(solo_player)
    
    token = create_token(user_id, role)
    return {"token": token, "user": {"id": user_id, "email": user_data.email, "name": user_data.name, "role": role}}

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"]
    )

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

# ============ TEAM ROUTES ============

@api_router.post("/teams", response_model=TeamResponse)
async def create_team(team_data: TeamCreate, user: dict = Depends(get_admin_user)):
    team_id = str(uuid.uuid4())
    
    # Get member names
    members = await db.users.find({"id": {"$in": team_data.member_ids}}, {"_id": 0}).to_list(100)
    member_names = [m["name"] for m in members]
    
    team = {
        "id": team_id,
        "name": team_data.name,
        "member_ids": team_data.member_ids,
        "member_names": member_names,
        "wins": 0,
        "losses": 0,
        "points": 1000
    }
    await db.teams.insert_one(team)
    return TeamResponse(**team)

@api_router.get("/teams", response_model=List[TeamResponse])
async def get_teams():
    teams = await db.teams.find({}, {"_id": 0}).sort("points", -1).to_list(1000)
    return [TeamResponse(**t) for t in teams]

@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, user: dict = Depends(get_admin_user)):
    result = await db.teams.delete_one({"id": team_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted"}

# ============ SOLO LADDER ROUTES ============

@api_router.get("/solo-ladder", response_model=List[SoloPlayerResponse])
async def get_solo_ladder():
    players = await db.solo_players.find({}, {"_id": 0}).sort("points", -1).to_list(1000)
    return [SoloPlayerResponse(**p) for p in players]

# ============ MATCH ROUTES ============

@api_router.post("/matches", response_model=MatchResponse)
async def submit_match(match_data: MatchCreate, user: dict = Depends(get_current_user)):
    match_id = str(uuid.uuid4())
    
    match = {
        "id": match_id,
        "match_type": match_data.match_type,
        "team_a_id": match_data.team_a_id,
        "team_b_id": match_data.team_b_id,
        "player_a_id": match_data.player_a_id,
        "player_b_id": match_data.player_b_id,
        "score_a": match_data.score_a,
        "score_b": match_data.score_b,
        "match_date": match_data.match_date,
        "status": "pending",
        "submitted_by": user["id"],
        "submitted_by_name": user["name"],
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Fetch names for teams/players
    if match_data.match_type == "team":
        team_a = await db.teams.find_one({"id": match_data.team_a_id}, {"_id": 0})
        team_b = await db.teams.find_one({"id": match_data.team_b_id}, {"_id": 0})
        match["team_a_name"] = team_a["name"] if team_a else "Unknown"
        match["team_b_name"] = team_b["name"] if team_b else "Unknown"
    else:
        player_a = await db.solo_players.find_one({"id": match_data.player_a_id}, {"_id": 0})
        player_b = await db.solo_players.find_one({"id": match_data.player_b_id}, {"_id": 0})
        match["player_a_name"] = player_a["name"] if player_a else "Unknown"
        match["player_b_name"] = player_b["name"] if player_b else "Unknown"
    
    await db.matches.insert_one(match)
    return MatchResponse(**match)

@api_router.get("/matches", response_model=List[MatchResponse])
async def get_matches(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    matches = await db.matches.find(query, {"_id": 0}).sort("submitted_at", -1).to_list(1000)
    return [MatchResponse(**m) for m in matches]

@api_router.put("/matches/{match_id}/approve")
async def approve_match(match_id: str, user: dict = Depends(get_admin_user)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match["status"] != "pending":
        raise HTTPException(status_code=400, detail="Match already processed")
    
    # Update match status
    await db.matches.update_one({"id": match_id}, {"$set": {"status": "approved"}})
    
    # Update ladder points
    winner_points = 25
    loser_points = -15
    
    if match["match_type"] == "team":
        if match["score_a"] > match["score_b"]:
            await db.teams.update_one({"id": match["team_a_id"]}, {"$inc": {"wins": 1, "points": winner_points}})
            await db.teams.update_one({"id": match["team_b_id"]}, {"$inc": {"losses": 1, "points": loser_points}})
        else:
            await db.teams.update_one({"id": match["team_b_id"]}, {"$inc": {"wins": 1, "points": winner_points}})
            await db.teams.update_one({"id": match["team_a_id"]}, {"$inc": {"losses": 1, "points": loser_points}})
    else:
        if match["score_a"] > match["score_b"]:
            await db.solo_players.update_one({"id": match["player_a_id"]}, {"$inc": {"wins": 1, "points": winner_points}})
            await db.solo_players.update_one({"id": match["player_b_id"]}, {"$inc": {"losses": 1, "points": loser_points}})
        else:
            await db.solo_players.update_one({"id": match["player_b_id"]}, {"$inc": {"wins": 1, "points": winner_points}})
            await db.solo_players.update_one({"id": match["player_a_id"]}, {"$inc": {"losses": 1, "points": loser_points}})
    
    return {"message": "Match approved and ladder updated"}

@api_router.put("/matches/{match_id}/reject")
async def reject_match(match_id: str, user: dict = Depends(get_admin_user)):
    result = await db.matches.update_one({"id": match_id}, {"$set": {"status": "rejected"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"message": "Match rejected"}

# ============ SCHEDULE ROUTES ============

@api_router.post("/schedules", response_model=ScheduleResponse)
async def create_schedule(schedule_data: ScheduleCreate, user: dict = Depends(get_admin_user)):
    schedule_id = str(uuid.uuid4())
    schedule = {
        "id": schedule_id,
        "title": schedule_data.title,
        "description": schedule_data.description,
        "match_date": schedule_data.match_date,
        "match_time": schedule_data.match_time,
        "location": schedule_data.location,
        "teams": schedule_data.teams,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.schedules.insert_one(schedule)
    return ScheduleResponse(**schedule)

@api_router.get("/schedules", response_model=List[ScheduleResponse])
async def get_schedules():
    schedules = await db.schedules.find({}, {"_id": 0}).sort("match_date", 1).to_list(1000)
    return [ScheduleResponse(**s) for s in schedules]

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, user: dict = Depends(get_admin_user)):
    result = await db.schedules.delete_one({"id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted"}

# ============ EDUCATION ROUTES ============

@api_router.post("/articles", response_model=ArticleResponse)
async def create_article(article_data: ArticleCreate, user: dict = Depends(get_admin_user)):
    article_id = str(uuid.uuid4())
    article = {
        "id": article_id,
        "title": article_data.title,
        "content": article_data.content,
        "category": article_data.category,
        "video_url": article_data.video_url,
        "image_url": article_data.image_url,
        "author_id": user["id"],
        "author_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.articles.insert_one(article)
    return ArticleResponse(**article)

@api_router.get("/articles", response_model=List[ArticleResponse])
async def get_articles(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    articles = await db.articles.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [ArticleResponse(**a) for a in articles]

@api_router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: str):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleResponse(**article)

@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str, user: dict = Depends(get_admin_user)):
    result = await db.articles.delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted"}

# ============ ANNOUNCEMENTS ROUTES ============

@api_router.post("/announcements", response_model=AnnouncementResponse)
async def create_announcement(ann_data: AnnouncementCreate, user: dict = Depends(get_admin_user)):
    ann_id = str(uuid.uuid4())
    announcement = {
        "id": ann_id,
        "title": ann_data.title,
        "content": ann_data.content,
        "priority": ann_data.priority,
        "author_id": user["id"],
        "author_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.announcements.insert_one(announcement)
    return AnnouncementResponse(**announcement)

@api_router.get("/announcements", response_model=List[AnnouncementResponse])
async def get_announcements():
    announcements = await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [AnnouncementResponse(**a) for a in announcements]

@api_router.delete("/announcements/{ann_id}")
async def delete_announcement(ann_id: str, user: dict = Depends(get_admin_user)):
    result = await db.announcements.delete_one({"id": ann_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement deleted"}

# ============ CHATBOT ROUTES ============

@api_router.post("/chat", response_model=ChatMessageResponse)
async def chat_with_bot(message: ChatMessageCreate, user: dict = Depends(get_current_user)):
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"tennis-chat-{user['id']}",
            system_message="""You are a friendly and knowledgeable tennis assistant for the Tennis Buddies Club. You help with:
1. General tennis questions (rules, techniques, strategies)
2. Tennis equipment recommendations
3. Fitness tips for tennis players
4. Club-specific information (schedules, ladder rankings, how to submit match results)

Be encouraging, concise, and helpful. If asked about specific club data like schedules or rankings, explain that users can find this in the Schedule, Team Ladder, or Solo Ladder pages of the app.
"""
        ).with_model("openai", "gpt-5.2")
        
        user_msg = UserMessage(text=message.message)
        response = await chat.send_message(user_msg)
        
        # Store chat history
        await db.chat_history.insert_one({
            "user_id": user["id"],
            "user_message": message.message,
            "bot_response": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return ChatMessageResponse(role="assistant", content=response)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat service unavailable")

@api_router.get("/chat/history", response_model=List[dict])
async def get_chat_history(user: dict = Depends(get_current_user)):
    history = await db.chat_history.find({"user_id": user["id"]}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return history

# ============ DASHBOARD STATS ============

@api_router.get("/stats")
async def get_stats():
    total_members = await db.users.count_documents({})
    total_teams = await db.teams.count_documents({})
    total_matches = await db.matches.count_documents({"status": "approved"})
    pending_matches = await db.matches.count_documents({"status": "pending"})
    
    return {
        "total_members": total_members,
        "total_teams": total_teams,
        "total_matches": total_matches,
        "pending_matches": pending_matches
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
