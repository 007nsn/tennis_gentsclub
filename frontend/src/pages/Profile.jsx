import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { getMatches } from '../lib/api';
import { User, Trophy, Calendar, Clock, Shield } from 'lucide-react';

export default function Profile() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadMatches();
    }, [user, navigate]);

    const loadMatches = async () => {
        try {
            const response = await getMatches();
            // Filter matches submitted by current user
            const userMatches = response.data.filter(m => m.submitted_by === user.id);
            setMatches(userMatches);
        } catch (error) {
            console.error('Error loading matches:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const approvedMatches = matches.filter(m => m.status === 'approved');
    const pendingMatches = matches.filter(m => m.status === 'pending');

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="profile-page">
            {/* Profile Header */}
            <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] mb-8 overflow-hidden">
                <div className="bg-[#0051BA] h-32 relative">
                    <div className="absolute inset-0 net-texture opacity-20"></div>
                </div>
                <CardContent className="relative pt-0">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
                        <div className="w-24 h-24 bg-[#CCFF00] rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                            <span className="text-[#002040] font-bold text-3xl">
                                {user.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="text-center sm:text-left pb-2">
                            <h1 className="font-['Barlow_Condensed'] text-2xl font-bold uppercase flex items-center gap-2 justify-center sm:justify-start">
                                {user.name}
                                {user.role === 'admin' && (
                                    <Badge className="bg-[#0051BA] text-white">
                                        <Shield className="w-3 h-3 mr-1" />
                                        Admin
                                    </Badge>
                                )}
                            </h1>
                            <p className="text-gray-500">{user.email}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardContent className="p-6 text-center">
                        <Trophy className="w-8 h-8 text-[#CCFF00] mx-auto mb-2" />
                        <div className="text-2xl font-bold text-[#0051BA]">{approvedMatches.length}</div>
                        <div className="text-sm text-gray-500">Matches Played</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardContent className="p-6 text-center">
                        <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-[#0051BA]">{pendingMatches.length}</div>
                        <div className="text-sm text-gray-500">Pending Approval</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardContent className="p-6 text-center">
                        <Calendar className="w-8 h-8 text-[#0051BA] mx-auto mb-2" />
                        <div className="text-2xl font-bold text-[#0051BA]">
                            {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-sm text-gray-500">Member Since</div>
                    </CardContent>
                </Card>
            </div>

            {/* Match History */}
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardHeader>
                    <CardTitle className="font-['Barlow_Condensed'] uppercase">Your Submitted Matches</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : matches.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No match results submitted yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {matches.map(match => (
                                <div 
                                    key={match.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                    data-testid={`match-history-${match.id}`}
                                >
                                    <div>
                                        <div className="font-medium">
                                            {match.match_type === 'team' 
                                                ? `${match.team_a_name} vs ${match.team_b_name}`
                                                : `${match.player_a_name} vs ${match.player_b_name}`
                                            }
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {match.score_a} - {match.score_b} • {new Date(match.match_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <Badge className={
                                        match.status === 'approved' ? 'badge-approved' :
                                        match.status === 'rejected' ? 'badge-rejected' : 'badge-pending'
                                    }>
                                        {match.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
