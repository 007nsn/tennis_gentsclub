# Tennis Buddies Club - PRD

## Production URL
- Primary: https://tennis-buddies.me
- Fallback: https://match-mixer.emergent.host

## Implemented Features

### Core
- [x] JWT auth (httpOnly cookies, samesite=none, auto-seed admin)
- [x] Solo Ladder, Season Standings, Head-to-Head, Best Partnerships
- [x] Club Chatroom, Match History, Match Reminders
- [x] Opponent Scout + Strategy Bot (Gemini 3 Pro)
- [x] Support This Site (Venmo), Hawthorne NY weather

### RSVP & Scheduling
- [x] Auto-confirm RSVP (maxPlayers = courts x 4, overflow to bench)
- [x] Auto-replacement: bench player promoted on drop-out (FIFO)
- [x] Configurable RSVP open day/time (default Wed 7AM)
- [x] Admin: Close/Reopen RSVP, Add players from roster, Restore deleted events
- [x] Admin: Generate/Edit Round Robin schedule, isAdminOverridden flag
- [x] Sunday-only dropdown for event creation

### Push Notifications (Web Push API)
- [x] Browser push notifications when bench player promoted to confirmed
- [x] VAPID key-based Web Push subscription
- [x] Service worker (sw-push.js) for handling push events
- [x] "Enable Notifications" toggle on Schedule page (members only)
- [x] Auto-cleanup of expired subscriptions

### Content System (Improve)
- [x] File upload (PDF, DOCX, PPTX) via Object Storage
- [x] YouTube auto-thumbnails, modal overlay viewing
- [x] In-modal YouTube iframe + Google Docs viewer for PDF/PPTX
- [x] Masonry grid, lazy loading, dark gradient fallbacks
- [x] Downloads require login

### Admin
- [x] Per-tab delete controls, individual chat/announcement delete
- [x] Export members as Excel
- [x] Content form with drag-and-drop upload + mini previews

### Navigation
- [x] Public: Home, Schedule, Log In, Join Club only
- [x] Members: all tabs after login
- [x] "Doubles Tips" removed, unified under "Improve"

### Deployment
- [x] /health endpoints, CORS for tennis-buddies.me
- [x] Cookie samesite=none, FRONTEND_URL env variable
- [x] .gitignore cleaned, admin auto-seed

## Architecture
- Frontend: React 19, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, Motor (async MongoDB)
- AI: Gemini 3 Pro via Emergent integrations
- Storage: Emergent Object Storage
- Notifications: Web Push API + pywebpush

## Backlog
- P2: Tournament brackets, WebSocket real-time chat
- P2: server.py refactoring into route modules
