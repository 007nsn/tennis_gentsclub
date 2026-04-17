# Tennis Buddies Club - PRD

## Original Problem Statement
Build a website for Sunday doubles tennis buddies with Solo Ladder, Season Standings, chatroom, match history, AI doubles coaching (Opponent Scout & Live Strategy Bot), and a dynamic Weekly Check-In system with an Admin-approved Doubles Round Robin algorithm that handles byes and partner rotations.

## Implemented Features

### Core Features
- [x] User authentication (JWT + httpOnly cookies, auto-seed admin on startup)
- [x] Solo Ladder (wins-only ranking)
- [x] Match result submission with admin approval
- [x] Match History with player filter and stats
- [x] Head-to-Head Records - Player comparison + full W-L matrix
- [x] Best Partnerships page (auto-generated from schedules)
- [x] Club Chatroom, AI Chatbot (GPT-5.2)
- [x] Opponent Scout + Strategy Bot (Gemini 3 Pro with user's playbook)
- [x] Season Standings, Match Reminders
- [x] Admin Panel (6 sub-components), Educational/Improve page
- [x] Hawthorne NY weather shortcut
- [x] Support This Site (Venmo link)
- [x] Phone number field for user registration

### RSVP & Scheduling
- [x] Weekly RSVP opens on configurable day/time (default: Wednesday 7AM US/Eastern)
- [x] Admin can change RSVP open day and time via Settings
- [x] Admin can Close/Reopen RSVP — late players join Bench (waiting list)
- [x] Confirmed players can Drop Out — first Bench player auto-promoted (FIFO)
- [x] Admin can add external non-member players by name
- [x] Doubles Round Robin schedule generation with partner rotation and byes

### Admin Data Management
- [x] Individual clear buttons for each data category (users, events, matches, chat, content)
- [x] Clear All Data At Once (preserves admin account)

### Content & File Upload (Apr 2026)
- [x] File upload via Emergent Object Storage (PDF, DOCX, PPTX, images)
- [x] Drag & drop upload in Admin Content tab
- [x] YouTube video embed support
- [x] PDF inline preview on article detail page
- [x] Image preview for uploaded images
- [x] Download button for all attached files
- [x] "Document" content type added

### Deployment Fixes
- [x] /health and /api/health endpoints for Kubernetes health checks
- [x] Hardcoded preview URLs replaced with FRONTEND_URL env variable
- [x] .gitignore cleaned to not block .env files
- [x] Admin auto-seed on startup (creates/fixes admin account)
- [x] Fixed getTeams reference error on Home page

## Architecture
- Frontend: React 19, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, Motor (async MongoDB)
- AI: OpenAI GPT-5.2 + Gemini 3 Pro via Emergent integrations
- Storage: Emergent Object Storage for file uploads

## Backlog
### P2: Tournament brackets, WebSocket real-time chat, Mobile app
### Refactoring: Break server.py (2700+ lines) into separate route files
