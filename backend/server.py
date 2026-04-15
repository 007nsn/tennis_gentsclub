from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import resend
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

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

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

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

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

class ArticleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    category: str
    content_type: str = "article"
    video_url: Optional[str] = None
    image_url: Optional[str] = None
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
                "https://match-mixer.preview.emergentagent.com/admin"
            )
        )
    
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
                "https://match-mixer.preview.emergentagent.com/solo-ladder"
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
                "https://match-mixer.preview.emergentagent.com/messages"
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
                    "https://match-mixer.preview.emergentagent.com/messages"
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
            "default_start_time": "09:00"
        }
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
                    "https://match-mixer.preview.emergentagent.com/availability"
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

@api_router.get("/season-standings")
async def get_season_standings():
    """Get season standings with cumulative stats for all players"""
    players = await db.solo_players.find({}, {"_id": 0}).to_list(100)
    standings = []
    
    for player in players:
        # Get all matches for this player
        matches = await db.matches.find({
            "status": "approved",
            "match_type": "solo",
            "$or": [{"player_a_id": player["id"]}, {"player_b_id": player["id"]}]
        }, {"_id": 0}).sort("match_date", 1).to_list(500)
        
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
                if last_result == "W":
                    temp_streak += 1
                else:
                    temp_streak = 1
                last_result = "W"
                current_streak = temp_streak
            else:
                losses += 1
                if last_result == "L":
                    temp_streak -= 1
                else:
                    temp_streak = -1
                last_result = "L"
                current_streak = temp_streak
            
            if temp_streak > best_streak:
                best_streak = temp_streak
        
        win_rate = (wins / total_matches * 100) if total_matches > 0 else 0
        
        standings.append({
            "player_id": player["id"],
            "player_name": player["name"],
            "matches_played": total_matches,
            "wins": wins,
            "losses": losses,
            "win_rate": round(win_rate, 1),
            "current_streak": current_streak,
            "best_streak": best_streak,
            "points": wins  # Each win = 1 point
        })
    
    # Sort by points (wins), then by win rate
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

DOUBLES_STRATEGY_SYSTEM_PROMPT = """You are an elite doubles tennis tactical coach, drawing from "The Doubles Code" and advanced doubles strategy principles. Your role is to analyze opponents and provide actionable match strategies.

CORE DOUBLES PRINCIPLES YOU FOLLOW:
1. COURT GEOMETRY: Control the middle, use angles to open the court, recover to optimal positions
2. POSITIONING FRAMEWORKS:
   - Both Up (offensive): When your team has the advantage, both at net
   - Both Back (defensive): When under pressure, reset the point
   - One Up/One Back: Standard formation, net player looks to poach
   - I-Formation: Confuse opponents on serve returns
   - Australian Formation: Counter strong cross-court returners

3. COMMUNICATION: Call every ball, signal plays, stay positive with partner

4. TARGETING PATTERNS:
   - Middle: Causes confusion, fewer angles for opponents
   - At the feet: Force weak volleys or half-volleys
   - Lob over aggressive net player
   - Down the line when opponent expects cross-court

5. KEY TACTICAL CONCEPTS:
   - Poaching: Net player crosses to intercept
   - Faking: Pretend to poach to disrupt rhythm
   - Shot selection based on court position
   - Exploiting weaker player
   - Momentum management

When analyzing opponents, provide specific, actionable tactics based on their playstyle, strengths, and weaknesses."""

@api_router.post("/opponent-scout", response_model=OpponentScoutResponse)
async def scout_opponent(request: OpponentScoutRequest, user: dict = Depends(get_current_user)):
    """Get tactical advice for playing against a specific opponent"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"scout-{user['id']}-{uuid.uuid4()}",
            system_message=DOUBLES_STRATEGY_SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.5-pro")
        
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
        
        # Parse response
        strategy = ""
        tactics = []
        warnings = []
        
        current_section = None
        for line in response.split('\n'):
            line = line.strip()
            if line.startswith('STRATEGY:'):
                current_section = 'strategy'
                strategy = line.replace('STRATEGY:', '').strip()
            elif line.startswith('TACTICS:'):
                current_section = 'tactics'
            elif line.startswith('WARNINGS:'):
                current_section = 'warnings'
            elif line.startswith('•') or line.startswith('-'):
                item = line.lstrip('•-').strip()
                if current_section == 'tactics' and item:
                    tactics.append(item)
                elif current_section == 'warnings' and item:
                    warnings.append(item)
            elif current_section == 'strategy' and line:
                strategy += ' ' + line
        
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

STRATEGY_BOT_SYSTEM_PROMPT = """You are the Tennis Buddies Club's Live Strategy Coach, powered by advanced doubles tennis knowledge. You maintain conversation context and provide personalized tactical advice.

YOUR EXPERTISE COVERS:
1. **Court Geometry & Positioning**
   - Optimal court coverage in doubles
   - When to move forward vs stay back
   - Recovery positions after shots
   - Net positioning and spacing with partner

2. **Shot Selection & Patterns**
   - Cross-court vs down-the-line decisions
   - When to lob, drive, or drop shot
   - Targeting patterns based on opponent position
   - Return of serve strategies

3. **Formations & Plays**
   - Standard formation (one up, one back)
   - Both-up aggressive positioning
   - I-Formation and Australian formation
   - Poaching signals and timing

4. **Match Tactics**
   - How to handle different opponent types
   - Momentum management
   - Communication with partner
   - Mental game and focus

5. **Practice Drills**
   - Doubles-specific drills
   - Positioning exercises
   - Point construction practice

COMMUNICATION STYLE:
- Be concise and actionable
- Use tennis terminology appropriately
- Give specific, practical advice
- Reference court positions when relevant (deuce side, ad side, T, alley, etc.)
- Encourage the player while being honest about areas to improve

Remember previous messages in our conversation to provide contextual advice."""

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
            ).with_model("gemini", "gemini-2.5-pro")
        
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
