import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
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

// Teams
export const createTeam = (data) => api.post('/teams', data);
export const getTeams = () => api.get('/teams');
export const deleteTeam = (id) => api.delete(`/teams/${id}`);

// Solo Ladder
export const getSoloLadder = () => api.get('/solo-ladder');

// Matches
export const submitMatch = (data) => api.post('/matches', data);
export const getMatches = (status) => api.get('/matches', { params: { status } });
export const approveMatch = (id) => api.put(`/matches/${id}/approve`);
export const rejectMatch = (id) => api.put(`/matches/${id}/reject`);

// Schedules
export const createSchedule = (data) => api.post('/schedules', data);
export const getSchedules = () => api.get('/schedules');
export const deleteSchedule = (id) => api.delete(`/schedules/${id}`);

// Articles
export const createArticle = (data) => api.post('/articles', data);
export const getArticles = (category) => api.get('/articles', { params: { category } });
export const getArticle = (id) => api.get(`/articles/${id}`);
export const deleteArticle = (id) => api.delete(`/articles/${id}`);

// Announcements
export const createAnnouncement = (data) => api.post('/announcements', data);
export const getAnnouncements = () => api.get('/announcements');
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);

// Chat
export const sendChatMessage = (message) => api.post('/chat', { message });
export const getChatHistory = () => api.get('/chat/history');

// Stats
export const getStats = () => api.get('/stats');

export default api;
