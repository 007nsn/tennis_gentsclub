# Tennis Buddies Club - PRD

## Original Problem Statement
Build a website for Sunday doubles tennis buddies with Solo Ladder, Season Standings, chatroom, match history, AI doubles coaching (Opponent Scout & Live Strategy Bot), and a dynamic Weekly Check-In system with an Admin-approved Doubles Round Robin algorithm that handles byes and partner rotations.

## Implemented Features

### Core Features
- [x] User authentication (JWT + httpOnly cookies)
- [x] Solo Ladder (wins-only ranking)
- [x] Match result submission with admin approval
- [x] Match History with player filter and stats
- [x] Head-to-Head Records - Player comparison + full W-L matrix
- [x] Best Partnerships page (auto-generated from schedules)
- [x] Club Chatroom, AI Chatbot (GPT-5.2)
- [x] Opponent Scout + Strategy Bot (Gemini 3 Pro with user's playbook)
- [x] Season Standings, Match Reminders
- [x] Admin Panel (6 sub-components), Educational/Improve page (survey type)
- [x] Hawthorne NY weather shortcut
- [x] Support This Site (Venmo link)
- [x] Phone number field for user registration

### RSVP & Scheduling (Updated Apr 2026)
- [x] Weekly RSVP opens on configurable day/time (default: Wednesday 7AM US/Eastern)
- [x] Admin can change RSVP open day and time via Settings
- [x] Admin can Close RSVP manually — late players can only join the Bench
- [x] Admin can Reopen RSVP
- [x] Bench (waiting list) — players join when RSVP is closed
- [x] Confirmed players can Drop Out — first Bench player auto-promoted (FIFO)
- [x] Admin can add external non-member players by name
- [x] Doubles Round Robin schedule generation with partner rotation and byes
- [x] Admin approval flow for player list

### Admin Data Management (Updated Apr 2026)
- [x] Individual clear buttons for each data category:
  - All users (except admin)
  - Schedules, weekly events & check-ins
  - Matches, teams & solo ladder
  - Chatroom messages & announcements
  - Articles, scout reports & strategy chats
- [x] Clear All Data At Once (preserves admin account)

## Architecture
- Frontend: React 19, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, Motor (async MongoDB)
- AI: OpenAI GPT-5.2 + Gemini 3 Pro via Emergent integrations

## Backlog
### P2: Tournament brackets, WebSocket real-time chat, Mobile app
### Refactoring: Break server.py (2500+ lines) into separate route files
