import { useState, useEffect, useCallback } from 'react';
import {
    getMatches, approveMatch, rejectMatch,
    getTeams, createTeam, deleteTeam,
    getSchedules, createSchedule,
    getArticles, createArticle, deleteArticle,
    getAnnouncements, createAnnouncement, deleteAnnouncement,
    getUsers, updateUser,
    getSoloLadder, updateSoloPlayer,
    getAvailability, getUpcomingSundays,
    getSettings, updateSettings, seedSampleContent,
    createMatchReminder
} from '../lib/api';
import { toast } from 'sonner';

export function useAdminData() {
    const [loading, setLoading] = useState(false);
    const [pendingMatches, setPendingMatches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [articles, setArticles] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [users, setUsers] = useState([]);
    const [soloPlayers, setSoloPlayers] = useState([]);
    const [sundays, setSundays] = useState([]);
    const [availability, setAvailability] = useState({});
    const [settings, setSettings] = useState({
        num_courts: 2,
        default_location: 'Local Tennis Club',
        match_duration_minutes: 30,
        default_start_time: '09:00'
    });

    const loadAllData = useCallback(async () => {
        try {
            const [matchesRes, teamsRes, schedulesRes, articlesRes, announcementsRes, usersRes, soloRes, sundaysRes, settingsRes] = await Promise.all([
                getMatches('pending'),
                getTeams(),
                getSchedules(),
                getArticles(),
                getAnnouncements(),
                getUsers(),
                getSoloLadder(),
                getUpcomingSundays(),
                getSettings().catch(() => ({ data: { num_courts: 2, default_location: 'Local Tennis Club', match_duration_minutes: 30, default_start_time: '09:00' } }))
            ]);
            setPendingMatches(matchesRes.data);
            setTeams(teamsRes.data);
            setSchedules(schedulesRes.data);
            setArticles(articlesRes.data);
            setAnnouncements(announcementsRes.data);
            setUsers(usersRes.data);
            setSoloPlayers(soloRes.data);
            setSundays(sundaysRes.data.sundays);
            setSettings(settingsRes.data);

            const availMap = {};
            for (const date of sundaysRes.data.sundays) {
                const availRes = await getAvailability(date);
                availMap[date] = availRes.data.filter(a => a.available);
            }
            setAvailability(availMap);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }, []);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const handleApproveMatch = useCallback(async (matchId) => {
        try {
            await approveMatch(matchId);
            toast.success('Match approved!');
            setPendingMatches(prev => prev.filter(m => m.id !== matchId));
        } catch (error) {
            toast.error('Failed to approve match');
        }
    }, []);

    const handleRejectMatch = useCallback(async (matchId) => {
        try {
            await rejectMatch(matchId);
            toast.success('Match rejected');
            setPendingMatches(prev => prev.filter(m => m.id !== matchId));
        } catch (error) {
            toast.error('Failed to reject match');
        }
    }, []);

    const handleCreateTeam = useCallback(async (teamForm) => {
        setLoading(true);
        try {
            const res = await createTeam(teamForm);
            setTeams(prev => [...prev, res.data]);
            toast.success('Team created!');
            return true;
        } catch (error) {
            toast.error('Failed to create team');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const handleCreateSchedule = useCallback(async (scheduleForm) => {
        setLoading(true);
        try {
            const res = await createSchedule(scheduleForm);
            setSchedules(prev => [...prev, res.data]);
            toast.success('Schedule created!');
            return true;
        } catch (error) {
            toast.error('Failed to create schedule');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const handleCreateArticle = useCallback(async (articleForm) => {
        setLoading(true);
        try {
            const res = await createArticle(articleForm);
            setArticles(prev => [res.data, ...prev]);
            toast.success('Article created!');
            return true;
        } catch (error) {
            toast.error('Failed to create article');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const handleCreateAnnouncement = useCallback(async (announcementForm) => {
        setLoading(true);
        try {
            const res = await createAnnouncement(announcementForm);
            setAnnouncements(prev => [res.data, ...prev]);
            toast.success('Announcement posted!');
            return true;
        } catch (error) {
            toast.error('Failed to create announcement');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const handleUpdatePlayer = useCallback(async (playerId, wins) => {
        try {
            await updateSoloPlayer(playerId, { wins: parseInt(wins) });
            toast.success('Player updated!');
            loadAllData();
        } catch (error) {
            toast.error('Failed to update player');
        }
    }, [loadAllData]);

    const handleUpdateUser = useCallback(async (userId, name) => {
        try {
            await updateUser(userId, { name });
            toast.success('User updated!');
            loadAllData();
        } catch (error) {
            toast.error('Failed to update user');
        }
    }, [loadAllData]);

    const handleUpdateSettings = useCallback(async (newSettings) => {
        try {
            await updateSettings(newSettings);
            toast.success('Settings saved!');
        } catch (error) {
            toast.error('Failed to save settings');
        }
    }, []);

    const handleSeedContent = useCallback(async () => {
        try {
            const res = await seedSampleContent();
            toast.success(res.data.message);
            loadAllData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Content already exists');
        }
    }, [loadAllData]);

    const handleSendReminder = useCallback(async (reminderForm) => {
        setLoading(true);
        try {
            await createMatchReminder(reminderForm);
            toast.success('Reminder posted to chatroom!');
            return true;
        } catch (error) {
            toast.error('Failed to post reminder');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDeleteTeam = useCallback(async (teamId) => {
        await deleteTeam(teamId);
        loadAllData();
    }, [loadAllData]);

    const handleDeleteArticle = useCallback(async (articleId) => {
        await deleteArticle(articleId);
        loadAllData();
    }, [loadAllData]);

    const handleDeleteAnnouncement = useCallback(async (annId) => {
        await deleteAnnouncement(annId);
        loadAllData();
    }, [loadAllData]);

    return {
        loading,
        pendingMatches,
        teams,
        schedules,
        articles,
        announcements,
        users,
        soloPlayers,
        sundays,
        availability,
        settings,
        setSettings,
        loadAllData,
        handleApproveMatch,
        handleRejectMatch,
        handleCreateTeam,
        handleCreateSchedule,
        handleCreateArticle,
        handleCreateAnnouncement,
        handleUpdatePlayer,
        handleUpdateUser,
        handleUpdateSettings,
        handleSeedContent,
        handleSendReminder,
        handleDeleteTeam,
        handleDeleteArticle,
        handleDeleteAnnouncement,
    };
}
