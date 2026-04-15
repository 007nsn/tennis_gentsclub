# Tennis Buddies Club - PRD

## Original Problem Statement
Build a website for Sunday doubles tennis buddies to communicate, check schedules and teams for Round Robin matches. Features include Team and Solo Ladder, chatbot, and educational page for tennis skills improvement.

## User Personas
1. **Club Member**: Registers, views schedules, checks ladder rankings, submits match results, uses chatbot
2. **Admin/Coach**: Manages teams, schedules, approves match results, creates educational content

## Core Requirements
- User authentication (JWT-based)
- Team Ladder with points system
- Solo Ladder with wins-only ranking (each win = 1 point)
- Round Robin schedule management
- Match result submission with admin approval
- AI Chatbot (GPT-5.2)
- Educational content (articles + videos)
- Announcements system

## What's Been Implemented (Jan 2026)
- [x] Full auth system (register/login/JWT)
- [x] First user = admin role
- [x] Team Ladder (points: +25 win, -15 loss)
- [x] Solo Ladder (wins only, 1 win = 1 point)
- [x] Schedule page with calendar
- [x] Match submission & approval workflow
- [x] AI Chatbot with OpenAI GPT-5.2
- [x] Education page with categories
- [x] Admin panel (teams, schedules, articles, announcements)
- [x] Responsive design with Shadcn UI

## Architecture
- Frontend: React 19, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, Motor (async MongoDB)
- Database: MongoDB
- AI: OpenAI GPT-5.2 via Emergent integrations

## Prioritized Backlog
### P0 (Done)
- Auth, Ladders, Schedule, Chatbot, Admin

### P1 (Next)
- Email notifications for match approvals
- Sample educational content
- Profile editing

### P2 (Future)
- Challenge system for ladder
- Match history analytics
- Mobile app
