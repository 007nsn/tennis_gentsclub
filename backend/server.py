from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query, UploadFile, File
from fastapi.responses import JSONResponse, Response, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
import io
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import resend
import requests as http_requests
from itertools import combinations

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'tennis-buddies-secret')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://doubles-ladder.preview.emergentagent.com')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '').replace('\\n', '\n')
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_CLAIMS = {"sub": "mailto:admin@tennis-buddies.me"}

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# ============ OBJECT STORAGE ============

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "tennis-buddies"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = http_requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = http_requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = http_requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

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
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    phone: Optional[str] = None
    created_at: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

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

class SoloPlayerUpdate(BaseModel):
    wins: Optional[int] = None
    name: Optional[str] = None

class MatchCreate(BaseModel):
    match_type: str
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
    status: str
    submitted_by: str
    submitted_at: str

class ScheduleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    match_date: str
    match_time: str
    location: str
    teams: List[str] = []
    court_assignments: Optional[List[dict]] = None

class ScheduleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = None
    match_date: str
    match_time: str
    location: str
    teams: List[str]
    court_assignments: Optional[List[dict]] = None
    created_at: str

class ArticleCreate(BaseModel):
    title: str
    content: str
    category: str
    content_type: str = "article"  # article, video, infographic
    video_url: Optional[str] = None
    image_url: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_content_type: Optional[str] = None

class ArticleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    category: str
    content_type: str = "article"
    video_url: Optional[str] = None
    image_url: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_content_type: Optional[str] = None
    author_id: str
    author_name: str
    created_at: str

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    content_type: Optional[str] = None
    video_url: Optional[str] = None
    image_url: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_content_type: Optional[str] = None

class ChatMessageCreate(BaseModel):
    message: str

class ChatMessageResponse(BaseModel):
    role: str
    content: str

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"

class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    priority: str
    author_id: str
    author_name: str
    created_at: str

# Availability models
class AvailabilityCreate(BaseModel):
    date: str
    available: bool

class AvailabilityResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    date: str
    available: bool
    confirmed_at: str

# Message models (Player to Admin - kept for direct messages)
class MessageCreate(BaseModel):
    content: str
    recipient_id: Optional[str] = None  # If None, goes to admin

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sender_id: str
    sender_name: str
    recipient_id: Optional[str] = None
    content: str
    read: bool = False
    created_at: str

# Chatroom models (Group chat for all members)
class ChatroomMessageCreate(BaseModel):
    content: str

class ChatroomMessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sender_id: str
    sender_name: str
    sender_role: str
    content: str
    created_at: str

# Match History / Player Stats
class PlayerStatsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    player_id: str
    player_name: str
    total_matches: int
    wins: int
    win_rate: float
    recent_form: List[str]  # Last 5 results: W/L

# Opponent Scout
class OpponentScoutRequest(BaseModel):
    opponent_name: str
    playstyle: str  # e.g., "aggressive baseliner", "serve and volley"
    strengths: str
    weaknesses: str
    additional_notes: Optional[str] = None

class OpponentScoutResponse(BaseModel):
    strategy: str
    key_tactics: List[str]
    warnings: List[str]

# Strategy Bot
class StrategyBotRequest(BaseModel):
    message: str
    session_id: Optional[str] = None  # For maintaining chat history

class StrategyBotResponse(BaseModel):
    response: str
    session_id: str

# Season Standings
class SeasonStandingsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    player_id: str
    player_name: str
    matches_played: int
    wins: int
    losses: int
    win_rate: float
    current_streak: int  # Positive for wins, negative for losses
    best_streak: int
    points: int  # Cumulative points (wins)

# Match Reminder
class MatchReminderCreate(BaseModel):
    match_date: str
    message: str

# Round Robin Generation
class RoundRobinRequest(BaseModel):
    date: str
    num_courts: int = 2
    match_duration_minutes: int = 30
    start_time: str = "09:00"

class ClubSettings(BaseModel):
    num_courts: int = 2
    default_location: str = "Local Tennis Club"
    match_duration_minutes: int = 30
    default_start_time: str = "09:00"
    checkin_timezone: str = "US/Eastern"
    rsvp_open_day: int = 2  # 0=Mon,1=Tue,2=Wed,3=Thu,4=Fri,5=Sat,6=Sun
    rsvp_open_hour: int = 7  # Hour in local timezone (0-23)

# ============ WEEKLY CHECK-IN MODELS ============

class WeeklyEventCreate(BaseModel):
    event_date: str  # YYYY-MM-DD (Sunday)
    title: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[str] = None
    num_courts: Optional[int] = None  # Per-event override

class CheckInCreate(BaseModel):
    event_id: str
    status: str  # "available", "not_available", "maybe", "bench"

class ApprovePlayersRequest(BaseModel):
    event_id: str
    approved_player_ids: List[str]
    waitlist_player_ids: List[str] = []

class AdminOverrideRequest(BaseModel):
    event_id: str
    player_id: str
    action: str  # "add_approved", "move_to_waitlist", "remove"

class GenerateDoublesRRRequest(BaseModel):
    event_id: str
    num_courts: Optional[int] = None
    start_time: Optional[str] = None
    match_duration_minutes: Optional[int] = None

class AddExternalPlayerRequest(BaseModel):
    name: str

class AddPlayersRequest(BaseModel):
    player_ids: List[str]

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

async def get_current_user(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
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

# ============ EMAIL HELPERS ============

async def send_email(to_email: str, subject: str, html_content: str):
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return None
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}")
        return result
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return None

def get_email_template(title: str, content: str, button_text: str = None, button_url: str = None):
    button_html = ""
    if button_text and button_url:
        button_html = f'''
        <tr>
            <td style="padding: 20px 0;">
                <a href="{button_url}" style="background-color: #CCFF00; color: #002040; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">{button_text}</a>
            </td>
        </tr>
        '''
    return f'''
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #F8F9FA; margin: 0; padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden;">
            <tr>
                <td style="background-color: #0051BA; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Tennis Buddies Club</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 30px;">
                    <h2 style="color: #0F172A; margin-top: 0;">{title}</h2>
                    <p style="color: #64748B; line-height: 1.6;">{content}</p>
                </td>
            </tr>
            {button_html}
            <tr>
                <td style="padding: 20px; background-color: #F8F9FA; text-align: center; color: #94A3B8; font-size: 12px;">
                    Tennis Buddies Club - Sunday Doubles
                </td>
            </tr>
        </table>
    </body>
    </html>
    '''

# ============ ROUND ROBIN ALGORITHM ============

