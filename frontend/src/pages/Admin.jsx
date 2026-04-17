import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { useAdminData } from '../hooks/useAdminData';
import { AdminMatchesTab } from './admin/AdminMatchesTab';
import { AdminRoundRobinTab } from './admin/AdminRoundRobinTab';
import { AdminPlayersTab } from './admin/AdminPlayersTab';
import { AdminContentTab } from './admin/AdminContentTab';
import { AdminAnnouncementsTab } from './admin/AdminAnnouncementsTab';
import { AdminSettingsTab } from './admin/AdminSettingsTab';
import { Shield, Trophy, Calendar, BookOpen, Megaphone, Users, Settings } from 'lucide-react';

export default function Admin() {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('matches');
    const data = useAdminData();

    if (!user || !isAdmin) {
        navigate('/');
        return null;
    }

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
                    <TabsTrigger value="matches" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2" data-testid="tab-matches">
                        <Trophy className="w-4 h-4" />
                        Matches
                        {data.pendingMatches.length > 0 && <Badge className="bg-[#E06040] text-white ml-1">{data.pendingMatches.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="roundrobin" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2" data-testid="tab-roundrobin">
                        <Calendar className="w-4 h-4" />
                        Round Robin
                    </TabsTrigger>
                    <TabsTrigger value="players" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2" data-testid="tab-players">
                        <Users className="w-4 h-4" />
                        Players
                    </TabsTrigger>
                    <TabsTrigger value="content" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2" data-testid="tab-content">
                        <BookOpen className="w-4 h-4" />
                        Content
                    </TabsTrigger>
                    <TabsTrigger value="announcements" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2" data-testid="tab-announcements">
                        <Megaphone className="w-4 h-4" />
                        Announcements
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2" data-testid="tab-settings">
                        <Settings className="w-4 h-4" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                <AdminMatchesTab
                    pendingMatches={data.pendingMatches}
                    onApprove={data.handleApproveMatch}
                    onReject={data.handleRejectMatch}
                    onClearMatches={data.handleClearMatches}
                />

                <AdminRoundRobinTab
                    onClearEvents={data.handleClearEvents}
                />

                <AdminPlayersTab
                    soloPlayers={data.soloPlayers}
                    users={data.users}
                    loading={data.loading}
                    onUpdatePlayer={data.handleUpdatePlayer}
                    onUpdateUser={data.handleUpdateUser}
                    onClearUsers={data.handleClearUsers}
                />

                <AdminContentTab
                    articles={data.articles}
                    loading={data.loading}
                    onCreateArticle={data.handleCreateArticle}
                    onDeleteArticle={data.handleDeleteArticle}
                    onSeedContent={data.handleSeedContent}
                    onClearContent={data.handleClearContent}
                />

                <AdminAnnouncementsTab
                    announcements={data.announcements}
                    loading={data.loading}
                    onCreateAnnouncement={data.handleCreateAnnouncement}
                    onDeleteAnnouncement={data.handleDeleteAnnouncement}
                    chatMessages={data.chatMessages}
                    onDeleteChatMessage={data.handleDeleteChatMessage}
                    onClearChat={data.handleClearChat}
                />

                <AdminSettingsTab
                    settings={data.settings}
                    onSettingsChange={data.setSettings}
                    onSave={data.handleUpdateSettings}
                />
            </Tabs>
        </div>
    );
}
