# Tennis Buddies Club - PRD

## Original Problem Statement
Build a website for Sunday doubles tennis buddies with Solo Ladder, Season Standings, chatroom, match history, AI doubles coaching (Opponent Scout & Live Strategy Bot), and a dynamic Weekly Check-In system with an Admin-approved Doubles Round Robin algorithm that handles byes and partner rotations.

## Production URL
- Primary: https://tennis-buddies.me
- Fallback: https://match-mixer.emergent.host

## Implemented Features

### Core
- [x] JWT auth (httpOnly cookies, samesite=none, auto-seed admin)
- [x] Solo Ladder, Season Standings, Head-to-Head, Best Partnerships
- [x] Club Chatroom, Match History, Match Reminders
- [x] Opponent Scout + Strategy Bot (Gemini 3 Pro)
- [x] Hawthorne NY weather link, Support This Site (Venmo)

### RSVP & Scheduling
- [x] Auto-confirm RSVP (maxPlayers = courts × 4, overflow → bench)
- [x] Auto-replacement: bench player promoted on drop-out (FIFO)
- [x] RSVP opens on configurable day/time (default: Wed 7AM)
- [x] Admin: Close/Reopen RSVP, Add players from roster dropdown
- [x] Admin: Restore deleted events, Generate/Edit Round Robin schedule
- [x] isAdminOverridden flag disables auto-regeneration
- [x] Sunday-only dropdown for event creation (fixed Monday bug)

### Content System (Improve)
- [x] File upload (PDF, DOCX, PPTX) via Emergent Object Storage
- [x] YouTube auto-thumbnails (maxresdefault with fallback)
- [x] Modal overlay for content viewing (no page redirect)
- [x] In-modal YouTube iframe + Google Docs viewer for PDF/PPTX
- [x] Masonry CSS grid layout, lazy loading
- [x] Dark gradient fallback for missing thumbnails (no blue placeholders)
- [x] Downloads require login

### Admin
- [x] Per-tab delete controls (users, events, matches, chat, content)
- [x] Individual delete for chat messages and announcements
- [x] Export members as Excel (name, email, phone)
- [x] Admin content form with drag-and-drop upload + mini previews
- [x] Club/RSVP settings, Reset Everything nuclear option

### Navigation
- [x] Public sees only: Home, Schedule, Log In, Join Club
- [x] Members see all tabs after login
- [x] Footer: member-only links hidden for public
- [x] "Doubles Tips" removed, unified under "Improve"

### Deployment
- [x] /health + /api/health endpoints
- [x] CORS for tennis-buddies.me + match-mixer.emergent.host
- [x] Cookie samesite=none for custom domain
- [x] FRONTEND_URL env variable (no hardcoded URLs)
- [x] .gitignore cleaned, admin auto-seed on startup

## Architecture
- Frontend: React 19, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, Motor (async MongoDB)
- AI: Gemini 3 Pro via Emergent integrations
- Storage: Emergent Object Storage

## Backlog
- P2: Tournament brackets, WebSocket real-time chat
- P2: server.py refactoring into route modules
