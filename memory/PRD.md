# Tennis Buddies Club - PRD

## Original Problem Statement
Build a website for Sunday doubles tennis buddies with Team/Solo Ladder, Round Robin scheduling, chatroom communication, and educational content.

## User Personas
1. **Club Member**: Views schedules, marks availability, submits match results, chats with other members, views match history
2. **Admin/Coach**: Manages Round Robin scheduling, approves matches, creates educational content, edits player stats

## Implemented Features (Jan 2026)

### Core Features
- [x] User authentication (JWT-based, first user = admin)
- [x] Team Ladder with points system
- [x] **Solo Ladder with wins-only ranking** (each set win = 1 point)
- [x] Round Robin schedule management with calendar
- [x] Match result submission with admin approval

### New Features
- [x] **Match History Page** - View all past matches with player filter
- [x] **Player Stats** - Detailed stats per player (wins, losses, win rate, recent form)
- [x] **Club Chatroom** - Group chat for all members (replaces email notifications)
- [x] **Availability System** - Players mark available Sundays
- [x] **Round Robin Tournament Generator** - Auto-generates matches where each player plays every other player once, with court assignments and time slots
- [x] **Admin Panel Enhancements** - Edit player stats/names, club settings
- [x] **Educational Content** - 5 sample articles (technique, strategy, fitness, equipment)
- [x] AI Chatbot (GPT-5.2 via Emergent)

## Architecture
- Frontend: React 19, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, Motor (async MongoDB)
- Database: MongoDB
- AI: OpenAI GPT-5.2 via Emergent integrations

## Key Flows

### Round Robin Generation
1. Players mark availability for upcoming Sundays
2. Admin selects a Sunday and generates Round Robin
3. System creates matches: each player vs every other player
4. Courts and time slots auto-assigned
5. Schedule posted to chatroom for all members

### Match Result Flow
1. Player submits match result
2. Admin reviews and approves/rejects
3. If approved, Solo Ladder updates (winner +1 win)
4. Match appears in Match History with stats

## Pages
- Home, Schedule, Team Ladder, Solo Ladder, Match History
- Learn (Education), Chatroom, Availability
- Profile, Submit Result, Admin Panel

## Prioritized Backlog

### P1 (Next)
- Season standings/leaderboards
- Match reminders via chatroom

### P2 (Future)
- Mobile app
- Player head-to-head records
- Tournament brackets
