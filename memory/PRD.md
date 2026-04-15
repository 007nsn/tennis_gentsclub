# Tennis Buddies Club - PRD

## Original Problem Statement
Build a website for Sunday doubles tennis buddies with Team/Solo Ladder, Round Robin scheduling, chatroom communication, educational content, Season Standings, Match Reminders, Opponent Scout (AI), and Live Strategy Bot (AI).

## User Personas
1. **Club Member**: Views schedules, marks availability, submits match results, chats with other members, views match history, uses AI coach
2. **Admin/Coach**: Manages Round Robin scheduling, approves matches, creates educational content, edits player stats, sends match reminders

## Implemented Features

### Core Features (Jan 2026)
- [x] User authentication (JWT-based with httpOnly cookies, first user = admin)
- [x] Team Ladder with points system
- [x] Solo Ladder with wins-only ranking (each win = 1 point)
- [x] Round Robin schedule management with calendar
- [x] Match result submission with admin approval
- [x] Match History Page with player filter
- [x] Player Stats per player (wins, losses, win rate, recent form)
- [x] Club Chatroom (group chat for all members)
- [x] Availability System (players mark available Sundays)
- [x] Round Robin Tournament Generator with court assignments
- [x] Admin Panel (edit stats, manage content, club settings)
- [x] Educational Content (5 sample articles)
- [x] AI Chatbot (GPT-5.2 via Emergent)

### New Features (Apr 2026)
- [x] Season Standings - Cumulative stats with podium, streaks, win rates
- [x] Match Reminders - Admin posts reminders to chatroom from Round Robin tab
- [x] Opponent Scout - Gemini 3.1 Pro AI analyzes opponent playstyle
- [x] Live Strategy Bot - Gemini 3.1 Pro AI chat for doubles strategy advice

### Code Quality Fixes (Apr 2026)
- [x] httpOnly cookies for auth tokens (dual support: cookie + header)
- [x] React hook dependencies fixed (useCallback/useMemo across 8+ components)
- [x] Array index keys replaced with stable identifiers (9 instances)
- [x] Admin.jsx split into 6 sub-components + useAdminData hook (737 -> ~100 lines)
- [x] Backend helper extraction (parse_scout_response, calculate_player_season_stats)
- [x] AuthContext memoized with useMemo
- [x] Calendar inline props extracted to useMemo
- [x] Test credentials moved to environment variables

## Architecture
- Frontend: React 19, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, Motor (async MongoDB)
- Database: MongoDB
- AI: OpenAI GPT-5.2 + Gemini 3.1 Pro via Emergent integrations
- Auth: JWT with httpOnly cookies (SameSite=lax, Secure) + Bearer header fallback

## Prioritized Backlog

### P0 (Done)
- All requested features implemented and tested

### P1 (Next)
- Integrate user's doubles strategy playbook into AI prompts
- Player head-to-head records

### P2 (Future)
- Mobile app
- Tournament brackets
- Real-time chat (WebSocket)
