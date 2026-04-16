# Tennis Buddies Club - PRD

## Original Problem Statement
Build a website for Sunday doubles tennis buddies with Team/Solo Ladder, Round Robin scheduling, chatroom communication, educational content, Season Standings, Match Reminders, Opponent Scout (AI), and Live Strategy Bot (AI).

## Implemented Features

### Core Features
- [x] User authentication (JWT + httpOnly cookies)
- [x] Team Ladder, Solo Ladder (wins-only ranking)
- [x] Match result submission with admin approval
- [x] Match History with player filter and stats
- [x] Club Chatroom (group chat)
- [x] Admin Panel (6 split sub-components)
- [x] Educational/Improve page (admin-uploaded content only, supports survey type)
- [x] AI Chatbot (GPT-5.2), Opponent Scout + Strategy Bot (Gemini 3.1 Pro with user's playbook)
- [x] Season Standings, Match Reminders

### Weekly Check-In & Doubles Round Robin
- [x] WeeklyEvent + CheckIn database models
- [x] Time-gated check-in (opens **Monday** 7AM US/Eastern)
- [x] Admin approval flow (approved list + waitlist + auto-promote)
- [x] Doubles round robin algorithm (2v2, partner rotation, fair byes)
- [x] Generated schedule displays on /schedule page

### Data Management & Location
- [x] Admin "Clear Test Data" button (wipes all test data, preserves admin)
- [x] Hawthorne, NY weather shortcut on schedule page

## Architecture
- Frontend: React 19, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, Motor (async MongoDB)
- Database: MongoDB
- AI: OpenAI GPT-5.2 + Gemini 3.1 Pro via Emergent integrations

## Prioritized Backlog
### P1: Player head-to-head records
### P2: Mobile app, Tournament brackets, Real-time chat (WebSocket)
