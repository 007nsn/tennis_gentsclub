import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { 
    getMatches, approveMatch, rejectMatch,
    getTeams, createTeam, deleteTeam, updateTeam,
    getSchedules, createSchedule, deleteSchedule, generateRoundRobin,
    getArticles, createArticle, deleteArticle, updateArticle,
    getAnnouncements, createAnnouncement, deleteAnnouncement,
    getUsers, updateUser,
    getSoloLadder, updateSoloPlayer,
    getAvailability, getUpcomingSundays,
    getSettings, updateSettings, seedSampleContent,
    createMatchReminder
} from '../lib/api';
import { toast } from 'sonner';
import { 
    Shield, Trophy, Calendar, BookOpen, Megaphone, Users, 
    Check, X, Trash2, Plus, Loader2, Edit2, Settings, Bell,
    Video, FileText, Image
} from 'lucide-react';

export default function Admin() {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('matches');
    const [loading, setLoading] = useState(false);

    // Data states
    const [pendingMatches, setPendingMatches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [articles, setArticles] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [users, setUsers] = useState([]);
    const [soloPlayers, setSoloPlayers] = useState([]);
    const [sundays, setSundays] = useState([]);
    const [availability, setAvailability] = useState({});
    const [settings, setSettings] = useState({ num_courts: 2, default_location: 'Local Tennis Club', match_duration_minutes: 30, default_start_time: '09:00' });

    // Form states
    const [teamForm, setTeamForm] = useState({ name: '', member_ids: [] });
    const [scheduleForm, setScheduleForm] = useState({ title: '', description: '', match_date: '', match_time: '09:00', location: '', teams: [] });
    const [articleForm, setArticleForm] = useState({ title: '', content: '', category: 'technique', content_type: 'article', video_url: '', image_url: '' });
    const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', priority: 'normal' });
    const [reminderForm, setReminderForm] = useState({ match_date: '', message: '' });
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [selectedSunday, setSelectedSunday] = useState('');

    useEffect(() => {
        if (!user || !isAdmin) {
            navigate('/');
            return;
        }
        loadAllData();
    }, [user, isAdmin, navigate]);

    const loadAllData = async () => {
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
                getSettings().catch(() => ({ data: settings }))
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

            // Load availability for each Sunday
            const availMap = {};
            for (const date of sundaysRes.data.sundays) {
                const availRes = await getAvailability(date);
                availMap[date] = availRes.data.filter(a => a.available);
            }
            setAvailability(availMap);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    // Match handlers
    const handleApproveMatch = async (matchId) => {
        try {
            await approveMatch(matchId);
            toast.success('Match approved!');
            setPendingMatches(prev => prev.filter(m => m.id !== matchId));
        } catch (error) {
            toast.error('Failed to approve match');
        }
    };

    const handleRejectMatch = async (matchId) => {
        try {
            await rejectMatch(matchId);
            toast.success('Match rejected');
            setPendingMatches(prev => prev.filter(m => m.id !== matchId));
        } catch (error) {
            toast.error('Failed to reject match');
        }
    };

    // Team handlers
    const handleCreateTeam = async (e) => {
        e.preventDefault();
        if (!teamForm.name || teamForm.member_ids.length === 0) {
            toast.error('Please fill all fields');
            return;
        }
        setLoading(true);
        try {
            const res = await createTeam(teamForm);
            setTeams(prev => [...prev, res.data]);
            setTeamForm({ name: '', member_ids: [] });
            toast.success('Team created!');
        } catch (error) {
            toast.error('Failed to create team');
        } finally {
            setLoading(false);
        }
    };

    // Schedule handlers
    const handleCreateSchedule = async (e) => {
        e.preventDefault();
        if (!scheduleForm.title || !scheduleForm.match_date || !scheduleForm.match_time || !scheduleForm.location) {
            toast.error('Please fill all required fields');
            return;
        }
        setLoading(true);
        try {
            const res = await createSchedule(scheduleForm);
            setSchedules(prev => [...prev, res.data]);
            setScheduleForm({ title: '', description: '', match_date: '', match_time: '09:00', location: '', teams: [] });
            toast.success('Schedule created!');
        } catch (error) {
            toast.error('Failed to create schedule');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateRoundRobin = async () => {
        if (!selectedSunday) {
            toast.error('Please select a Sunday');
            return;
        }
        const availCount = (availability[selectedSunday] || []).length;
        if (availCount < 2) {
            toast.error(`Need at least 2 available players (currently ${availCount})`);
            return;
        }
        setLoading(true);
        try {
            const res = await generateRoundRobin({
                date: selectedSunday,
                num_courts: settings.num_courts,
                match_duration_minutes: settings.match_duration_minutes,
                start_time: settings.default_start_time
            });
            toast.success(`Round robin generated with ${res.data.player_count} players! Posted to chatroom.`);
            loadAllData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to generate round robin');
        } finally {
            setLoading(false);
        }
    };

    // Match Reminder handler
    const handleSendReminder = async (e) => {
        e.preventDefault();
        if (!reminderForm.match_date || !reminderForm.message) {
            toast.error('Please fill in date and message');
            return;
        }
        setLoading(true);
        try {
            await createMatchReminder(reminderForm);
            toast.success('Reminder posted to chatroom!');
            setReminderForm({ match_date: '', message: '' });
        } catch (error) {
            toast.error('Failed to post reminder');
        } finally {
            setLoading(false);
        }
    };

    // Article handlers
    const handleCreateArticle = async (e) => {
        e.preventDefault();
        if (!articleForm.title || !articleForm.content || !articleForm.category) {
            toast.error('Please fill all required fields');
            return;
        }
        setLoading(true);
        try {
            const res = await createArticle(articleForm);
            setArticles(prev => [res.data, ...prev]);
            setArticleForm({ title: '', content: '', category: 'technique', content_type: 'article', video_url: '', image_url: '' });
            toast.success('Article created!');
        } catch (error) {
            toast.error('Failed to create article');
        } finally {
            setLoading(false);
        }
    };

    // Announcement handlers
    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();
        if (!announcementForm.title || !announcementForm.content) {
            toast.error('Please fill all required fields');
            return;
        }
        setLoading(true);
        try {
            const res = await createAnnouncement(announcementForm);
            setAnnouncements(prev => [res.data, ...prev]);
            setAnnouncementForm({ title: '', content: '', priority: 'normal' });
            toast.success('Announcement posted!');
        } catch (error) {
            toast.error('Failed to create announcement');
        } finally {
            setLoading(false);
        }
    };

    // Player/User edit handlers
    const handleUpdatePlayer = async (playerId, wins) => {
        try {
            await updateSoloPlayer(playerId, { wins: parseInt(wins) });
            toast.success('Player updated!');
            setEditingPlayer(null);
            loadAllData();
        } catch (error) {
            toast.error('Failed to update player');
        }
    };

    const handleUpdateUser = async (userId, name) => {
        try {
            await updateUser(userId, { name });
            toast.success('User updated!');
            setEditingUser(null);
            loadAllData();
        } catch (error) {
            toast.error('Failed to update user');
        }
    };

    // Settings handler
    const handleUpdateSettings = async () => {
        try {
            await updateSettings(settings);
            toast.success('Settings saved!');
        } catch (error) {
            toast.error('Failed to save settings');
        }
    };

    // Send reminder
    const handleSendReminder = async (date) => {
        try {
            const res = await sendAvailabilityReminder(date);
            toast.success(res.data.message);
        } catch (error) {
            toast.error('Failed to send reminder');
        }
    };

    // Seed content
    const handleSeedContent = async () => {
        try {
            const res = await seedSampleContent();
            toast.success(res.data.message);
            loadAllData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Content already exists');
        }
    };

    if (!user || !isAdmin) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="admin-page">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-8 h-8 text-[#0051BA]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl font-black uppercase tracking-tight text-[#0F172A]">
                        Admin Panel
                    </h1>
                </div>
                <p className="text-gray-600">Manage matches, teams, schedules, content, and settings</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border border-gray-100 p-1 mb-6 flex-wrap h-auto gap-1">
                    <TabsTrigger value="matches" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        Matches
                        {pendingMatches.length > 0 && <Badge className="bg-[#E06040] text-white ml-1">{pendingMatches.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="roundrobin" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Round Robin
                    </TabsTrigger>
                    <TabsTrigger value="players" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Players
                    </TabsTrigger>
                    <TabsTrigger value="content" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Content
                    </TabsTrigger>
                    <TabsTrigger value="announcements" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <Megaphone className="w-4 h-4" />
                        Announcements
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                {/* Pending Matches */}
                <TabsContent value="matches">
                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <CardHeader>
                            <CardTitle>Pending Match Results</CardTitle>
                            <CardDescription>Review and approve submitted match results</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {pendingMatches.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                                    <p>No pending matches to review</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingMatches.map(match => (
                                        <div key={match.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="font-medium">
                                                    {match.match_type === 'team' 
                                                        ? `${match.team_a_name} vs ${match.team_b_name}`
                                                        : `${match.player_a_name} vs ${match.player_b_name}`
                                                    }
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Score: {match.score_a} - {match.score_b} • {new Date(match.match_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handleApproveMatch(match.id)}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleRejectMatch(match.id)}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Round Robin Generation */}
                <TabsContent value="roundrobin">
                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Generate Round Robin Schedule</CardTitle>
                                <CardDescription>Auto-generate tournament matches with court assignments based on availability</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Select Sunday</Label>
                                    <Select value={selectedSunday} onValueChange={setSelectedSunday}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a date" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sundays.map(date => (
                                                <SelectItem key={date} value={date}>
                                                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                    {' '}({(availability[date] || []).length} players)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedSunday && (
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="font-medium mb-2">Available Players ({(availability[selectedSunday] || []).length})</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(availability[selectedSunday] || []).map(player => (
                                                <Badge key={player.user_id} variant="outline">{player.user_name}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button onClick={handleGenerateRoundRobin} disabled={loading || !selectedSunday} className="btn-primary w-full">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Round Robin & Court Assignments'}
                                </Button>
                                <p className="text-xs text-gray-500 text-center">
                                    Each player plays against every other player once. Schedule will be posted to the chatroom.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Manual Schedule</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateSchedule} className="space-y-4">
                                    <Input value={scheduleForm.title} onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })} placeholder="Title" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input type="date" value={scheduleForm.match_date} onChange={(e) => setScheduleForm({ ...scheduleForm, match_date: e.target.value })} />
                                        <Input type="time" value={scheduleForm.match_time} onChange={(e) => setScheduleForm({ ...scheduleForm, match_time: e.target.value })} />
                                    </div>
                                    <Input value={scheduleForm.location} onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })} placeholder="Location" />
                                    <Textarea value={scheduleForm.description} onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })} placeholder="Description (optional)" />
                                    <Button type="submit" className="w-full btn-primary" disabled={loading}>
                                        <Plus className="w-4 h-4 mr-2" />Create Schedule
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Players Management */}
                <TabsContent value="players">
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Edit Players */}
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Solo Ladder Players</CardTitle>
                                <CardDescription>Edit player names and wins</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {soloPlayers.map((player, idx) => (
                                        <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold text-[#0051BA]">#{idx + 1}</span>
                                                {editingPlayer === player.id ? (
                                                    <Input
                                                        type="number"
                                                        defaultValue={player.wins}
                                                        className="w-20"
                                                        onBlur={(e) => handleUpdatePlayer(player.id, e.target.value)}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div>
                                                        <div className="font-medium">{player.name}</div>
                                                        <div className="text-sm text-gray-500">{player.wins} wins</div>
                                                    </div>
                                                )}
                                            </div>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingPlayer(editingPlayer === player.id ? null : player.id)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Edit Users */}
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Club Members</CardTitle>
                                <CardDescription>Edit member names</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {users.map(u => (
                                        <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                {u.role === 'admin' && <Badge className="bg-[#0051BA]">Admin</Badge>}
                                                {editingUser === u.id ? (
                                                    <Input
                                                        defaultValue={u.name}
                                                        className="w-40"
                                                        onBlur={(e) => handleUpdateUser(u.id, e.target.value)}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div>
                                                        <div className="font-medium">{u.name}</div>
                                                        <div className="text-sm text-gray-500">{u.email}</div>
                                                    </div>
                                                )}
                                            </div>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingUser(editingUser === u.id ? null : u.id)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Teams */}
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Create Team</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateTeam} className="space-y-4">
                                    <Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="Team Name" />
                                    <Select onValueChange={(v) => { if (!teamForm.member_ids.includes(v)) setTeamForm({ ...teamForm, member_ids: [...teamForm.member_ids, v] }); }}>
                                        <SelectTrigger><SelectValue placeholder="Add member" /></SelectTrigger>
                                        <SelectContent>
                                            {users.map(u => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex flex-wrap gap-2">
                                        {teamForm.member_ids.map(id => {
                                            const member = users.find(u => u.id === id);
                                            return (
                                                <Badge key={id} variant="secondary" className="pr-1">
                                                    {member?.name}
                                                    <button type="button" onClick={() => setTeamForm({ ...teamForm, member_ids: teamForm.member_ids.filter(m => m !== id) })} className="ml-1 hover:text-red-500">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                    <Button type="submit" className="w-full btn-primary" disabled={loading}><Plus className="w-4 h-4 mr-2" />Create Team</Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader><CardTitle>Existing Teams</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {teams.map(team => (
                                        <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="font-medium">{team.name}</div>
                                                <div className="text-sm text-gray-500">{team.member_names?.join(' & ')}</div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteTeam(team.id).then(loadAllData)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Content Management */}
                <TabsContent value="content">
                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Add Educational Content</CardTitle>
                                <CardDescription>Create articles, videos, or infographics</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateArticle} className="space-y-4">
                                    <Input value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} placeholder="Title" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Select value={articleForm.category} onValueChange={(v) => setArticleForm({ ...articleForm, category: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="technique">Technique</SelectItem>
                                                <SelectItem value="strategy">Strategy</SelectItem>
                                                <SelectItem value="fitness">Fitness</SelectItem>
                                                <SelectItem value="equipment">Equipment</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={articleForm.content_type} onValueChange={(v) => setArticleForm({ ...articleForm, content_type: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="article"><FileText className="w-4 h-4 inline mr-2" />Article</SelectItem>
                                                <SelectItem value="video"><Video className="w-4 h-4 inline mr-2" />Video</SelectItem>
                                                <SelectItem value="infographic"><Image className="w-4 h-4 inline mr-2" />Infographic</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Textarea value={articleForm.content} onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })} placeholder="Content..." className="min-h-32" />
                                    <Input value={articleForm.video_url} onChange={(e) => setArticleForm({ ...articleForm, video_url: e.target.value })} placeholder="YouTube URL (optional)" />
                                    <Input value={articleForm.image_url} onChange={(e) => setArticleForm({ ...articleForm, image_url: e.target.value })} placeholder="Image URL (optional)" />
                                    <Button type="submit" className="w-full btn-primary" disabled={loading}><Plus className="w-4 h-4 mr-2" />Add Content</Button>
                                </form>
                                <div className="mt-4 pt-4 border-t">
                                    <Button variant="outline" onClick={handleSeedContent} className="w-full">
                                        <BookOpen className="w-4 h-4 mr-2" />Add Sample Content
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader><CardTitle>Existing Content</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                    {articles.map(article => (
                                        <div key={article.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                {article.content_type === 'video' && <Video className="w-5 h-5 text-red-500" />}
                                                {article.content_type === 'infographic' && <Image className="w-5 h-5 text-purple-500" />}
                                                {article.content_type === 'article' && <FileText className="w-5 h-5 text-blue-500" />}
                                                <div>
                                                    <div className="font-medium">{article.title}</div>
                                                    <div className="text-sm text-gray-500">{article.category}</div>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteArticle(article.id).then(loadAllData)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Announcements */}
                <TabsContent value="announcements">
                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader><CardTitle>Post Announcement</CardTitle></CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                                    <Input value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} placeholder="Title" />
                                    <Textarea value={announcementForm.content} onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })} placeholder="Content..." />
                                    <Select value={announcementForm.priority} onValueChange={(v) => setAnnouncementForm({ ...announcementForm, priority: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button type="submit" className="w-full btn-primary" disabled={loading}><Plus className="w-4 h-4 mr-2" />Post</Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader><CardTitle>Recent Announcements</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {announcements.map(ann => (
                                        <div key={ann.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {ann.title}
                                                    {ann.priority === 'urgent' && <Badge className="bg-[#E06040]">Urgent</Badge>}
                                                </div>
                                                <div className="text-sm text-gray-500">{new Date(ann.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteAnnouncement(ann.id).then(loadAllData)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Settings */}
                <TabsContent value="settings">
                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-xl">
                        <CardHeader>
                            <CardTitle>Club Settings</CardTitle>
                            <CardDescription>Configure court and schedule defaults</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Number of Courts</Label>
                                <Input type="number" min="1" max="10" value={settings.num_courts} onChange={(e) => setSettings({ ...settings, num_courts: parseInt(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Default Location</Label>
                                <Input value={settings.default_location} onChange={(e) => setSettings({ ...settings, default_location: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Match Duration (minutes)</Label>
                                <Input type="number" min="15" max="120" value={settings.match_duration_minutes} onChange={(e) => setSettings({ ...settings, match_duration_minutes: parseInt(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Default Start Time</Label>
                                <Input type="time" value={settings.default_start_time} onChange={(e) => setSettings({ ...settings, default_start_time: e.target.value })} />
                            </div>
                            <Button onClick={handleUpdateSettings} className="w-full btn-primary">Save Settings</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
