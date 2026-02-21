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
    getTeams, createTeam, deleteTeam,
    getSchedules, createSchedule, deleteSchedule,
    getArticles, createArticle, deleteArticle,
    getAnnouncements, createAnnouncement, deleteAnnouncement,
    getUsers
} from '../lib/api';
import { toast } from 'sonner';
import { 
    Shield, Trophy, Calendar, BookOpen, Megaphone, Users, 
    Check, X, Trash2, Plus, Loader2 
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

    // Form states
    const [teamForm, setTeamForm] = useState({ name: '', member_ids: [] });
    const [scheduleForm, setScheduleForm] = useState({ title: '', description: '', match_date: '', match_time: '', location: '', teams: [] });
    const [articleForm, setArticleForm] = useState({ title: '', content: '', category: 'technique', video_url: '', image_url: '' });
    const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', priority: 'normal' });

    useEffect(() => {
        if (!user || !isAdmin) {
            navigate('/');
            return;
        }
        loadAllData();
    }, [user, isAdmin, navigate]);

    const loadAllData = async () => {
        try {
            const [matchesRes, teamsRes, schedulesRes, articlesRes, announcementsRes, usersRes] = await Promise.all([
                getMatches('pending'),
                getTeams(),
                getSchedules(),
                getArticles(),
                getAnnouncements(),
                getUsers()
            ]);
            setPendingMatches(matchesRes.data);
            setTeams(teamsRes.data);
            setSchedules(schedulesRes.data);
            setArticles(articlesRes.data);
            setAnnouncements(announcementsRes.data);
            setUsers(usersRes.data);
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

    const handleDeleteTeam = async (teamId) => {
        try {
            await deleteTeam(teamId);
            setTeams(prev => prev.filter(t => t.id !== teamId));
            toast.success('Team deleted');
        } catch (error) {
            toast.error('Failed to delete team');
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
            setScheduleForm({ title: '', description: '', match_date: '', match_time: '', location: '', teams: [] });
            toast.success('Schedule created!');
        } catch (error) {
            toast.error('Failed to create schedule');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSchedule = async (scheduleId) => {
        try {
            await deleteSchedule(scheduleId);
            setSchedules(prev => prev.filter(s => s.id !== scheduleId));
            toast.success('Schedule deleted');
        } catch (error) {
            toast.error('Failed to delete schedule');
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
            setArticleForm({ title: '', content: '', category: 'technique', video_url: '', image_url: '' });
            toast.success('Article created!');
        } catch (error) {
            toast.error('Failed to create article');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteArticle = async (articleId) => {
        try {
            await deleteArticle(articleId);
            setArticles(prev => prev.filter(a => a.id !== articleId));
            toast.success('Article deleted');
        } catch (error) {
            toast.error('Failed to delete article');
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

    const handleDeleteAnnouncement = async (annId) => {
        try {
            await deleteAnnouncement(annId);
            setAnnouncements(prev => prev.filter(a => a.id !== annId));
            toast.success('Announcement deleted');
        } catch (error) {
            toast.error('Failed to delete announcement');
        }
    };

    if (!user || !isAdmin) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="admin-page">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-8 h-8 text-[#0051BA]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl font-black uppercase tracking-tight text-[#0F172A]">
                        Admin Panel
                    </h1>
                </div>
                <p className="text-gray-600">Manage matches, teams, schedules, and content</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border border-gray-100 p-1 mb-6 flex-wrap h-auto">
                    <TabsTrigger value="matches" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        Matches
                        {pendingMatches.length > 0 && (
                            <Badge className="bg-[#E06040] text-white ml-1">{pendingMatches.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Teams
                    </TabsTrigger>
                    <TabsTrigger value="schedules" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Schedule
                    </TabsTrigger>
                    <TabsTrigger value="articles" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Articles
                    </TabsTrigger>
                    <TabsTrigger value="announcements" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <Megaphone className="w-4 h-4" />
                        Announcements
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
                                        <div key={match.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" data-testid={`pending-match-${match.id}`}>
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
                                                <div className="text-xs text-gray-400">
                                                    Submitted by {match.submitted_by_name}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    size="sm" 
                                                    className="bg-green-500 hover:bg-green-600"
                                                    onClick={() => handleApproveMatch(match.id)}
                                                    data-testid={`approve-match-${match.id}`}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="destructive"
                                                    onClick={() => handleRejectMatch(match.id)}
                                                    data-testid={`reject-match-${match.id}`}
                                                >
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

                {/* Teams Management */}
                <TabsContent value="teams">
                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Create Team</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateTeam} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Team Name</Label>
                                        <Input
                                            value={teamForm.name}
                                            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                                            placeholder="e.g., The Aces"
                                            data-testid="team-name-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Team Members</Label>
                                        <Select
                                            onValueChange={(v) => {
                                                if (!teamForm.member_ids.includes(v)) {
                                                    setTeamForm({ ...teamForm, member_ids: [...teamForm.member_ids, v] });
                                                }
                                            }}
                                        >
                                            <SelectTrigger data-testid="team-members-select">
                                                <SelectValue placeholder="Add member" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map(u => (
                                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {teamForm.member_ids.map(id => {
                                                const member = users.find(u => u.id === id);
                                                return (
                                                    <Badge key={id} variant="secondary" className="pr-1">
                                                        {member?.name}
                                                        <button 
                                                            type="button"
                                                            onClick={() => setTeamForm({ ...teamForm, member_ids: teamForm.member_ids.filter(m => m !== id) })}
                                                            className="ml-1 hover:text-red-500"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full btn-primary" disabled={loading} data-testid="create-team-btn">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                        Create Team
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Existing Teams</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {teams.map(team => (
                                        <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="font-medium">{team.name}</div>
                                                <div className="text-sm text-gray-500">{team.member_names?.join(' & ')}</div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteTeam(team.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Schedule Management */}
                <TabsContent value="schedules">
                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Create Schedule</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateSchedule} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input value={scheduleForm.title} onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })} placeholder="Sunday Round Robin" data-testid="schedule-title-input" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description (optional)</Label>
                                        <Textarea value={scheduleForm.description} onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })} placeholder="Details about the event..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Date</Label>
                                            <Input type="date" value={scheduleForm.match_date} onChange={(e) => setScheduleForm({ ...scheduleForm, match_date: e.target.value })} data-testid="schedule-date-input" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Time</Label>
                                            <Input type="time" value={scheduleForm.match_time} onChange={(e) => setScheduleForm({ ...scheduleForm, match_time: e.target.value })} data-testid="schedule-time-input" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Location</Label>
                                        <Input value={scheduleForm.location} onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })} placeholder="City Tennis Club" data-testid="schedule-location-input" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Teams (comma separated)</Label>
                                        <Input 
                                            placeholder="Team A, Team B, Team C" 
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, teams: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} 
                                        />
                                    </div>
                                    <Button type="submit" className="w-full btn-primary" disabled={loading} data-testid="create-schedule-btn">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                        Create Schedule
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Scheduled Events</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {schedules.map(schedule => (
                                        <div key={schedule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="font-medium">{schedule.title}</div>
                                                <div className="text-sm text-gray-500">{new Date(schedule.match_date).toLocaleDateString()} • {schedule.match_time}</div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteSchedule(schedule.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Articles Management */}
                <TabsContent value="articles">
                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Create Article</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateArticle} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} placeholder="Master Your Serve" data-testid="article-title-input" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <Select value={articleForm.category} onValueChange={(v) => setArticleForm({ ...articleForm, category: v })}>
                                            <SelectTrigger data-testid="article-category-select">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="technique">Technique</SelectItem>
                                                <SelectItem value="strategy">Strategy</SelectItem>
                                                <SelectItem value="fitness">Fitness</SelectItem>
                                                <SelectItem value="equipment">Equipment</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Content</Label>
                                        <Textarea value={articleForm.content} onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })} placeholder="Write your article content..." className="min-h-32" data-testid="article-content-input" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>YouTube URL (optional)</Label>
                                        <Input value={articleForm.video_url} onChange={(e) => setArticleForm({ ...articleForm, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Image URL (optional)</Label>
                                        <Input value={articleForm.image_url} onChange={(e) => setArticleForm({ ...articleForm, image_url: e.target.value })} placeholder="https://..." />
                                    </div>
                                    <Button type="submit" className="w-full btn-primary" disabled={loading} data-testid="create-article-btn">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                        Create Article
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Existing Articles</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {articles.map(article => (
                                        <div key={article.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="font-medium">{article.title}</div>
                                                <div className="text-sm text-gray-500">{article.category}</div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteArticle(article.id)}>
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
                            <CardHeader>
                                <CardTitle>Post Announcement</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} placeholder="Important Update" data-testid="announcement-title-input" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Content</Label>
                                        <Textarea value={announcementForm.content} onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })} placeholder="Announcement details..." data-testid="announcement-content-input" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Priority</Label>
                                        <Select value={announcementForm.priority} onValueChange={(v) => setAnnouncementForm({ ...announcementForm, priority: v })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="urgent">Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="submit" className="w-full btn-primary" disabled={loading} data-testid="create-announcement-btn">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                        Post Announcement
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle>Recent Announcements</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {announcements.map(ann => (
                                        <div key={ann.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {ann.title}
                                                    {ann.priority === 'urgent' && <Badge className="bg-[#E06040] text-white">Urgent</Badge>}
                                                </div>
                                                <div className="text-sm text-gray-500">{new Date(ann.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteAnnouncement(ann.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
