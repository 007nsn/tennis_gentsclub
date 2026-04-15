# Tennis Buddies Club - PRD

## Original Problem Statement
Build a website for Sunday doubles tennis buddies to communicate, check schedules and teams for Round Robin matches with Team and Solo Ladder, chatbot, educational content, availability system, and admin management.

## User Personas
1. **Club Member**: Views schedules, marks availability for Sundays, submits match results, messages admin, learns from coaching content
2. **Admin/Coach**: Manages round robin scheduling based on availability, approves matches, creates educational content, edits player stats, configures club settings

## Core Requirements (Implemented Jan 2026)
- [x] User authentication (JWT-based, first user = admin)
- [x] Team Ladder with points system (+25 win, -15 loss)
- [x] **Solo Ladder with wins-only ranking** (each set win = 1 point)
- [x] Round Robin schedule management with calendar
- [x] **Availability system** - players mark available Sundays
- [x] **Round Robin auto-generation** based on available players with court assignments
- [x] Match result submission with admin approval workflow
- [x] AI Chatbot (GPT-5.2 via Emergent)
- [x] **Educational content** with articles, videos, infographics
- [x] **Sample educational content** (5 articles: serve, doubles strategy, fitness, rackets, volleys)
- [x] **Player-Admin messaging system**
- [x] **Admin panel enhancements**: edit player stats/names, club settings, send reminders
- [x] **Email notifications ready** (Resend configured, needs API key)
- [x] Announcements system
- [x] Responsive design with Shadcn UI

## Architecture
- Frontend: React 19, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, Motor (async MongoDB)
- Database: MongoDB
- AI: OpenAI GPT-5.2 via Emergent integrations
- Email: Resend (configured but needs API key)

## Key Features

### Availability & Round Robin
- Players mark availability for upcoming 4 Sundays
- Admin generates round robin doubles with rotating partners
- Automatic court assignment and time slots
- Email reminders for availability

### Admin Console
- Approve/reject match results
- Edit player stats and names
- Create teams, schedules, articles
- Configure club settings (courts, location, times)
- Send availability reminders

### Educational Content
- Categories: Technique, Strategy, Fitness, Equipment
- Content types: Articles, Videos, Infographics
- YouTube embed support
- Coach-authored materials

## Prioritized Backlog

### P1 (Next)
- Add Resend API key for email notifications
- More sample educational content

### P2 (Future)
- Match history analytics
- Season standings
- Mobile app
