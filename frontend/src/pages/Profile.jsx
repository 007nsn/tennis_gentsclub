import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { getMatches, updateMe } from '../lib/api';
import { toast } from 'sonner';
import { Trophy, Calendar, Clock, Shield, Loader2 } from 'lucide-react';

export default function Profile() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPassword, setNewPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

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
            const userMatches = response.data.filter(m => m.submitted_by === user.id);
            setMatches(userMatches);
        } catch (error) {
            console.error('Error loading matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        const trimmed = newPassword.trim();
        if (!trimmed) {
            toast.error('Enter a new password to save, or leave the field empty to keep your current password.');
            return;
        }
        if (trimmed.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setSavingPassword(true);
        try {
            await updateMe({ password: trimmed });
            setNewPassword('');
            await refreshUser();
            toast.success('Password updated');
        } catch (err) {
            const detail = err.response?.data?.detail;
            toast.error(typeof detail === 'string' ? detail : 'Could not update password');
        } finally {
            setSavingPassword(false);
        }
    };

    if (!user) return null;

    const nameParts = (user.name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts.length ? nameParts[0] : '—';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '—';
    const memberSinceLabel = user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '—';
    const avatarLetter = (user.name || user.email || '?').charAt(0).toUpperCase();

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
                                {avatarLetter}
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

            {/* Account details */}
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-8">
                <CardHeader>
                    <CardTitle className="font-['Barlow_Condensed'] uppercase">Account</CardTitle>
                    <CardDescription>Your registration details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>First name</Label>
                            <p className="text-sm font-medium text-[#0F172A]">{firstName}</p>
                        </div>
                        <div className="space-y-1">
                            <Label>Last name</Label>
                            <p className="text-sm font-medium text-[#0F172A]">{lastName}</p>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <Label>Email</Label>
                            <p className="text-sm font-medium text-[#0F172A]">{user.email}</p>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <Label>Phone</Label>
                            <p className="text-sm font-medium text-[#0F172A]">
                                {user.phone && String(user.phone).trim() ? user.phone : 'Not provided'}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Admin-visible</p>
                        <p className="text-xs text-amber-800">
                            This password is visible to club administrators so they can help with your account if needed.
                        </p>
                        <div className="space-y-1">
                            <Label className="text-amber-900">Current password</Label>
                            <p className="text-sm font-mono font-medium text-[#0F172A]" data-testid="profile-visible-password">
                                {user.admin_visible_password || '—'}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordSave} className="space-y-3 pt-2 border-t border-gray-100">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New password (optional)</Label>
                            <Input
                                id="new-password"
                                type="text"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Leave empty to keep current password"
                                data-testid="profile-new-password-input"
                            />
                            <p className="text-xs text-gray-500">
                                At least 6 characters. Many members start with the club default <span className="font-mono">tennis2025</span> until they change it here.
                            </p>
                        </div>
                        <Button
                            type="submit"
                            className="btn-primary"
                            disabled={savingPassword || !newPassword.trim()}
                        >
                            {savingPassword ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save new password'
                            )}
                        </Button>
                    </form>
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
                            {memberSinceLabel}
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