def generate_round_robin_schedule(players: List[dict], num_courts: int):
    """
    Generate Round Robin tournament schedule.
    Each player plays against every other player once.
    Returns list of matches with court assignments.
    """
    if len(players) < 2:
        return []
    
    matches = []
    player_list = list(players)
    n = len(player_list)
    
    # If odd number of players, add a "bye"
    if n % 2 == 1:
        player_list.append({"id": "bye", "name": "BYE", "user_id": "bye"})
        n += 1
    
    # Generate all matchups using circle method
    match_id = 0
    num_rounds = n - 1
    
    for round_num in range(num_rounds):
        round_matches = []
        for i in range(n // 2):
            p1_idx = i
            p2_idx = n - 1 - i
            
            p1 = player_list[p1_idx]
            p2 = player_list[p2_idx]
            
            # Skip bye matches
            if p1["id"] == "bye" or p2["id"] == "bye":
                continue
            
            round_matches.append({
                "match_id": match_id,
                "round": round_num + 1,
                "player1_id": p1["id"],
                "player2_id": p2["id"],
                "player1_name": p1["name"],
                "player2_name": p2["name"],
                "court": (len(round_matches) % num_courts) + 1
            })
            match_id += 1
        
        matches.extend(round_matches)
        
        # Rotate players (keep first player fixed)
        player_list = [player_list[0]] + [player_list[-1]] + player_list[1:-1]
    
    return matches

def assign_time_slots(matches: List[dict], start_time: str, duration_minutes: int, num_courts: int):
    """Assign time slots to matches based on court availability."""
    start_hour, start_min = map(int, start_time.split(":"))
    start_datetime = datetime.now().replace(hour=start_hour, minute=start_min, second=0, microsecond=0)
    
    # Group matches by rounds (parallel matches on different courts)
    rounds = []
    current_round = []
    courts_used = set()
    
    for match in matches:
        if match["court"] in courts_used or len(current_round) >= num_courts:
            rounds.append(current_round)
            current_round = [match]
            courts_used = {match["court"]}
        else:
            current_round.append(match)
            courts_used.add(match["court"])
    
    if current_round:
        rounds.append(current_round)
    
    # Assign times
    result = []
    for round_idx, round_matches in enumerate(rounds):
        round_time = start_datetime + timedelta(minutes=duration_minutes * round_idx)
        time_str = round_time.strftime("%H:%M")
        for match in round_matches:
            match["time"] = time_str
            result.append(match)
    
    return result

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    count = await db.users.count_documents({})
    role = "admin" if count == 0 else "member"
    
    user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone or "",
        "password": hash_password(user_data.password),
        "role": role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    solo_player = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": user_data.name,
        "wins": 0
    }
    await db.solo_players.insert_one(solo_player)
    
    token = create_token(user_id, role)
    response = JSONResponse(content={"token": token, "user": {"id": user_id, "email": user_data.email, "name": user_data.name, "phone": user_data.phone or "", "role": role}})
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="none", max_age=86400 * 7)
    return response

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        logger.warning(f"Login failed: no user found for {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(credentials.password, user["password"]):
        logger.warning(f"Login failed: wrong password for {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    logger.info(f"Login success: {credentials.email}")
    response = JSONResponse(content={"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}})
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="none", max_age=86400 * 7)
    return response

@api_router.post("/auth/logout")
async def logout():
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="access_token", samesite="none", secure=True)
    return response

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        phone=user.get("phone", ""),
        created_at=user["created_at"]
    )

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate, admin: dict = Depends(get_admin_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Also update solo player name if name changed
    if "name" in update_dict:
        await db.solo_players.update_one({"user_id": user_id}, {"$set": {"name": update_dict["name"]}})
    
    return {"message": "User updated"}

@api_router.get("/users/export")
async def export_users_excel(admin: dict = Depends(get_admin_user)):
    """Export members as Excel file (name, email, phone)"""
    from openpyxl import Workbook
    users = await db.users.find({"role": {"$ne": "admin"}}, {"_id": 0}).to_list(1000)

    wb = Workbook()
    ws = wb.active
    ws.title = "Members"
    ws.append(["Name", "Email", "Phone", "Registered"])
    for col in ['A', 'B', 'C', 'D']:
        ws.column_dimensions[col].width = 25
    for u in users:
        ws.append([
            u.get("name", ""),
            u.get("email", ""),
            u.get("phone", ""),
            u.get("created_at", "")[:10] if u.get("created_at") else ""
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=tennis_buddies_members.xlsx"}
    )

# ============ TEAM ROUTES ============

@api_router.post("/teams", response_model=TeamResponse)
async def create_team(team_data: TeamCreate, user: dict = Depends(get_admin_user)):
    team_id = str(uuid.uuid4())
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

@api_router.put("/teams/{team_id}")
async def update_team(team_id: str, update_data: dict, admin: dict = Depends(get_admin_user)):
    result = await db.teams.update_one({"id": team_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team updated"}

@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, user: dict = Depends(get_admin_user)):
    result = await db.teams.delete_one({"id": team_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted"}

# ============ SOLO LADDER ROUTES ============

@api_router.get("/solo-ladder", response_model=List[SoloPlayerResponse])
async def get_solo_ladder():
    players = await db.solo_players.find({}, {"_id": 0}).sort("wins", -1).to_list(1000)
    return [SoloPlayerResponse(**p) for p in players]

@api_router.put("/solo-ladder/{player_id}")
async def update_solo_player(player_id: str, update_data: SoloPlayerUpdate, admin: dict = Depends(get_admin_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.solo_players.update_one({"id": player_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"message": "Player updated"}

# ============ AVAILABILITY ROUTES ============

@api_router.post("/availability", response_model=AvailabilityResponse)
async def set_availability(avail_data: AvailabilityCreate, user: dict = Depends(get_current_user)):
    # Upsert availability for this user and date
    avail_id = str(uuid.uuid4())
    existing = await db.availability.find_one({"user_id": user["id"], "date": avail_data.date})
    
    if existing:
        await db.availability.update_one(
            {"user_id": user["id"], "date": avail_data.date},
            {"$set": {"available": avail_data.available, "confirmed_at": datetime.now(timezone.utc).isoformat()}}
        )
        avail_id = existing["id"]
    else:
        avail = {
            "id": avail_id,
            "user_id": user["id"],
            "user_name": user["name"],
            "date": avail_data.date,
            "available": avail_data.available,
            "confirmed_at": datetime.now(timezone.utc).isoformat()
        }
        await db.availability.insert_one(avail)
    
    return AvailabilityResponse(
        id=avail_id,
        user_id=user["id"],
        user_name=user["name"],
        date=avail_data.date,
        available=avail_data.available,
        confirmed_at=datetime.now(timezone.utc).isoformat()
    )

@api_router.get("/availability", response_model=List[AvailabilityResponse])
async def get_availability(date: Optional[str] = None):
    query = {}
    if date:
        query["date"] = date
    avails = await db.availability.find(query, {"_id": 0}).to_list(1000)
    return [AvailabilityResponse(**a) for a in avails]

@api_router.get("/availability/upcoming-sundays")
async def get_upcoming_sundays():
    """Get next 4 Sundays for availability selection"""
    today = datetime.now()
    days_until_sunday = (6 - today.weekday()) % 7
    if days_until_sunday == 0:
        days_until_sunday = 7
    
    sundays = []
    for i in range(4):
        sunday = today + timedelta(days=days_until_sunday + (i * 7))
        sundays.append(sunday.strftime("%Y-%m-%d"))
    
    return {"sundays": sundays}

# ============ ROUND ROBIN GENERATION ============

@api_router.post("/schedules/generate-round-robin")
async def generate_round_robin_schedule_endpoint(request: RoundRobinRequest, admin: dict = Depends(get_admin_user)):
    # Get available players for the date
    available = await db.availability.find({"date": request.date, "available": True}, {"_id": 0}).to_list(100)
    
    if len(available) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 available players for round robin")
    
    # Get player details
    player_ids = [a["user_id"] for a in available]
    players = await db.solo_players.find({"user_id": {"$in": player_ids}}, {"_id": 0}).to_list(100)
    
    # Generate Round Robin matches
    matches = generate_round_robin_schedule(players, request.num_courts)
    matches = assign_time_slots(matches, request.start_time, request.match_duration_minutes, request.num_courts)
    
    # Get settings
    settings = await db.settings.find_one({"type": "club"}, {"_id": 0})
    location = settings.get("default_location", "Local Tennis Club") if settings else "Local Tennis Club"
    
    # Create schedule
    schedule_id = str(uuid.uuid4())
    schedule = {
        "id": schedule_id,
        "title": f"Sunday Round Robin - {request.date}",
        "description": f"Round Robin tournament with {len(players)} players on {request.num_courts} courts",
        "match_date": request.date,
        "match_time": request.start_time,
        "location": location,
        "teams": [a["user_name"] for a in available],
        "court_assignments": matches,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.schedules.insert_one(schedule)
    
    # Post to chatroom about the schedule
    chatroom_msg = {
        "id": str(uuid.uuid4()),
        "sender_id": admin["id"],
        "sender_name": admin["name"],
        "sender_role": "admin",
        "content": f"📅 Round Robin schedule for {request.date} is ready! {len(players)} players, {len(matches)} matches across {request.num_courts} courts. Check the Schedule page for details!",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chatroom.insert_one(chatroom_msg)
    
    return {"schedule_id": schedule_id, "matches": matches, "player_count": len(players)}

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
    
    # Notify admin
    admins = await db.users.find({"role": "admin"}, {"_id": 0}).to_list(10)
    for admin in admins:
        await send_email(
            admin["email"],
            "New Match Result Submitted",
            get_email_template(
                "Match Result Pending Approval",
                f"{user['name']} submitted a match result. Please review and approve/reject.",
                "Review Match",
                f"{FRONTEND_URL}/admin"
            )
        )
    
    return MatchResponse(**match)

@api_router.get("/matches", response_model=List[MatchResponse])
async def get_matches(status: Optional[str] = Query(None, alias="status")):
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
    
    await db.matches.update_one({"id": match_id}, {"$set": {"status": "approved"}})
    
    if match["match_type"] == "team":
        winner_points = 25
        loser_points = -15
        if match["score_a"] > match["score_b"]:
            await db.teams.update_one({"id": match["team_a_id"]}, {"$inc": {"wins": 1, "points": winner_points}})
            await db.teams.update_one({"id": match["team_b_id"]}, {"$inc": {"losses": 1, "points": loser_points}})
        else:
            await db.teams.update_one({"id": match["team_b_id"]}, {"$inc": {"wins": 1, "points": winner_points}})
            await db.teams.update_one({"id": match["team_a_id"]}, {"$inc": {"losses": 1, "points": loser_points}})
    else:
        if match["score_a"] > match["score_b"]:
            await db.solo_players.update_one({"id": match["player_a_id"]}, {"$inc": {"wins": 1}})
        else:
            await db.solo_players.update_one({"id": match["player_b_id"]}, {"$inc": {"wins": 1}})
    
    # Notify submitter
    submitter = await db.users.find_one({"id": match["submitted_by"]}, {"_id": 0})
    if submitter:
        await send_email(
            submitter["email"],
            "Match Result Approved",
            get_email_template(
                "Your Match Result was Approved!",
                "Your submitted match result has been approved and the ladder has been updated.",
                "View Ladder",
                f"{FRONTEND_URL}/solo-ladder"
            )
        )
    
    return {"message": "Match approved and ladder updated"}

@api_router.put("/matches/{match_id}/reject")
async def reject_match(match_id: str, user: dict = Depends(get_admin_user)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    await db.matches.update_one({"id": match_id}, {"$set": {"status": "rejected"}})
    
    # Notify submitter
    submitter = await db.users.find_one({"id": match["submitted_by"]}, {"_id": 0})
    if submitter:
        await send_email(
            submitter["email"],
            "Match Result Rejected",
            get_email_template(
                "Match Result Rejected",
                "Your submitted match result was rejected. Please contact the admin if you have questions.",
                "Contact Admin",
                f"{FRONTEND_URL}/messages"
            )
        )
    
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
        "court_assignments": schedule_data.court_assignments,
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
        "content_type": article_data.content_type,
        "video_url": article_data.video_url,
        "image_url": article_data.image_url,
        "file_path": article_data.file_path,
        "file_name": article_data.file_name,
        "file_content_type": article_data.file_content_type,
        "author_id": user["id"],
        "author_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.articles.insert_one(article)
    return ArticleResponse(**article)

@api_router.get("/articles", response_model=List[ArticleResponse])
async def get_articles(category: Optional[str] = None, content_type: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    if content_type:
        query["content_type"] = content_type
    articles = await db.articles.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [ArticleResponse(**a) for a in articles]

@api_router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: str):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleResponse(**article)

@api_router.put("/articles/{article_id}")
async def update_article(article_id: str, update_data: ArticleUpdate, admin: dict = Depends(get_admin_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.articles.update_one({"id": article_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article updated"}

@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str, user: dict = Depends(get_admin_user)):
    result = await db.articles.delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted"}

# ============ PUSH NOTIFICATIONS ============

@api_router.get("/push/vapid-key")
async def get_vapid_key():
    """Return the public VAPID key for push subscription"""
    return {"publicKey": VAPID_PUBLIC_KEY}

@api_router.post("/push/subscribe")
async def push_subscribe(request: Request, user: dict = Depends(get_current_user)):
    """Save a push subscription for the user"""
    body = await request.json()
    subscription = body.get("subscription")
    if not subscription:
        raise HTTPException(status_code=400, detail="Missing subscription")
    await db.push_subscriptions.update_one(
        {"user_id": user["id"]},
        {"$set": {"user_id": user["id"], "user_name": user["name"], "subscription": subscription, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Subscribed to push notifications"}

@api_router.post("/push/unsubscribe")
async def push_unsubscribe(user: dict = Depends(get_current_user)):
    """Remove push subscription for the user"""
    await db.push_subscriptions.delete_many({"user_id": user["id"]})
    return {"message": "Unsubscribed from push notifications"}

@api_router.get("/push/status")
async def push_status(user: dict = Depends(get_current_user)):
    """Check if user has an active push subscription"""
    sub = await db.push_subscriptions.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"subscribed": sub is not None}

async def send_push_notification(user_id: str, title: str, body: str, url: str = "/schedule", urgency: str = "high"):
    """Send a push notification to a specific user"""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured, skipping push notification")
        return
    sub_doc = await db.push_subscriptions.find_one({"user_id": user_id}, {"_id": 0})
    if not sub_doc:
        return
    subscription = sub_doc["subscription"]
    try:
        from pywebpush import webpush
        import json
        payload = json.dumps({"title": title, "body": body, "url": url, "urgency": urgency})
        webpush(
            subscription_info=subscription,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        logger.info(f"Push sent to {sub_doc.get('user_name', user_id)} (urgency={urgency})")
    except Exception as e:
        logger.error(f"Push notification failed for {user_id}: {e}")
        if "410" in str(e) or "404" in str(e):
            await db.push_subscriptions.delete_one({"user_id": user_id})

async def send_push_to_roster(player_ids: list, title: str, body: str, url: str = "/schedule", urgency: str = "normal", exclude_ids: list = None):
    """Send push notification to all opted-in players in a roster"""
    exclude = set(exclude_ids or [])
    for pid in player_ids:
        if pid in exclude or pid.startswith("ext-"):
            continue
        asyncio.create_task(send_push_notification(pid, title, body, url, urgency))

# ============ FILE UPLOAD & SERVE ============

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "ppt", "pptx", "txt", "png", "jpg", "jpeg", "gif", "webp"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_admin_user)):
    """Upload a file to object storage"""
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type .{ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    try:
        result = put_object(path, data, file.content_type or "application/octet-stream")
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")

    return {
        "path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data))
    }

@api_router.get("/files/{path:path}")
async def serve_file(path: str, request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Serve a file from object storage - requires login"""
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Login required to download files")
    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Login required to download files")
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=content_type)
    except Exception as e:
        logger.error(f"File serve failed: {e}")
        raise HTTPException(status_code=404, detail="File not found")

# ============ MESSAGES (Player to Admin) ============

@api_router.post("/messages", response_model=MessageResponse)
async def send_message(msg_data: MessageCreate, user: dict = Depends(get_current_user)):
    msg_id = str(uuid.uuid4())
    
    # If no recipient specified, send to first admin
    recipient_id = msg_data.recipient_id
    if not recipient_id:
        admin = await db.users.find_one({"role": "admin"}, {"_id": 0})
        recipient_id = admin["id"] if admin else None
    
    message = {
        "id": msg_id,
        "sender_id": user["id"],
        "sender_name": user["name"],
        "recipient_id": recipient_id,
        "content": msg_data.content,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(message)
    
    # Notify recipient
    if recipient_id:
        recipient = await db.users.find_one({"id": recipient_id}, {"_id": 0})
        if recipient:
            await send_email(
                recipient["email"],
                f"New Message from {user['name']}",
                get_email_template(
                    "You have a new message",
                    f"{user['name']} sent you a message: \"{msg_data.content[:100]}...\"",
                    "View Messages",
                    f"{FRONTEND_URL}/messages"
                )
            )
    
    return MessageResponse(**message)

@api_router.get("/messages", response_model=List[MessageResponse])
async def get_messages(user: dict = Depends(get_current_user)):
    # Get messages where user is sender or recipient
    messages = await db.messages.find(
        {"$or": [{"sender_id": user["id"]}, {"recipient_id": user["id"]}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [MessageResponse(**m) for m in messages]

@api_router.put("/messages/{msg_id}/read")
async def mark_message_read(msg_id: str, user: dict = Depends(get_current_user)):
    await db.messages.update_one({"id": msg_id, "recipient_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "Message marked as read"}

@api_router.get("/messages/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    count = await db.messages.count_documents({"recipient_id": user["id"], "read": False})
    return {"count": count}

# ============ CHATROOM (Group Chat) ============

@api_router.post("/chatroom", response_model=ChatroomMessageResponse)
async def send_chatroom_message(msg_data: ChatroomMessageCreate, user: dict = Depends(get_current_user)):
    msg_id = str(uuid.uuid4())
    message = {
        "id": msg_id,
        "sender_id": user["id"],
        "sender_name": user["name"],
        "sender_role": user["role"],
        "content": msg_data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chatroom.insert_one(message)
    return ChatroomMessageResponse(**message)

@api_router.get("/chatroom", response_model=List[ChatroomMessageResponse])
async def get_chatroom_messages(limit: int = 100, user: dict = Depends(get_current_user)):
    messages = await db.chatroom.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return [ChatroomMessageResponse(**m) for m in reversed(messages)]

@api_router.delete("/chatroom/{msg_id}")
async def delete_chatroom_message(msg_id: str, admin: dict = Depends(get_admin_user)):
    """Admin deletes a single chatroom message"""
    result = await db.chatroom.delete_one({"id": msg_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Chat message deleted"}

# ============ MATCH HISTORY & PLAYER STATS ============

@api_router.get("/match-history")
async def get_match_history(player_id: Optional[str] = None):
    """Get all approved matches, optionally filtered by player"""
    query = {"status": "approved"}
    
    if player_id:
        query["$or"] = [
            {"player_a_id": player_id},
            {"player_b_id": player_id}
        ]
    
    matches = await db.matches.find(query, {"_id": 0}).sort("match_date", -1).to_list(500)
    return matches

@api_router.get("/player-stats/{player_id}", response_model=PlayerStatsResponse)
async def get_player_stats(player_id: str):
    """Get detailed stats for a specific player"""
    player = await db.solo_players.find_one({"id": player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get all matches for this player
    matches = await db.matches.find({
        "status": "approved",
        "match_type": "solo",
        "$or": [{"player_a_id": player_id}, {"player_b_id": player_id}]
    }, {"_id": 0}).sort("match_date", -1).to_list(500)
    
    total_matches = len(matches)
    wins = 0
    recent_form = []
    
    for match in matches:
        is_player_a = match["player_a_id"] == player_id
        player_score = match["score_a"] if is_player_a else match["score_b"]
        opponent_score = match["score_b"] if is_player_a else match["score_a"]
        
        if player_score > opponent_score:
            wins += 1
            if len(recent_form) < 5:
                recent_form.append("W")
        else:
            if len(recent_form) < 5:
                recent_form.append("L")
    
    win_rate = (wins / total_matches * 100) if total_matches > 0 else 0
    
    return PlayerStatsResponse(
        player_id=player_id,
        player_name=player["name"],
        total_matches=total_matches,
        wins=wins,
        win_rate=round(win_rate, 1),
        recent_form=recent_form
    )

@api_router.get("/player-stats")
async def get_all_player_stats():
    """Get stats for all players"""
    players = await db.solo_players.find({}, {"_id": 0}).to_list(100)
    stats = []
    
    for player in players:
        matches = await db.matches.find({
            "status": "approved",
            "match_type": "solo",
            "$or": [{"player_a_id": player["id"]}, {"player_b_id": player["id"]}]
        }, {"_id": 0}).to_list(500)
        
        total_matches = len(matches)
        wins = 0
        recent_form = []
        
        for match in matches:
            is_player_a = match["player_a_id"] == player["id"]
            player_score = match["score_a"] if is_player_a else match["score_b"]
            opponent_score = match["score_b"] if is_player_a else match["score_a"]
            
            if player_score > opponent_score:
                wins += 1
                if len(recent_form) < 5:
                    recent_form.append("W")
            else:
                if len(recent_form) < 5:
                    recent_form.append("L")
        
        win_rate = (wins / total_matches * 100) if total_matches > 0 else 0
        
        stats.append({
            "player_id": player["id"],
            "player_name": player["name"],
            "total_matches": total_matches,
            "wins": wins,
            "win_rate": round(win_rate, 1),
            "recent_form": recent_form
        })
    
    # Sort by wins descending
    stats.sort(key=lambda x: x["wins"], reverse=True)
    return stats

# ============ HEAD-TO-HEAD RECORDS ============

@api_router.get("/head-to-head/{player_a_id}/{player_b_id}")
async def get_head_to_head(player_a_id: str, player_b_id: str):
    """Get head-to-head record between two players"""
    player_a = await db.solo_players.find_one({"id": player_a_id}, {"_id": 0})
    player_b = await db.solo_players.find_one({"id": player_b_id}, {"_id": 0})
    if not player_a or not player_b:
        raise HTTPException(status_code=404, detail="Player not found")

    matches = await db.matches.find({
        "status": "approved",
        "match_type": "solo",
        "$or": [
            {"player_a_id": player_a_id, "player_b_id": player_b_id},
            {"player_a_id": player_b_id, "player_b_id": player_a_id},
        ]
    }, {"_id": 0}).sort("match_date", -1).to_list(500)

    a_wins = 0
    b_wins = 0
    match_list = []
    for m in matches:
        a_is_player_a = m["player_a_id"] == player_a_id
        a_score = m["score_a"] if a_is_player_a else m["score_b"]
        b_score = m["score_b"] if a_is_player_a else m["score_a"]
        a_won = a_score > b_score
        if a_won:
            a_wins += 1
        else:
            b_wins += 1
        match_list.append({
            "date": m["match_date"],
            "a_score": a_score,
            "b_score": b_score,
            "winner": player_a["name"] if a_won else player_b["name"],
        })

    return {
        "player_a": {"id": player_a_id, "name": player_a["name"]},
        "player_b": {"id": player_b_id, "name": player_b["name"]},
        "total_matches": len(matches),
        "a_wins": a_wins,
        "b_wins": b_wins,
        "matches": match_list,
    }

@api_router.get("/head-to-head-matrix")
async def get_head_to_head_matrix():
    """Get full head-to-head matrix for all players"""
    players = await db.solo_players.find({}, {"_id": 0}).sort("wins", -1).to_list(100)
    all_matches = await db.matches.find(
        {"status": "approved", "match_type": "solo"}, {"_id": 0}
    ).to_list(5000)

    # Build a wins lookup: (winner_id, loser_id) -> count
    wins_map = {}
    for m in all_matches:
        a_won = m["score_a"] > m["score_b"]
        winner = m["player_a_id"] if a_won else m["player_b_id"]
        loser = m["player_b_id"] if a_won else m["player_a_id"]
        key = (winner, loser)
        wins_map[key] = wins_map.get(key, 0) + 1

    player_list = [{"id": p["id"], "name": p["name"]} for p in players]
    matrix = {}
    for p in player_list:
        row = {}
        for opp in player_list:
            if p["id"] == opp["id"]:
                row[opp["id"]] = None
            else:
                w = wins_map.get((p["id"], opp["id"]), 0)
                losses = wins_map.get((opp["id"], p["id"]), 0)
                row[opp["id"]] = {"wins": w, "losses": losses, "total": w + losses}
        matrix[p["id"]] = row

    return {"players": player_list, "matrix": matrix}

# ============ BEST PARTNERSHIPS ============

@api_router.get("/partnerships")
async def get_best_partnerships():
    """Analyze all generated doubles schedules to find best player pairings"""
    # Get all events with generated schedules
    events = await db.weekly_events.find(
        {"generated_schedule": {"$ne": None}}, {"_id": 0}
    ).to_list(500)

    # Track partnership stats: (sorted pair) -> {matches_together, wins, losses}
    pair_stats = {}
    # Build a player name lookup
    all_players = await db.solo_players.find({}, {"_id": 0}).to_list(200)
    name_map = {p["id"]: p["name"] for p in all_players}

    for event in events:
        schedule = event.get("generated_schedule", [])
        for rnd in schedule:
            for match in rnd.get("matches", []):
                team_a_ids = [p["id"] for p in match.get("team_a", [])]
                team_b_ids = [p["id"] for p in match.get("team_b", [])]

                # Register partnerships
                if len(team_a_ids) == 2:
                    pair_key_a = tuple(sorted(team_a_ids))
                    if pair_key_a not in pair_stats:
                        pair_stats[pair_key_a] = {"together": 0, "wins": 0, "losses": 0}
                    pair_stats[pair_key_a]["together"] += 1

                if len(team_b_ids) == 2:
                    pair_key_b = tuple(sorted(team_b_ids))
                    if pair_key_b not in pair_stats:
                        pair_stats[pair_key_b] = {"together": 0, "wins": 0, "losses": 0}
                    pair_stats[pair_key_b]["together"] += 1

    # Also mine approved solo matches for doubles context
    # Check match results stored with team references
    team_matches = await db.matches.find(
        {"status": "approved", "match_type": "team"}, {"_id": 0}
    ).to_list(1000)

    for m in team_matches:
        if m.get("team_a_id") and m.get("team_b_id"):
            team_a = await db.teams.find_one({"id": m["team_a_id"]}, {"_id": 0})
            team_b = await db.teams.find_one({"id": m["team_b_id"]}, {"_id": 0})
            if team_a and team_b:
                a_members = team_a.get("member_ids", [])
                b_members = team_b.get("member_ids", [])
                a_won = m.get("score_a", 0) > m.get("score_b", 0)

                if len(a_members) == 2:
                    pk = tuple(sorted(a_members))
                    if pk not in pair_stats:
                        pair_stats[pk] = {"together": 0, "wins": 0, "losses": 0}
                    pair_stats[pk]["together"] += 1
                    if a_won:
                        pair_stats[pk]["wins"] += 1
                    else:
                        pair_stats[pk]["losses"] += 1

                if len(b_members) == 2:
                    pk = tuple(sorted(b_members))
                    if pk not in pair_stats:
                        pair_stats[pk] = {"together": 0, "wins": 0, "losses": 0}
                    pair_stats[pk]["together"] += 1
                    if not a_won:
                        pair_stats[pk]["wins"] += 1
                    else:
                        pair_stats[pk]["losses"] += 1

    # Build response
    partnerships = []
    for (p1, p2), stats in pair_stats.items():
        total = stats["wins"] + stats["losses"]
        win_rate = round((stats["wins"] / total * 100), 1) if total > 0 else 0
        partnerships.append({
            "player_a": {"id": p1, "name": name_map.get(p1, "Unknown")},
            "player_b": {"id": p2, "name": name_map.get(p2, "Unknown")},
            "matches_together": stats["together"],
            "wins": stats["wins"],
            "losses": stats["losses"],
            "win_rate": win_rate,
        })

    # Sort by matches together desc, then win_rate desc
    partnerships.sort(key=lambda x: (x["matches_together"], x["win_rate"]), reverse=True)
    return partnerships

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

# ============ CLUB SETTINGS ============

@api_router.get("/settings")
async def get_settings(user: dict = Depends(get_admin_user)):
    settings = await db.settings.find_one({"type": "club"}, {"_id": 0})
    if not settings:
        settings = {
            "type": "club",
            "num_courts": 2,
            "default_location": "Local Tennis Club",
            "match_duration_minutes": 30,
            "default_start_time": "09:00",
            "rsvp_open_day": 2,
            "rsvp_open_hour": 7
        }
    else:
        if "rsvp_open_day" not in settings:
            settings["rsvp_open_day"] = 2
        if "rsvp_open_hour" not in settings:
            settings["rsvp_open_hour"] = 7
    return settings

@api_router.put("/settings")
async def update_settings(settings: ClubSettings, user: dict = Depends(get_admin_user)):
    settings_dict = settings.model_dump()
    settings_dict["type"] = "club"
    await db.settings.update_one({"type": "club"}, {"$set": settings_dict}, upsert=True)
    return {"message": "Settings updated"}

# ============ SEND AVAILABILITY REMINDER ============

@api_router.post("/admin/send-availability-reminder")
async def send_availability_reminder(date: str, admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    sent_count = 0
    
    for user in users:
        if user.get("email"):
            await send_email(
                user["email"],
                f"Confirm Your Availability for {date}",
                get_email_template(
                    "Sunday Tennis - Are You In?",
                    f"Please confirm your availability for the Sunday doubles session on {date}. We need to know who's playing to set up the round robin matches.",
                    "Confirm Availability",
                    f"{FRONTEND_URL}/availability"
                )
            )
            sent_count += 1
    
    return {"message": f"Reminder sent to {sent_count} members"}

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
    unread_messages = await db.messages.count_documents({"read": False})
    
    return {
        "total_members": total_members,
        "total_teams": total_teams,
        "total_matches": total_matches,
        "pending_matches": pending_matches,
        "unread_messages": unread_messages
    }

# ============ SEED SAMPLE CONTENT ============

@api_router.post("/admin/seed-content")
async def seed_sample_content(admin: dict = Depends(get_admin_user)):
    # Check if content already exists
    existing = await db.articles.count_documents({})
    if existing > 0:
        return {"message": "Content already exists"}
    
    sample_articles = [
        {
            "id": str(uuid.uuid4()),
            "title": "Master Your Serve: The Key to Winning",
            "content": """The serve is the most important shot in tennis - it's the only shot you have complete control over.

**The Trophy Position**
Start with your feet shoulder-width apart. As you toss the ball, raise your racket behind you into the 'trophy position' - like you're about to throw a ball.

**The Toss**
A consistent toss is crucial. Practice tossing the ball to the same spot every time - slightly in front and to the right (for right-handers).

**The Swing**
Accelerate through the ball, snapping your wrist at contact. Follow through across your body.

**Practice Drill**
Try the 'bucket drill' - place a bucket in the service box and try to hit it 10 times in a row. This builds accuracy and consistency.""",
            "category": "technique",
            "content_type": "article",
            "video_url": "https://www.youtube.com/watch?v=9KAjDBlBAnI",
            "image_url": "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800",
            "author_id": admin["id"],
            "author_name": admin["name"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Doubles Strategy: Communication is Key",
            "content": """In doubles, your partnership matters as much as your individual skills.

**Call Every Ball**
Always communicate with your partner. Call 'mine', 'yours', or 'out' on every ball. It prevents collisions and confusion.

**The I-Formation**
Try the I-formation to confuse opponents. Server stands wide, partner crouches at the center line, then moves left or right after the serve.

**Poaching**
The net player should look for opportunities to 'poach' - crossing to intercept a return. Signal to your partner beforehand.

**Cover the Middle**
The middle of the court is the danger zone. Both players should be ready to cover balls hit between them.

**Stay Positive**
Encourage your partner, even after errors. A confident team plays better tennis.""",
            "category": "strategy",
            "content_type": "article",
            "video_url": "https://www.youtube.com/watch?v=5GkGBYVZbEI",
            "image_url": "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800",
            "author_id": admin["id"],
            "author_name": admin["name"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Tennis Fitness: Warm-Up Routine",
            "content": """A proper warm-up prevents injuries and improves performance. Here's a 10-minute routine:

**Dynamic Stretching (3 min)**
- Arm circles (30 sec each direction)
- Leg swings (10 each leg)
- Torso twists (20 reps)

**Light Cardio (3 min)**
- Jogging in place
- High knees
- Butt kicks

**Tennis-Specific (4 min)**
- Shadow swings (forehand, backhand)
- Mini-tennis at the service line
- Volleys with partner

**Cool Down After Play**
Don't forget to stretch after playing! Focus on shoulders, back, and legs.""",
            "category": "fitness",
            "content_type": "article",
            "video_url": "https://www.youtube.com/watch?v=Bp_SWE_vEwM",
            "image_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
            "author_id": admin["id"],
            "author_name": admin["name"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Choosing the Right Tennis Racket",
            "content": """Your racket is your most important piece of equipment. Here's how to choose:

**Head Size**
- Oversize (105+ sq in): More power, larger sweet spot. Good for beginners.
- Midplus (98-104 sq in): Balance of power and control.
- Midsize (85-97 sq in): Maximum control for advanced players.

**Weight**
- Light (9-9.4 oz): Easier to swing, less power.
- Medium (9.5-10.5 oz): Good balance.
- Heavy (10.6+ oz): More power and stability.

**String Pattern**
- Open (16x19): More spin potential.
- Dense (18x20): More control, durability.

**Grip Size**
Measure from your palm crease to ring finger tip. Common sizes: 4 1/4, 4 3/8, 4 1/2.

**Our Recommendation**
For club doubles players, a midplus head with medium weight offers the best versatility.""",
            "category": "equipment",
            "content_type": "article",
            "image_url": "https://images.unsplash.com/photo-1617083934555-ac7c4c1d8b91?w=800",
            "author_id": admin["id"],
            "author_name": admin["name"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "The Perfect Volley Technique",
            "content": """Master the volley to dominate at the net in doubles.

**Ready Position**
Stand with knees bent, racket up at chest height, and weight on your toes.

**The Punch**
A volley is a punch, not a swing. Step forward into the ball and block it with a firm wrist.

**Continental Grip**
Use the continental grip (like holding a hammer) for both forehand and backhand volleys.

**Watch the Ball**
Keep your eye on the ball all the way to your strings. Many volleys are missed due to looking up too early.

**Angle Your Volleys**
Aim for angles to put the ball away. A cross-court volley is often more effective than hitting down the line.""",
            "category": "technique",
            "content_type": "video",
            "video_url": "https://www.youtube.com/watch?v=yMFqMmHY5VE",
            "image_url": "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800",
            "author_id": admin["id"],
            "author_name": admin["name"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.articles.insert_many(sample_articles)
    return {"message": f"Added {len(sample_articles)} sample articles"}

# ============ SEASON STANDINGS ============

def calculate_player_season_stats(player: dict, matches: list) -> dict:
    """Calculate cumulative season stats for a single player."""
    total_matches = len(matches)
    wins = 0
    losses = 0
    current_streak = 0
    best_streak = 0
    temp_streak = 0
    last_result = None

    for match in matches:
        is_player_a = match["player_a_id"] == player["id"]
        player_score = match["score_a"] if is_player_a else match["score_b"]
        opponent_score = match["score_b"] if is_player_a else match["score_a"]
        won = player_score > opponent_score

        if won:
            wins += 1
            temp_streak = temp_streak + 1 if last_result == "W" else 1
            last_result = "W"
            current_streak = temp_streak
        else:
            losses += 1
            temp_streak = temp_streak - 1 if last_result == "L" else -1
            last_result = "L"
            current_streak = temp_streak

        if temp_streak > best_streak:
            best_streak = temp_streak

    win_rate = (wins / total_matches * 100) if total_matches > 0 else 0

    return {
        "player_id": player["id"],
        "player_name": player["name"],
        "matches_played": total_matches,
        "wins": wins,
        "losses": losses,
        "win_rate": round(win_rate, 1),
        "current_streak": current_streak,
        "best_streak": best_streak,
        "points": wins
    }

@api_router.get("/season-standings")
async def get_season_standings():
    """Get season standings with cumulative stats for all players"""
    players = await db.solo_players.find({}, {"_id": 0}).to_list(100)
    standings = []
    
    for player in players:
        matches = await db.matches.find({
            "status": "approved",
            "match_type": "solo",
            "$or": [{"player_a_id": player["id"]}, {"player_b_id": player["id"]}]
        }, {"_id": 0}).sort("match_date", 1).to_list(500)
        
        standings.append(calculate_player_season_stats(player, matches))
    
    standings.sort(key=lambda x: (x["points"], x["win_rate"]), reverse=True)
    return standings

# ============ MATCH REMINDERS ============

@api_router.post("/match-reminders")
async def create_match_reminder(reminder: MatchReminderCreate, admin: dict = Depends(get_admin_user)):
    """Admin posts a match reminder to the chatroom"""
    msg_id = str(uuid.uuid4())
    
    chatroom_msg = {
        "id": msg_id,
        "sender_id": admin["id"],
        "sender_name": admin["name"],
        "sender_role": "admin",
        "content": f"🎾 MATCH REMINDER - {reminder.match_date}\n\n{reminder.message}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_reminder": True
    }
    await db.chatroom.insert_one(chatroom_msg)
    
    return {"message": "Reminder posted to chatroom", "id": msg_id}

@api_router.get("/match-reminders")
async def get_match_reminders():
    """Get all match reminders from chatroom"""
    reminders = await db.chatroom.find({"is_reminder": True}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return reminders

# ============ OPPONENT SCOUT (Gemini 3 Pro) ============

def parse_scout_response(response_text: str) -> dict:
    """Parse LLM response into structured strategy/tactics/warnings."""
    import re
    strategy = ""
    tactics = []
    warnings = []
    current_section = None

    for line in response_text.split('\n'):
        line = line.strip()
        # Match section headers with optional markdown bold: STRATEGY:, **STRATEGY:**, etc.
        clean = re.sub(r'\*+', '', line).strip()
        if clean.upper().startswith('STRATEGY:'):
            current_section = 'strategy'
            strategy = clean.split(':', 1)[1].strip()
        elif clean.upper().startswith('TACTICS:') or clean.upper().startswith('KEY TACTICS:'):
            current_section = 'tactics'
        elif clean.upper().startswith('WARNINGS:') or clean.upper().startswith('WATCH OUT') or clean.upper().startswith('CAUTION'):
            current_section = 'warnings'
        elif line.startswith(('\u2022', '-', '*')) and current_section:
            item = re.sub(r'^[\u2022\-\*\d.]+\s*', '', line).strip()
            if current_section == 'tactics' and item:
                tactics.append(item)
            elif current_section == 'warnings' and item:
                warnings.append(item)
        elif re.match(r'^\d+\.', line) and current_section:
            item = re.sub(r'^\d+\.\s*', '', line).strip()
            if current_section == 'tactics' and item:
                tactics.append(item)
            elif current_section == 'warnings' and item:
                warnings.append(item)
        elif current_section == 'strategy' and line and not line.startswith('#'):
            strategy += ' ' + line

    return {"strategy": strategy.strip(), "tactics": tactics, "warnings": warnings}

DOUBLES_STRATEGY_SYSTEM_PROMPT = """You are an elite doubles tennis tactical coach for the Tennis Buddies Club. Your analysis is rooted in "The Master Guide for Elite Doubles Tennis Strategy and Analytics" — a research-backed framework your head coach uses. Always ground your advice in these specific principles:

=== FUNDAMENTAL POSITIONING ===
- SERVER: Position slightly wider of center mark. Post-serve, place yourself between the possible shots that could land on your half.
- RETURNER: Shift position relative to service angles. If the server slides wider toward the alley, shift toward the singles sideline to bisect the widened angle.
- SERVER'S PARTNER: Center of the service box, one step inside the service line. On service contact, execute a forward step + wide split step for "active feet" pressure.
- RETURNER'S PARTNER: On or near the service line, pinched toward center mark. Critical for calling "out" serves.
- RETURN MECHANICS: Drop Step (one deliberate step forward as server begins motion) → Split Step (wide balanced stance at service contact, converting momentum into lateral agility).

=== FORMATION FRAMEWORKS ===
1. ONE UP-ONE BACK (Passive/Defensive): Covers lobs but creates a "four-story gap" — 40 feet of diagonal space. Three deficiencies: allows tactical escapes, creates massive gap for angles/drops, promotes stagnant "windshield wiper" play.
2. DOUBLE UP (Aggressive/Offensive): Minimizes opponent reaction time. The preferred attacking formation. Risk: precision lobs.
3. I-FORMATION (Modern Elite Standard): Used in 46% of first serve points and 41% of second serve points at pro level. Net player squats over center service line, server near center mark. Serve primarily down the T. Creates total deception — "tactical illegibility" — until after the return is initiated.
4. AUSTRALIAN FORMATION: Largely superseded by I-Formation because it indicates in advance which player covers which half (readable).
5. BOTH AT BASELINE (Defensive Reset): Used 53% of the time when returning first serves at elite level (18% on second serves). Prevents easy volley winners, allows aggressive returns without endangering partner.
6. DOUBLE BACK: Transition to baseline when: (a) opponents dominate the net, (b) overhead response is compromised, (c) returner's partner is targeted by high-velocity serves.

=== SHADING MECHANICS ===
- HORIZONTAL SHADING: Net player follows the ball. Ball hit wide → shift toward alley. Intercept the high-probability straight return, force low-percentage sharp angles.
- VERTICAL SHADING: Teammate hits offensive shot → net player closes forward ("closing for the kill"). Teammate hits weak shot → net player scoots back toward service line.
- LOB DEFENSE: Against "sucker lobs," shift base positioning 3 feet farther back from net. This buffer allows comfortable overheads while maintaining volley range.

=== SHOT SELECTION — HEIGHT-DISTANCE RATIO ===
- OFFENSIVE GREEN LIGHT: Ball struck 4ft high from 10ft away = attacking opportunity.
- DEFENSIVE RED LIGHT: Ball struck 4ft high from 40ft away = defensive shot.
- PRIMARY RULE: Contact below the net cord = defensive by definition.
- HIGH-% ATTACKING TARGETS (in order): (1) Feet of closest opponent — minimizes reaction time, forces upward reply. (2) Center Window — avoids opening angles, creates communication friction. (3) Sharp angles — only when opponent is pulled out of position.
- DEFENSIVE TARGETS: (1) Deep toward furthest opponent. (2) Low across center of net (lowest point). (3) Cross-court lob to break rhythm.

=== POACHING & DISRUPTION ===
- TIMING: Move after opponent commits to target (forward swing started) but before contact.
- DIRECTION: Never parallel to net. Explosive 45-degree angle TOWARD net — intercept at highest point for downward strike.
- FAKE POACH: Hard step toward center service line → immediately recover to alley position. Forces returner into low-percentage down-the-line errors by manipulating visual perception.

=== PARTNERSHIP & COMMUNICATION ===
- RIDDLE OF THE MIDDLE: Player farther back has the "front row seat" — superior vantage point. They call "Me" or "Yours" instantly.
- IN-MATCH: Constant feedback between every point and every changeover. Adjust formations, identify target weaknesses.
- TIE-BREAK STRATEGY: (1) Use I-Formation for tactical illegibility, (2) Aggressive net activity forces higher forced error rates, (3) Target feet of closest opponent.

=== ANALYTICS ===
- FORCED ERRORS are the most critical statistic — errors from "legitimate swings" caused by opponent's placement, pace, or pressure.
- Formation efficiency (Kocib et al., n=1067): Classical 80.3% 1st serve won / 57.2% 2nd serve; I-Formation 81.5% / 56.4%. Near-equal efficiency underscores the need for tactical variability.

When analyzing opponents, provide specific, actionable tactics grounded in these principles. Reference formations, shading, targeting priorities, and positioning adjustments by name."""

@api_router.post("/opponent-scout", response_model=OpponentScoutResponse)
async def scout_opponent(request: OpponentScoutRequest, user: dict = Depends(get_current_user)):
    """Get tactical advice for playing against a specific opponent"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"scout-{user['id']}-{uuid.uuid4()}",
            system_message=DOUBLES_STRATEGY_SYSTEM_PROMPT
        ).with_model("gemini", "gemini-3.1-pro-preview")
        
        prompt = f"""OPPONENT ANALYSIS REQUEST

**Opponent:** {request.opponent_name}
**Playstyle:** {request.playstyle}
**Strengths:** {request.strengths}
**Weaknesses:** {request.weaknesses}
{f"**Additional Notes:** {request.additional_notes}" if request.additional_notes else ""}

Based on this opponent profile, provide:
1. A MATCH STRATEGY paragraph (2-3 sentences on overall approach)
2. KEY TACTICS (5-7 specific, actionable bullet points)
3. WARNINGS (2-3 things to avoid or watch out for)

Format your response as:
STRATEGY: [paragraph]
TACTICS:
• [tactic 1]
• [tactic 2]
...
WARNINGS:
• [warning 1]
• [warning 2]
..."""

        user_msg = UserMessage(text=prompt)
        response = await chat.send_message(user_msg)
        
        parsed = parse_scout_response(response)
        strategy = parsed["strategy"]
        tactics = parsed["tactics"]
        warnings = parsed["warnings"]
        
        # Store scout report
        await db.scout_reports.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "opponent_name": request.opponent_name,
            "request": request.model_dump(),
            "response": {"strategy": strategy, "tactics": tactics, "warnings": warnings},
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return OpponentScoutResponse(
            strategy=strategy or response,
            key_tactics=tactics or ["See full strategy above"],
            warnings=warnings or ["Stay focused and communicate with your partner"]
        )
        
    except Exception as e:
        logger.error(f"Opponent scout error: {e}")
        raise HTTPException(status_code=500, detail="Strategy analysis unavailable")

@api_router.get("/scout-reports")
async def get_scout_reports(user: dict = Depends(get_current_user)):
    """Get user's previous scout reports"""
    reports = await db.scout_reports.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return reports

# ============ LIVE STRATEGY BOT (Gemini 3 Pro with History) ============

STRATEGY_BOT_SYSTEM_PROMPT = """You are the Tennis Buddies Club's Live Strategy Coach. You draw from "The Master Guide for Elite Doubles Tennis Strategy and Analytics" — the same playbook your club's head coach teaches from. You maintain conversation context and provide personalized tactical advice rooted in these proven principles.

YOUR KNOWLEDGE BASE:

1. **Fundamental Positioning Theory**
   - Server positions wider of center; post-serve covers their half between possible shots
   - Returner shifts relative to service angles (server slides wide → returner shifts to bisect)
   - Server's partner: center of service box, one step inside service line, "active feet" via forward step + split step on contact
   - Returner's partner: on/near service line, pinched toward center, calling out serves
   - Return mechanics: Drop Step (forward as server starts motion) → Split Step (wide balanced stance at contact) for explosive lateral agility

2. **Formation Frameworks**
   - One Up-One Back: Passive. Creates a "four-story gap" (40ft diagonal). Three deficiencies: allows escapes, massive gap for angles/drops, stagnant play
   - Double Up: Aggressive. Minimizes reaction time. The preferred attacking formation (risk: precision lobs)
   - I-Formation (Modern Elite Standard): 46% of 1st serve points, 41% of 2nd serve. Net player over center line, serve down the T. Total "tactical illegibility"
   - Australian: Superseded by I-Formation (too readable — telegraphs coverage)
   - Both at Baseline: 53% on 1st serve returns at elite level. Defensive reset preventing easy volley winners
   - Double Back: When opponents dominate net, overheads are compromised, or partner is being targeted

3. **Shading Mechanics (Dynamic Court Coverage)**
   - Horizontal: Net player follows the ball — shift toward where it goes, intercept straight returns
   - Vertical: Teammate offensive shot → close forward. Teammate weak shot → scoot back to service line
   - Lob Defense: Base position 3 feet farther back against lobbers — covers overheads while maintaining volley range

4. **Shot Selection — The Height-Distance Ratio**
   - Offensive: 4ft high from 10ft = attack. Defensive: 4ft high from 40ft = reset
   - Below net cord = defensive by definition
   - Attacking targets (priority): (1) Feet of closest opponent, (2) Center Window (causes confusion), (3) Sharp angles (only when opponent displaced)
   - Defensive targets: (1) Deep to furthest opponent, (2) Low across center net, (3) Cross-court lob to reset

5. **Poaching & Disruption**
   - Timing: After opponent commits (forward swing) but before contact
   - Direction: 45-degree angle TOWARD net (never parallel) — intercept at highest point for downward strike
   - Fake poach: Hard step toward center → recover to alley. Manipulates returner's visual perception

6. **Partnership & Communication**
   - "Riddle of the Middle": Farther-back player has the "front row seat" — calls it instantly
   - Constant feedback between every point and changeover
   - Tie-breaks: I-Formation for illegibility, aggressive net activity, target feet

7. **Analytics**
   - Forced errors are the most critical stat (errors from legitimate swings under pressure)
   - Formation efficiency is nearly equal between Classical and I-Formation — tactical variability is key
   - Both-at-Baseline receiving drops to 18% on second serves (more aggressive return stance)

COMMUNICATION STYLE:
- Be concise and actionable
- Use proper tennis terminology (deuce side, ad side, T, alley, service line, no-man's land)
- Reference specific principles from the playbook by name (e.g., "the four-story gap," "height-distance ratio," "tactical illegibility")
- Give numbered tactical steps when appropriate
- Encourage the player while being direct about areas to improve

Remember previous messages in our conversation to provide contextual, progressive advice."""

# Store strategy bot sessions in memory (for simplicity)
strategy_sessions = {}

@api_router.post("/strategy-bot", response_model=StrategyBotResponse)
async def strategy_bot_chat(request: StrategyBotRequest, user: dict = Depends(get_current_user)):
    """Live strategy bot with conversation history"""
    try:
        session_id = request.session_id or f"strategy-{user['id']}-{uuid.uuid4()}"
        
        # Get or create chat session
        if session_id not in strategy_sessions:
            strategy_sessions[session_id] = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=STRATEGY_BOT_SYSTEM_PROMPT
            ).with_model("gemini", "gemini-3.1-pro-preview")
        
        chat = strategy_sessions[session_id]
        
        user_msg = UserMessage(text=request.message)
        response = await chat.send_message(user_msg)
        
        # Store in database for persistence
        await db.strategy_chats.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "user_id": user["id"],
            "user_message": request.message,
            "bot_response": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return StrategyBotResponse(response=response, session_id=session_id)
        
    except Exception as e:
        logger.error(f"Strategy bot error: {e}")
        raise HTTPException(status_code=500, detail="Strategy bot unavailable")

@api_router.get("/strategy-bot/history/{session_id}")
async def get_strategy_history(session_id: str, user: dict = Depends(get_current_user)):
    """Get conversation history for a strategy session"""
    history = await db.strategy_chats.find(
        {"session_id": session_id, "user_id": user["id"]},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    return history

@api_router.post("/strategy-bot/new-session")
async def new_strategy_session(user: dict = Depends(get_current_user)):
    """Start a new strategy bot session"""
    session_id = f"strategy-{user['id']}-{uuid.uuid4()}"
    return {"session_id": session_id}

# ============ DOUBLES ROUND ROBIN ALGORITHM ============

def generate_doubles_round_robin(players: List[dict], num_courts: int) -> List[dict]:
    """
    Generate a doubles round robin schedule.
    - Format: 2v2
    - Rotate partners every round (no same partner consecutively)
    - Minimize repeat opponents
    - Fair bye distribution if not divisible by 4
    """
    import random
    n = len(players)
    if n < 4:
        return []

    player_ids = [p["id"] for p in players]
    player_map = {p["id"]: p["name"] for p in players}
    rounds = []
    partner_history = {}  # track how many times each pair has partnered
    opponent_history = {}  # track how many times each pair has opposed
    bye_counts = {pid: 0 for pid in player_ids}
    last_partners = {}  # who each player partnered with last round

    # Number of rounds = enough for everyone to play multiple times
    num_rounds = max(n - 1, 4)
    players_per_match = 4
    available_slots = num_courts * players_per_match

    for round_num in range(num_rounds):
        # Select players for this round (handle byes)
        active_count = min(len(player_ids), available_slots)
        # Make active count divisible by 4
        active_count = (active_count // 4) * 4

        if active_count < 4:
            break

        # Choose who sits out (fairest bye distribution)
        if active_count < len(player_ids):
            # Sort by bye_counts ascending, then shuffle ties
            sorted_players = sorted(player_ids, key=lambda pid: (bye_counts[pid], random.random()))
            active_players = sorted_players[:active_count]
            bye_players = sorted_players[active_count:]
            for bp in bye_players:
                bye_counts[bp] += 1
        else:
            active_players = list(player_ids)
            bye_players = []

        # Generate pairings that avoid consecutive same partners
        best_matches = None
        best_score = float('inf')

        for attempt in range(50):
            random.shuffle(active_players)
            matches = []
            attempt_score = 0

            for i in range(0, len(active_players), 4):
                if i + 3 >= len(active_players):
                    break
                p1, p2, p3, p4 = active_players[i], active_players[i+1], active_players[i+2], active_players[i+3]
                team_a = (p1, p2)
                team_b = (p3, p4)

                # Penalize same partner as last round
                pair_a = tuple(sorted(team_a))
                pair_b = tuple(sorted(team_b))
                if last_partners.get(p1) == p2 or last_partners.get(p2) == p1:
                    attempt_score += 10
                if last_partners.get(p3) == p4 or last_partners.get(p4) == p3:
                    attempt_score += 10

                # Penalize repeat partners/opponents
                attempt_score += partner_history.get(pair_a, 0) * 3
                attempt_score += partner_history.get(pair_b, 0) * 3
                for pa in team_a:
                    for pb in team_b:
                        opp_pair = tuple(sorted((pa, pb)))
                        attempt_score += opponent_history.get(opp_pair, 0)

                court = (len(matches) % num_courts) + 1
                matches.append({
                    "team_a": list(team_a),
                    "team_b": list(team_b),
                    "court": court,
                })

            if attempt_score < best_score:
                best_score = attempt_score
                best_matches = matches

        if not best_matches:
            continue

        # Update histories
        for m in best_matches:
            pair_a = tuple(sorted(m["team_a"]))
            pair_b = tuple(sorted(m["team_b"]))
            partner_history[pair_a] = partner_history.get(pair_a, 0) + 1
            partner_history[pair_b] = partner_history.get(pair_b, 0) + 1
            for pa in m["team_a"]:
                for pb in m["team_b"]:
                    opp_pair = tuple(sorted((pa, pb)))
                    opponent_history[opp_pair] = opponent_history.get(opp_pair, 0) + 1
            # Track last partners
            last_partners[m["team_a"][0]] = m["team_a"][1]
            last_partners[m["team_a"][1]] = m["team_a"][0]
            last_partners[m["team_b"][0]] = m["team_b"][1]
            last_partners[m["team_b"][1]] = m["team_b"][0]

        # Build round data
        round_data = {
            "round": round_num + 1,
            "matches": [],
            "byes": [{"id": bp, "name": player_map[bp]} for bp in bye_players]
        }
        for m in best_matches:
            round_data["matches"].append({
                "court": m["court"],
                "team_a": [{"id": pid, "name": player_map[pid]} for pid in m["team_a"]],
                "team_b": [{"id": pid, "name": player_map[pid]} for pid in m["team_b"]],
            })
        rounds.append(round_data)

    return rounds


# ============ WEEKLY CHECK-IN & EVENT ROUTES ============

@api_router.post("/weekly-events")
async def create_weekly_event(data: WeeklyEventCreate, admin: dict = Depends(get_admin_user)):
    """Admin creates a Sunday event"""
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    event_id = str(uuid.uuid4())
    event = {
        "id": event_id,
        "event_date": data.event_date,
        "title": data.title or f"Sunday Doubles - {data.event_date}",
        "location": data.location or settings.get("default_location", "Local Tennis Club"),
        "start_time": data.start_time or settings.get("default_start_time", "09:00"),
        "num_courts": data.num_courts or settings.get("num_courts", 2),
        "status": "open",  # open, scheduled
        "rsvp_closed": False,
        "confirmed_players": [],
        "bench_players": [],
        "generated_schedule": None,
        "is_admin_overridden": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["id"]
    }
    await db.weekly_events.insert_one(event)
    return {k: v for k, v in event.items() if k != "_id"}

@api_router.get("/weekly-events")
async def get_weekly_events():
    """Get all weekly events"""
    events = await db.weekly_events.find({}, {"_id": 0}).sort("event_date", -1).to_list(50)
    return events

@api_router.get("/weekly-events/upcoming")
async def get_upcoming_weekly_events():
    """Get upcoming events (today and future, not archived)"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    events = await db.weekly_events.find(
        {"event_date": {"$gte": today}, "archived": {"$ne": True}}, {"_id": 0}
    ).sort("event_date", 1).to_list(10)
    return events

@api_router.get("/weekly-events/{event_id}")
async def get_weekly_event(event_id: str):
    """Get single event with check-ins"""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    # Attach check-ins
    checkins = await db.checkins.find({"event_id": event_id}, {"_id": 0}).to_list(200)
    event["checkins"] = checkins
    return event

@api_router.delete("/weekly-events/{event_id}")
async def delete_weekly_event(event_id: str, admin: dict = Depends(get_admin_user)):
    """Admin soft-deletes an event (can be restored)"""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    # Soft delete: move to deleted_events collection
    event["deleted_at"] = datetime.now(timezone.utc).isoformat()
    event["deleted_by"] = admin["id"]
    await db.deleted_events.insert_one(event)
    await db.weekly_events.delete_one({"id": event_id})
    return {"message": "Event deleted (can be restored)"}

@api_router.post("/weekly-events/restore-last")
async def restore_last_event(admin: dict = Depends(get_admin_user)):
    """Restore the most recently deleted event"""
    last_deleted = await db.deleted_events.find_one({}, {"_id": 0}, sort=[("deleted_at", -1)])
    if not last_deleted:
        raise HTTPException(status_code=404, detail="No deleted events to restore")
    event_id = last_deleted["id"]
    # Remove soft-delete fields
    last_deleted.pop("deleted_at", None)
    last_deleted.pop("deleted_by", None)
    await db.weekly_events.insert_one(last_deleted)
    await db.deleted_events.delete_one({"id": event_id})
    return {"message": f"Event '{last_deleted.get('title', event_id)}' restored"}

# --- Check-in routes ---

@api_router.post("/checkins")
async def submit_checkin(data: CheckInCreate, user: dict = Depends(get_current_user)):
    """User RSVPs for an event. Auto-confirmed if spots available, otherwise benched."""
    event = await db.weekly_events.find_one({"id": data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if data.status not in ("available", "not_available", "maybe", "bench"):
        raise HTTPException(status_code=400, detail="Invalid status")

    # Get settings for RSVP open day/time
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    tz_name = settings.get("checkin_timezone", "US/Eastern")
    rsvp_open_day = settings.get("rsvp_open_day", 2)
    rsvp_open_hour = settings.get("rsvp_open_hour", 7)
    try:
        import zoneinfo
        tz = zoneinfo.ZoneInfo(tz_name)
    except Exception:
        tz = timezone.utc
    now_local = datetime.now(tz)
    event_date = datetime.strptime(event["event_date"], "%Y-%m-%d").replace(tzinfo=tz)
    days_before_sunday = (6 - rsvp_open_day) % 7
    rsvp_open_dt = (event_date - timedelta(days=days_before_sunday)).replace(
        hour=rsvp_open_hour, minute=0, second=0, microsecond=0
    )
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    if now_local < rsvp_open_dt:
        raise HTTPException(
            status_code=400,
            detail=f"RSVP opens {day_names[rsvp_open_day]} at {rsvp_open_hour}:00 AM ({tz_name})"
        )

    rsvp_closed = event.get("rsvp_closed", False)
    now_ts = datetime.now(timezone.utc).isoformat()
    max_players = event.get("num_courts", 2) * 4
    confirmed = event.get("confirmed_players") or event.get("approved_players") or []
    bench = event.get("bench_players", [])

    # Determine final status
    final_status = data.status
    if data.status == "available":
        if rsvp_closed:
            # RSVP closed — auto-bench
            final_status = "bench"
        elif len(confirmed) >= max_players:
            # Courts full — auto-bench
            final_status = "bench"
        else:
            final_status = "confirmed"

    if rsvp_closed and data.status == "maybe":
        raise HTTPException(status_code=400, detail="RSVP is closed. You can join the Bench.")

    # Upsert checkin record
    existing = await db.checkins.find_one({"event_id": data.event_id, "user_id": user["id"]})
    if existing:
        old_status = existing.get("status")
        await db.checkins.update_one(
            {"event_id": data.event_id, "user_id": user["id"]},
            {"$set": {"status": final_status, "updated_at": now_ts}}
        )
        # Remove from old lists
        if old_status == "confirmed":
            confirmed = [p for p in confirmed if p.get("id") != user["id"]]
        if old_status == "bench":
            bench = [p for p in bench if p.get("id") != user["id"]]
    else:
        checkin = {
            "id": str(uuid.uuid4()),
            "event_id": data.event_id,
            "user_id": user["id"],
            "user_name": user["name"],
            "status": final_status,
            "created_at": now_ts,
            "updated_at": now_ts
        }
        await db.checkins.insert_one(checkin)

    # Update event lists
    player_entry = {"id": user["id"], "name": user["name"], "timestamp": now_ts}
    if final_status == "confirmed":
        if not any(p.get("id") == user["id"] for p in confirmed):
            confirmed.append(player_entry)
        # Remove from bench if present
        bench = [b for b in bench if b.get("id") != user["id"]]
    elif final_status == "bench":
        if not any(b.get("id") == user["id"] for b in bench):
            bench.append(player_entry)
        # Remove from confirmed if present
        confirmed = [p for p in confirmed if p.get("id") != user["id"]]
    elif final_status in ("not_available", "maybe"):
        confirmed = [p for p in confirmed if p.get("id") != user["id"]]
        bench = [b for b in bench if b.get("id") != user["id"]]
        # If a confirmed spot freed up, promote first bench player
        if len(confirmed) < max_players and bench:
            promoted = bench.pop(0)
            promoted_entry = {"id": promoted["id"], "name": promoted["name"], "timestamp": now_ts}
            confirmed.append(promoted_entry)
            await db.checkins.update_one(
                {"event_id": data.event_id, "user_id": promoted["id"]},
                {"$set": {"status": "confirmed", "updated_at": now_ts}}
            )
            # Push notification to promoted player (LOUD)
            asyncio.create_task(send_push_notification(
                promoted["id"],
                "You're In!",
                f"A spot opened up — you've been promoted from the bench for {event.get('title', 'Sunday Doubles')}!",
                "/schedule",
                urgency="high"
            ))
            # Silent broadcast to all confirmed (group update)
            all_confirmed_ids = [p["id"] for p in confirmed]
            asyncio.create_task(send_push_to_roster(
                all_confirmed_ids,
                "Match Update",
                f"{promoted['name']} has joined the Sunday roster. View the updated schedule.",
                "/schedule",
                urgency="low",
                exclude_ids=[promoted["id"]]
            ))

    await db.weekly_events.update_one({"id": data.event_id}, {"$set": {
        "confirmed_players": confirmed,
        "bench_players": bench
    }})

    msg_map = {
        "confirmed": f"You're confirmed! ({len(confirmed)}/{max_players} spots filled)",
        "bench": f"Courts are full. You're #{len([b for b in bench if b.get('id') == user['id']]) or len(bench)} on the Bench.",
        "not_available": "Marked as unavailable",
        "maybe": "Marked as Maybe"
    }
    return {"message": msg_map.get(final_status, "Status updated"), "status": final_status}

@api_router.get("/checkins/{event_id}")
async def get_event_checkins(event_id: str):
    """Get all check-ins for an event"""
    checkins = await db.checkins.find({"event_id": event_id}, {"_id": 0}).to_list(200)
    return checkins

@api_router.get("/checkins/{event_id}/me")
async def get_my_checkin(event_id: str, user: dict = Depends(get_current_user)):
    """Get current user's check-in for an event"""
    checkin = await db.checkins.find_one(
        {"event_id": event_id, "user_id": user["id"]}, {"_id": 0}
    )
    return checkin or {"status": None}

# --- Admin approval routes ---

@api_router.post("/weekly-events/{event_id}/approve")
async def approve_players(event_id: str, data: ApprovePlayersRequest, admin: dict = Depends(get_admin_user)):
    """Admin approves the player list for an event"""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    approved = []
    for pid in data.approved_player_ids:
        u = await db.users.find_one({"id": pid}, {"_id": 0, "id": 1, "name": 1})
        if u:
            approved.append({"id": u["id"], "name": u["name"]})
    waitlist = []
    for pid in data.waitlist_player_ids:
        u = await db.users.find_one({"id": pid}, {"_id": 0, "id": 1, "name": 1})
        if u:
            waitlist.append({"id": u["id"], "name": u["name"]})

    await db.weekly_events.update_one({"id": event_id}, {"$set": {
        "approved_players": approved,
        "waitlist_players": waitlist,
        "status": "approved"
    }})
    return {"message": f"Approved {len(approved)} players, {len(waitlist)} on waitlist"}

@api_router.post("/weekly-events/{event_id}/override")
async def admin_override(event_id: str, data: AdminOverrideRequest, admin: dict = Depends(get_admin_user)):
    """Admin manually adds/moves/removes a player"""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    u = await db.users.find_one({"id": data.player_id}, {"_id": 0, "id": 1, "name": 1})
    if not u:
        raise HTTPException(status_code=404, detail="Player not found")

    confirmed = event.get("confirmed_players") or event.get("approved_players") or []
    bench = event.get("bench_players", [])
    player_entry = {"id": u["id"], "name": u["name"], "timestamp": datetime.now(timezone.utc).isoformat()}

    confirmed = [p for p in confirmed if p["id"] != data.player_id]
    bench = [p for p in bench if p["id"] != data.player_id]

    if data.action == "add_confirmed":
        confirmed.append(player_entry)
    elif data.action == "move_to_bench":
        bench.append(player_entry)
    elif data.action == "remove":
        pass
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await db.weekly_events.update_one({"id": event_id}, {"$set": {
        "confirmed_players": confirmed,
        "bench_players": bench,
    }})
    return {"message": f"Player {data.action}", "confirmed_count": len(confirmed), "bench_count": len(bench)}

@api_router.post("/weekly-events/{event_id}/cancel-player")
async def cancel_player(event_id: str, user: dict = Depends(get_current_user)):
    """Player cancels their confirmed spot - auto-promote from bench"""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    confirmed = event.get("confirmed_players") or event.get("approved_players") or []
    bench = event.get("bench_players", [])

    was_confirmed = any(p["id"] == user["id"] for p in confirmed)
    confirmed = [p for p in confirmed if p["id"] != user["id"]]

    promoted = None
    if was_confirmed and bench:
        bench.sort(key=lambda b: b.get("timestamp", b.get("added_at", "")))
        promoted = bench.pop(0)
        now_ts = datetime.now(timezone.utc).isoformat()
        confirmed.append({"id": promoted["id"], "name": promoted["name"], "timestamp": now_ts})
        await db.checkins.update_one(
            {"event_id": event_id, "user_id": promoted["id"]},
            {"$set": {"status": "confirmed", "updated_at": now_ts}}
        )
        asyncio.create_task(send_push_notification(
            promoted["id"],
            "You're In!",
            f"A spot opened up — you've been promoted from the bench for {event.get('title', 'Sunday Doubles')}!",
            "/schedule",
            urgency="high"
        ))
        all_confirmed_ids = [p["id"] for p in confirmed]
        asyncio.create_task(send_push_to_roster(
            all_confirmed_ids,
            "Match Update",
            f"{promoted['name']} has joined the Sunday roster. View the updated schedule.",
            "/schedule",
            urgency="low",
            exclude_ids=[promoted["id"]]
        ))

    await db.weekly_events.update_one({"id": event_id}, {"$set": {
        "confirmed_players": confirmed,
        "bench_players": bench,
    }})

    await db.checkins.update_one(
        {"event_id": event_id, "user_id": user["id"]},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    msg = "Cancelled"
    if promoted:
        msg += f". {promoted['name']} auto-promoted from bench."
    return {"message": msg}

# --- Generate Doubles Round Robin ---

@api_router.post("/weekly-events/{event_id}/generate-schedule")
async def generate_doubles_schedule(event_id: str, data: GenerateDoublesRRRequest, admin: dict = Depends(get_admin_user)):
    """Generate doubles round robin from confirmed players"""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    confirmed = event.get("confirmed_players") or event.get("approved_players") or []
    if len(confirmed) < 4:
        raise HTTPException(status_code=400, detail=f"Need at least 4 confirmed players (have {len(confirmed)})")

    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    nc = data.num_courts or event.get("num_courts") or settings.get("num_courts", 2)
    st = data.start_time or event.get("start_time") or settings.get("default_start_time", "09:00")
    dur = data.match_duration_minutes or settings.get("match_duration_minutes", 30)

    rounds = generate_doubles_round_robin(confirmed, nc)

    start_hour, start_min = map(int, st.split(":"))
    for r in rounds:
        round_time = datetime.now().replace(hour=start_hour, minute=start_min) + timedelta(minutes=dur * (r["round"] - 1))
        r["time"] = round_time.strftime("%H:%M")

    await db.weekly_events.update_one({"id": event_id}, {"$set": {
        "generated_schedule": rounds,
        "status": "scheduled",
        "is_admin_overridden": False,
        "schedule_settings": {"num_courts": nc, "start_time": st, "match_duration": dur}
    }})

    # Post to chatroom
    lines = [f"DOUBLES SCHEDULE - {event['title']}"]
    for r in rounds:
        lines.append(f"\nRound {r['round']} ({r['time']}):")
        for m in r["matches"]:
            ta = " & ".join([p["name"] for p in m["team_a"]])
            tb = " & ".join([p["name"] for p in m["team_b"]])
            lines.append(f"  Court {m['court']}: {ta}  vs  {tb}")
        if r.get("byes"):
            lines.append(f"  Bye: {', '.join([b['name'] for b in r['byes']])}")

    await db.chatroom.insert_one({
        "id": str(uuid.uuid4()),
        "sender_id": admin["id"],
        "sender_name": admin["name"],
        "sender_role": "admin",
        "content": "\n".join(lines),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_schedule": True
    })

    # Broadcast push notification to all confirmed players
    roster_ids = [p["id"] for p in confirmed]
    asyncio.create_task(send_push_to_roster(
        roster_ids,
        "Sunday Round Robin is Set!",
        f"Your court assignments and times are now live for {event.get('title', 'Sunday Doubles')}. Check the schedule!",
        "/schedule",
        urgency="normal"
    ))

    return {"message": f"Schedule generated: {len(rounds)} rounds", "rounds": rounds}


class ScheduleEditRequest(BaseModel):
    schedule: list  # The full edited schedule (rounds array)

@api_router.put("/weekly-events/{event_id}/edit-schedule")
async def edit_schedule(event_id: str, data: ScheduleEditRequest, admin: dict = Depends(get_admin_user)):
    """Admin manually edits the generated schedule. Sets isAdminOverridden to prevent auto-regeneration."""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not event.get("generated_schedule"):
        raise HTTPException(status_code=400, detail="No schedule to edit. Generate one first.")

    await db.weekly_events.update_one({"id": event_id}, {"$set": {
        "generated_schedule": data.schedule,
        "is_admin_overridden": True
    }})
    return {"message": "Schedule updated. Auto-generation disabled for this event."}

@api_router.post("/weekly-events/{event_id}/swap-player")
async def swap_player_in_schedule(event_id: str, round_idx: int = Query(...), match_idx: int = Query(...), team: str = Query(...), player_idx: int = Query(...), new_player_id: str = Query(...), admin: dict = Depends(get_admin_user)):
    """Admin swaps a player in the schedule (e.g., replace no-show with bench player)."""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    schedule = event.get("generated_schedule", [])
    if not schedule:
        raise HTTPException(status_code=400, detail="No schedule exists")

    # Find new player info
    bench = event.get("bench_players", [])
    confirmed = event.get("confirmed_players") or event.get("approved_players") or []
    new_player = None
    # Check bench first
    for b in bench:
        if b["id"] == new_player_id:
            new_player = {"id": b["id"], "name": b["name"]}
            break
    # Check confirmed
    if not new_player:
        for c in confirmed:
            if c["id"] == new_player_id:
                new_player = {"id": c["id"], "name": c["name"]}
                break
    # Check users
    if not new_player:
        u = await db.users.find_one({"id": new_player_id}, {"_id": 0, "id": 1, "name": 1})
        if u:
            new_player = {"id": u["id"], "name": u["name"]}
    if not new_player:
        raise HTTPException(status_code=404, detail="Player not found")

    try:
        match = schedule[round_idx]["matches"][match_idx]
        old_player = match[team][player_idx]
        match[team][player_idx] = new_player
    except (IndexError, KeyError):
        raise HTTPException(status_code=400, detail="Invalid round/match/team/player index")

    await db.weekly_events.update_one({"id": event_id}, {"$set": {
        "generated_schedule": schedule,
        "is_admin_overridden": True
    }})
    return {"message": f"Swapped {old_player.get('name', '?')} with {new_player['name']}. Admin override active."}


# --- RSVP Close / Drop Out / External Player ---

@api_router.post("/weekly-events/{event_id}/close-rsvp")
async def close_rsvp(event_id: str, admin: dict = Depends(get_admin_user)):
    """Admin closes RSVP for an event. Late players can only join the Bench."""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.weekly_events.update_one({"id": event_id}, {"$set": {"rsvp_closed": True}})
    return {"message": "RSVP closed. Players can now only join the Bench."}

@api_router.post("/weekly-events/{event_id}/reopen-rsvp")
async def reopen_rsvp(event_id: str, admin: dict = Depends(get_admin_user)):
    """Admin reopens RSVP for an event."""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.weekly_events.update_one({"id": event_id}, {"$set": {"rsvp_closed": False}})
    return {"message": "RSVP reopened."}

@api_router.post("/weekly-events/{event_id}/drop-out")
async def drop_out_player(event_id: str, user: dict = Depends(get_current_user)):
    """Confirmed player drops out. Auto-promotes first bench player (FIFO by timestamp)."""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    confirmed = event.get("confirmed_players") or event.get("approved_players") or []
    bench = event.get("bench_players", [])

    was_confirmed = any(p["id"] == user["id"] for p in confirmed)
    confirmed = [p for p in confirmed if p["id"] != user["id"]]

    promoted = None
    if was_confirmed and bench:
        # Sort bench by timestamp to ensure FIFO
        bench.sort(key=lambda b: b.get("timestamp", b.get("added_at", "")))
        promoted = bench.pop(0)
        now_ts = datetime.now(timezone.utc).isoformat()
        confirmed.append({"id": promoted["id"], "name": promoted["name"], "timestamp": now_ts})
        await db.checkins.update_one(
            {"event_id": event_id, "user_id": promoted["id"]},
            {"$set": {"status": "confirmed", "updated_at": now_ts}}
        )
        asyncio.create_task(send_push_notification(
            promoted["id"],
            "You're In!",
            f"A spot opened up — you've been promoted from the bench for {event.get('title', 'Sunday Doubles')}!",
            "/schedule",
            urgency="high"
        ))
        all_confirmed_ids = [p["id"] for p in confirmed]
        asyncio.create_task(send_push_to_roster(
            all_confirmed_ids,
            "Match Update",
            f"{promoted['name']} has joined the Sunday roster. View the updated schedule.",
            "/schedule",
            urgency="low",
            exclude_ids=[promoted["id"]]
        ))

    await db.checkins.update_one(
        {"event_id": event_id, "user_id": user["id"]},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await db.weekly_events.update_one({"id": event_id}, {"$set": {
        "confirmed_players": confirmed,
        "bench_players": bench,
    }})

    msg = "You have dropped out."
    if promoted:
        msg += f" {promoted['name']} has been promoted from the Bench."
    return {"message": msg, "promoted": promoted["name"] if promoted else None}

@api_router.post("/weekly-events/{event_id}/add-external-player")
async def add_external_player(event_id: str, data: AddExternalPlayerRequest, admin: dict = Depends(get_admin_user)):
    """Admin adds an external (non-member) player by name to the confirmed list."""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    confirmed = event.get("confirmed_players") or event.get("approved_players") or []
    ext_id = f"ext-{str(uuid.uuid4())[:8]}"
    confirmed.append({"id": ext_id, "name": data.name, "external": True, "timestamp": datetime.now(timezone.utc).isoformat()})
    await db.weekly_events.update_one({"id": event_id}, {"$set": {"confirmed_players": confirmed}})
    return {"message": f"External player '{data.name}' added.", "player_id": ext_id}

@api_router.post("/weekly-events/{event_id}/add-players")
async def add_registered_players(event_id: str, data: AddPlayersRequest, admin: dict = Depends(get_admin_user)):
    """Admin adds registered players to confirmed list (RSVP them manually)."""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    confirmed = event.get("confirmed_players") or event.get("approved_players") or []
    existing_ids = {p["id"] for p in confirmed}
    added = []
    now_ts = datetime.now(timezone.utc).isoformat()
    for pid in data.player_ids:
        if pid in existing_ids:
            continue
        u = await db.users.find_one({"id": pid}, {"_id": 0, "id": 1, "name": 1})
        if u:
            confirmed.append({"id": u["id"], "name": u["name"], "timestamp": now_ts})
            added.append(u["name"])
            # Also upsert checkin
            existing_ci = await db.checkins.find_one({"event_id": event_id, "user_id": pid})
            if existing_ci:
                await db.checkins.update_one({"event_id": event_id, "user_id": pid}, {"$set": {"status": "confirmed", "updated_at": now_ts}})
            else:
                await db.checkins.insert_one({"id": str(uuid.uuid4()), "event_id": event_id, "user_id": pid, "user_name": u["name"], "status": "confirmed", "created_at": now_ts, "updated_at": now_ts})

    await db.weekly_events.update_one({"id": event_id}, {"$set": {"confirmed_players": confirmed}})
    return {"message": f"Added {len(added)} players: {', '.join(added)}", "added_count": len(added)}

@api_router.get("/weekly-events/{event_id}/checkin-window")
async def get_checkin_window(event_id: str):
    """Check if the check-in window is open for an event"""
    event = await db.weekly_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    tz_name = settings.get("checkin_timezone", "US/Eastern")
    rsvp_open_day = settings.get("rsvp_open_day", 2)  # 0=Mon..6=Sun, default Wed
    rsvp_open_hour = settings.get("rsvp_open_hour", 7)
    try:
        import zoneinfo
        tz = zoneinfo.ZoneInfo(tz_name)
    except Exception:
        tz = timezone.utc
    now_local = datetime.now(tz)
    event_date = datetime.strptime(event["event_date"], "%Y-%m-%d").replace(tzinfo=tz)
    days_before_sunday = (6 - rsvp_open_day) % 7
    rsvp_open_dt = (event_date - timedelta(days=days_before_sunday)).replace(
        hour=rsvp_open_hour, minute=0, second=0, microsecond=0
    )

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    return {
        "is_open": now_local >= rsvp_open_dt,
        "rsvp_closed": event.get("rsvp_closed", False),
        "opens_at": rsvp_open_dt.isoformat(),
        "open_day_name": day_names[rsvp_open_day],
        "open_hour": rsvp_open_hour,
        "timezone": tz_name,
        "event_status": event.get("status", "open")
    }


# ============ ADMIN: DATA MANAGEMENT ============

@api_router.post("/admin/clear-test-data")
async def clear_test_data(admin: dict = Depends(get_admin_user)):
    """Wipe all test data while preserving the admin account"""
    admin_id = admin["id"]
    admin_email = admin["email"]

    del_users = await db.users.delete_many({"id": {"$ne": admin_id}})
    del_solo = await db.solo_players.delete_many({"user_id": {"$ne": admin_id}})
    del_matches = await db.matches.delete_many({})
    del_schedules = await db.schedules.delete_many({})
    del_events = await db.weekly_events.delete_many({})
    del_checkins = await db.checkins.delete_many({})
    del_teams = await db.teams.delete_many({})
    await db.availability.delete_many({})
    del_chatroom = await db.chatroom.delete_many({})
    del_announcements = await db.announcements.delete_many({})
    del_articles = await db.articles.delete_many({})
    await db.messages.delete_many({})
    await db.scout_reports.delete_many({})
    await db.strategy_chats.delete_many({})
    await db.chat_history.delete_many({})

    return {
        "message": f"Test data cleared. Preserved admin: {admin_email}",
        "deleted": {
            "users": del_users.deleted_count,
            "solo_players": del_solo.deleted_count,
            "matches": del_matches.deleted_count,
            "schedules": del_schedules.deleted_count,
            "weekly_events": del_events.deleted_count,
            "checkins": del_checkins.deleted_count,
            "teams": del_teams.deleted_count,
            "chatroom": del_chatroom.deleted_count,
            "announcements": del_announcements.deleted_count,
            "articles": del_articles.deleted_count,
        }
    }

@api_router.post("/admin/clear-users")
async def clear_users(admin: dict = Depends(get_admin_user)):
    """Delete all users except admin"""
    admin_id = admin["id"]
    del_users = await db.users.delete_many({"id": {"$ne": admin_id}})
    del_solo = await db.solo_players.delete_many({"user_id": {"$ne": admin_id}})
    return {"message": f"Cleared {del_users.deleted_count} users, {del_solo.deleted_count} solo entries"}

@api_router.post("/admin/clear-events")
async def clear_events(admin: dict = Depends(get_admin_user)):
    """Delete all schedules, weekly events, and check-ins"""
    del_schedules = await db.schedules.delete_many({})
    del_events = await db.weekly_events.delete_many({})
    del_checkins = await db.checkins.delete_many({})
    await db.availability.delete_many({})
    return {"message": f"Cleared {del_events.deleted_count} events, {del_schedules.deleted_count} schedules, {del_checkins.deleted_count} check-ins"}

@api_router.post("/admin/clear-matches")
async def clear_matches(admin: dict = Depends(get_admin_user)):
    """Delete all matches, teams, and solo ladder entries"""
    del_matches = await db.matches.delete_many({})
    del_teams = await db.teams.delete_many({})
    del_solo = await db.solo_players.delete_many({})
    return {"message": f"Cleared {del_matches.deleted_count} matches, {del_teams.deleted_count} teams, {del_solo.deleted_count} solo entries"}

@api_router.post("/admin/clear-chat")
async def clear_chat(admin: dict = Depends(get_admin_user)):
    """Delete all chatroom messages and announcements"""
    del_chatroom = await db.chatroom.delete_many({})
    del_announcements = await db.announcements.delete_many({})
    await db.messages.delete_many({})
    return {"message": f"Cleared {del_chatroom.deleted_count} messages, {del_announcements.deleted_count} announcements"}

@api_router.post("/admin/clear-content")
async def clear_content(admin: dict = Depends(get_admin_user)):
    """Delete all articles, scout reports, and strategy chats"""
    del_articles = await db.articles.delete_many({})
    await db.scout_reports.delete_many({})
    await db.strategy_chats.delete_many({})
    await db.chat_history.delete_many({})
    return {"message": f"Cleared {del_articles.deleted_count} articles, scout reports, and strategy chats"}


# ============ WEEKLY CYCLE & ARCHIVES ============

@api_router.get("/match-archives")
async def get_match_archives(user: dict = Depends(get_current_user)):
    """Get archived match data"""
    archives = await db.match_archives.find({}, {"_id": 0}).sort("event_date", -1).to_list(50)
    return archives

@api_router.post("/admin/trigger-weekly-cycle")
async def trigger_weekly_cycle(admin: dict = Depends(get_admin_user)):
    """Admin manually triggers the weekly cycle (archive + auto-create)"""
    import zoneinfo
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    tz_name = settings.get("checkin_timezone", "US/Eastern")
    try:
        tz = zoneinfo.ZoneInfo(tz_name)
    except Exception:
        tz = timezone.utc
    now = datetime.now(tz)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    past_events = await db.weekly_events.find(
        {"event_date": {"$lt": today_str}, "archived": {"$ne": True}}, {"_id": 0}
    ).to_list(50)
    archived_count = 0
    for event in past_events:
        confirmed = event.get("confirmed_players") or event.get("approved_players") or []
        schedule = event.get("generated_schedule")
        if schedule and confirmed:
            await db.match_archives.insert_one({
                "id": str(uuid.uuid4()), "event_id": event["id"], "event_date": event["event_date"],
                "title": event.get("title", ""), "confirmed_players": confirmed,
                "bench_players": event.get("bench_players", []), "schedule": schedule,
                "archived_at": datetime.now(timezone.utc).isoformat()
            })
        await db.weekly_events.update_one({"id": event["id"]}, {"$set": {"archived": True}})
        archived_count += 1
    days_to_sunday = (6 - now.weekday()) % 7
    if days_to_sunday == 0:
        days_to_sunday = 7
    next_sunday = (now + timedelta(days=days_to_sunday)).strftime("%Y-%m-%d")
    existing_event = await db.weekly_events.find_one({"event_date": next_sunday})
    created = False
    if not existing_event:
        await db.weekly_events.insert_one({
            "id": str(uuid.uuid4()), "event_date": next_sunday,
            "title": f"Sunday Doubles - {next_sunday}",
            "location": settings.get("default_location", "Local Tennis Club"),
            "start_time": settings.get("default_start_time", "09:00"),
            "num_courts": settings.get("num_courts", 2),
            "status": "open", "rsvp_closed": False, "confirmed_players": [], "bench_players": [],
            "generated_schedule": None, "is_admin_overridden": False,
            "created_at": datetime.now(timezone.utc).isoformat(), "created_by": admin["id"]
        })
        created = True
    return {"message": f"Archived {archived_count} events. {'Created for ' + next_sunday if created else next_sunday + ' exists.'}", "archived": archived_count, "next_sunday": next_sunday, "event_created": created}

# ============ HEALTH CHECK ============

@api_router.get("/health")
async def api_health():
    return {"status": "ok"}

@app.get("/health")
async def root_health():
    return {"status": "ok"}


# ============ APP SETUP ============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "https://tennis-buddies.me",
        "https://www.tennis-buddies.me",
        "https://match-mixer.emergent.host",
        "https://doubles-ladder.preview.emergentagent.com",
        "http://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def seed_admin():
    """Create or fix admin account on startup - always ensures correct password"""
    try:
        existing = await db.users.find_one({"email": "admin@tennis.com"})
        new_hash = hash_password("admin123")
        if not existing:
            admin_user = {
                "id": str(uuid.uuid4()),
                "email": "admin@tennis.com",
                "password": new_hash,
                "name": "Admin",
                "role": "admin",
                "phone": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(admin_user)
            logger.info("Admin account created")
        else:
            await db.users.update_one(
                {"email": "admin@tennis.com"},
                {"$set": {"password": new_hash, "role": "admin", "name": "Admin"}}
            )
            logger.info("Admin account password refreshed")
    except Exception as e:
        logger.error(f"Admin seed error: {e}")

    # Init object storage
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed (non-fatal): {e}")

    # Start the weekly cycle scheduler
    asyncio.create_task(weekly_cycle_scheduler())


async def weekly_cycle_scheduler():
    """Background task: checks every 5 minutes for automated weekly actions"""
    import zoneinfo
    logger.info("Weekly cycle scheduler started")
    while True:
        try:
            settings = await db.settings.find_one({}, {"_id": 0}) or {}
            tz_name = settings.get("checkin_timezone", "US/Eastern")
            rsvp_open_day = settings.get("rsvp_open_day", 2)  # Wednesday
            rsvp_open_hour = settings.get("rsvp_open_hour", 7)
            try:
                tz = zoneinfo.ZoneInfo(tz_name)
            except Exception:
                tz = timezone.utc
            now = datetime.now(tz)

            # --- ACTION 1: Archive past events (after Sunday) ---
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            past_events = await db.weekly_events.find(
                {"event_date": {"$lt": today_str}, "archived": {"$ne": True}},
                {"_id": 0}
            ).to_list(50)

            for event in past_events:
                confirmed = event.get("confirmed_players") or event.get("approved_players") or []
                schedule = event.get("generated_schedule")
                if schedule and confirmed:
                    # Archive: save to match_archives
                    await db.match_archives.insert_one({
                        "id": str(uuid.uuid4()),
                        "event_id": event["id"],
                        "event_date": event["event_date"],
                        "title": event.get("title", ""),
                        "confirmed_players": confirmed,
                        "bench_players": event.get("bench_players", []),
                        "schedule": schedule,
                        "archived_at": datetime.now(timezone.utc).isoformat()
                    })
                # Mark as archived
                await db.weekly_events.update_one(
                    {"id": event["id"]},
                    {"$set": {"archived": True}}
                )
                logger.info(f"Archived event: {event.get('title', event['id'])}")

            # --- ACTION 2: Auto-create next Sunday event on RSVP open day ---
            # Check if it's the right day and hour
            if now.weekday() == rsvp_open_day and now.hour == rsvp_open_hour:
                # Calculate next Sunday
                days_to_sunday = (6 - now.weekday()) % 7
                if days_to_sunday == 0:
                    days_to_sunday = 7
                next_sunday = (now + timedelta(days=days_to_sunday)).strftime("%Y-%m-%d")

                # Check if event already exists for that Sunday
                existing_event = await db.weekly_events.find_one({"event_date": next_sunday})
                last_auto_create = await db.scheduler_state.find_one({"key": "last_auto_create"})
                last_create_date = last_auto_create.get("value", "") if last_auto_create else ""

                if not existing_event and last_create_date != next_sunday:
                    num_courts = settings.get("num_courts", 2)
                    location = settings.get("default_location", "Local Tennis Club")
                    start_time = settings.get("default_start_time", "09:00")
                    event_id = str(uuid.uuid4())
                    new_event = {
                        "id": event_id,
                        "event_date": next_sunday,
                        "title": f"Sunday Doubles - {next_sunday}",
                        "location": location,
                        "start_time": start_time,
                        "num_courts": num_courts,
                        "status": "open",
                        "rsvp_closed": False,
                        "confirmed_players": [],
                        "bench_players": [],
                        "generated_schedule": None,
                        "is_admin_overridden": False,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "created_by": "system"
                    }
                    await db.weekly_events.insert_one(new_event)
                    await db.scheduler_state.update_one(
                        {"key": "last_auto_create"},
                        {"$set": {"key": "last_auto_create", "value": next_sunday}},
                        upsert=True
                    )
                    logger.info(f"Auto-created event for {next_sunday}")

                    # --- ACTION 3: Send global RSVP-open push ---
                    all_subs = await db.push_subscriptions.find({}, {"_id": 0}).to_list(500)
                    for sub_doc in all_subs:
                        asyncio.create_task(send_push_notification(
                            sub_doc["user_id"],
                            "RSVP is OPEN!",
                            "Sign up for this Sunday's match! Spots are first-come, first-served. Register now!",
                            "/schedule",
                            urgency="normal"
                        ))
                    logger.info(f"Sent RSVP-open push to {len(all_subs)} subscribers")

        except Exception as e:
            logger.error(f"Weekly cycle error: {e}")

        # Check every 5 minutes
        await asyncio.sleep(300)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()