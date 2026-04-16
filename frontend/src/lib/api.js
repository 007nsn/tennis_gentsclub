import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Add auth token to requests (fallback for non-cookie auth)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const getUsers = () => api.get('/users');
export const updateUser = (id, data) => api.put(`/users/${id}`, data);

// Teams
export const createTeam = (data) => api.post('/teams', data);
export const getTeams = () => api.get('/teams');
export const updateTeam = (id, data) => api.put(`/teams/${id}`, data);
export const deleteTeam = (id) => api.delete(`/teams/${id}`);

// Solo Ladder
export const getSoloLadder = () => api.get('/solo-ladder');
export const updateSoloPlayer = (id, data) => api.put(`/solo-ladder/${id}`, data);

// Matches
export const submitMatch = (data) => api.post('/matches', data);
export const getMatches = (status) => api.get('/matches', { params: { status } });
export const approveMatch = (id) => api.put(`/matches/${id}/approve`);
export const rejectMatch = (id) => api.put(`/matches/${id}/reject`);

// Schedules
export const createSchedule = (data) => api.post('/schedules', data);
export const getSchedules = () => api.get('/schedules');
export const deleteSchedule = (id) => api.delete(`/schedules/${id}`);
export const generateRoundRobin = (data) => api.post('/schedules/generate-round-robin', data);

// Articles
export const createArticle = (data) => api.post('/articles', data);
export const getArticles = (category, contentType) => api.get('/articles', { params: { category, content_type: contentType } });
export const getArticle = (id) => api.get(`/articles/${id}`);
export const updateArticle = (id, data) => api.put(`/articles/${id}`, data);
export const deleteArticle = (id) => api.delete(`/articles/${id}`);

// Announcements
export const createAnnouncement = (data) => api.post('/announcements', data);
export const getAnnouncements = () => api.get('/announcements');
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);

// Chat
export const sendChatMessage = (message) => api.post('/chat', { message });
export const getChatHistory = () => api.get('/chat/history');

// Availability
export const setAvailability = (data) => api.post('/availability', data);
export const getAvailability = (date) => api.get('/availability', { params: { date } });
export const getUpcomingSundays = () => api.get('/availability/upcoming-sundays');

// Messages (Direct)
export const sendMessage = (data) => api.post('/messages', data);
export const getMessages = () => api.get('/messages');
export const markMessageRead = (id) => api.put(`/messages/${id}/read`);
export const getUnreadCount = () => api.get('/messages/unread-count');

// Chatroom (Group)
export const sendChatroomMessage = (content) => api.post('/chatroom', { content });
export const getChatroomMessages = (limit = 100) => api.get('/chatroom', { params: { limit } });

// Match History & Stats
export const getMatchHistory = (playerId) => api.get('/match-history', { params: { player_id: playerId } });
export const getPlayerStats = (playerId) => api.get(`/player-stats/${playerId}`);
export const getAllPlayerStats = () => api.get('/player-stats');

// Season Standings
export const getSeasonStandings = () => api.get('/season-standings');

// Match Reminders
export const createMatchReminder = (data) => api.post('/match-reminders', data);
export const getMatchReminders = () => api.get('/match-reminders');

// Opponent Scout (Gemini AI)
export const scoutOpponent = (data) => api.post('/opponent-scout', data);
export const getScoutReports = () => api.get('/scout-reports');

// Strategy Bot (Gemini AI)
export const sendStrategyMessage = (message, sessionId) => api.post('/strategy-bot', { message, session_id: sessionId });
export const getStrategyHistory = (sessionId) => api.get(`/strategy-bot/history/${sessionId}`);
export const newStrategySession = () => api.post('/strategy-bot/new-session');

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

// Stats
export const getStats = () => api.get('/stats');

// Admin actions
export const sendAvailabilityReminder = (date) => api.post('/admin/send-availability-reminder', null, { params: { date } });
export const seedSampleContent = () => api.post('/admin/seed-content');

// Weekly Events & Check-In
export const createWeeklyEvent = (data) => api.post('/weekly-events', data);
export const getWeeklyEvents = () => api.get('/weekly-events');
export const getUpcomingWeeklyEvents = () => api.get('/weekly-events/upcoming');
export const getWeeklyEvent = (id) => api.get(`/weekly-events/${id}`);
export const deleteWeeklyEvent = (id) => api.delete(`/weekly-events/${id}`);
export const submitCheckIn = (data) => api.post('/checkins', data);
export const getEventCheckIns = (eventId) => api.get(`/checkins/${eventId}`);
export const getMyCheckIn = (eventId) => api.get(`/checkins/${eventId}/me`);
export const approvePlayers = (eventId, data) => api.post(`/weekly-events/${eventId}/approve`, data);
export const adminOverride = (eventId, data) => api.post(`/weekly-events/${eventId}/override`, data);
export const cancelPlayerSpot = (eventId) => api.post(`/weekly-events/${eventId}/cancel-player`);
export const generateDoublesSchedule = (eventId, data) => api.post(`/weekly-events/${eventId}/generate-schedule`, data);
export const getCheckInWindow = (eventId) => api.get(`/weekly-events/${eventId}/checkin-window`);

export default api;
