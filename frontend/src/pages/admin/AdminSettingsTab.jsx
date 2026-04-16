import { useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { clearTestData, clearUsers, clearEvents, clearMatches, clearChat, clearContent } from '../../lib/api';
import { toast } from 'sonner';
import { Trash2, Loader2, AlertTriangle, Clock, Users, Calendar, Trophy, MessageCircle, BookOpen } from 'lucide-react';

const DAY_OPTIONS = [
    { value: '0', label: 'Monday' },
    { value: '1', label: 'Tuesday' },
    { value: '2', label: 'Wednesday' },
    { value: '3', label: 'Thursday' },
    { value: '4', label: 'Friday' },
    { value: '5', label: 'Saturday' },
    { value: '6', label: 'Sunday' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
    value: String(i),
    label: `${i === 0 ? '12' : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'}`
}));

function ClearButton({ label, icon: Icon, onClear, confirmText }) {
    const [confirming, setConfirming] = useState(false);
    const [clearing, setClearing] = useState(false);

    const handleClear = async () => {
        setClearing(true);
        try {
            const res = await onClear();
            toast.success(res.data.message);
            setConfirming(false);
        } catch (e) {
            toast.error('Failed to clear');
        } finally {
            setClearing(false);
        }
    };

    if (confirming) {
        return (
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleClear}
                    disabled={clearing}
                    data-testid={`confirm-clear-${label.toLowerCase().replace(/\s/g, '-')}`}
                >
                    {clearing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                    Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2 text-sm">
                <Icon className="w-4 h-4 text-gray-400" />
                <span>{label}</span>
            </div>
            <Button
                size="sm"
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-50 h-7 text-xs"
                onClick={() => setConfirming(true)}
                data-testid={`clear-${label.toLowerCase().replace(/\s/g, '-')}`}
            >
                <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
        </div>
    );
}

export function AdminSettingsTab({ settings, onSettingsChange, onSave }) {
    const [clearingAll, setClearingAll] = useState(false);
    const [confirmClearAll, setConfirmClearAll] = useState(false);

    const handleClearAll = async () => {
        setClearingAll(true);
        try {
            const res = await clearTestData();
            const d = res.data.deleted;
            toast.success(`Cleared: ${d.users} users, ${d.schedules} schedules, ${d.weekly_events} events, ${d.matches} matches, ${d.chatroom} messages`);
            setConfirmClearAll(false);
        } catch (e) {
            toast.error('Failed to clear test data');
        } finally {
            setClearingAll(false);
        }
    };

    return (
        <TabsContent value="settings">
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle>Club Settings</CardTitle>
                        <CardDescription>Configure court and schedule defaults</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Number of Courts</Label>
                            <Input type="number" min="1" max="10" value={settings.num_courts} onChange={(e) => onSettingsChange({ ...settings, num_courts: parseInt(e.target.value) })} data-testid="courts-input" />
                        </div>
                        <div className="space-y-2">
                            <Label>Default Location</Label>
                            <Input value={settings.default_location} onChange={(e) => onSettingsChange({ ...settings, default_location: e.target.value })} data-testid="location-input" />
                        </div>
                        <div className="space-y-2">
                            <Label>Match Duration (minutes)</Label>
                            <Input type="number" min="15" max="120" value={settings.match_duration_minutes} onChange={(e) => onSettingsChange({ ...settings, match_duration_minutes: parseInt(e.target.value) })} data-testid="duration-input" />
                        </div>
                        <div className="space-y-2">
                            <Label>Default Start Time</Label>
                            <Input type="time" value={settings.default_start_time} onChange={(e) => onSettingsChange({ ...settings, default_start_time: e.target.value })} data-testid="start-time-input" />
                        </div>
                        <Button onClick={() => onSave(settings)} className="w-full btn-primary" data-testid="save-settings-btn">Save Settings</Button>
                    </CardContent>
                </Card>

                {/* RSVP Settings */}
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-l-4 border-l-[#0051BA]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-[#0051BA]" />
                            RSVP Settings
                        </CardTitle>
                        <CardDescription>Control when RSVP opens for Sunday events</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>RSVP Opens On</Label>
                            <Select
                                value={String(settings.rsvp_open_day ?? 2)}
                                onValueChange={(v) => onSettingsChange({ ...settings, rsvp_open_day: parseInt(v) })}
                            >
                                <SelectTrigger data-testid="rsvp-day-select">
                                    <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DAY_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>RSVP Opens At</Label>
                            <Select
                                value={String(settings.rsvp_open_hour ?? 7)}
                                onValueChange={(v) => onSettingsChange({ ...settings, rsvp_open_hour: parseInt(v) })}
                            >
                                <SelectTrigger data-testid="rsvp-hour-select">
                                    <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                    {HOUR_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                            RSVP will auto-open on <strong>{DAY_OPTIONS.find(d => d.value === String(settings.rsvp_open_day ?? 2))?.label || 'Wednesday'}</strong> at{' '}
                            <strong>{HOUR_OPTIONS.find(h => h.value === String(settings.rsvp_open_hour ?? 7))?.label || '7:00 AM'}</strong> (US/Eastern) each week.
                        </div>
                        <Button onClick={() => onSave(settings)} className="w-full btn-primary" data-testid="save-rsvp-settings-btn">Save RSVP Settings</Button>
                    </CardContent>
                </Card>

                {/* Data Management - Individual Controls */}
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-l-4 border-l-red-400 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            Data Management
                        </CardTitle>
                        <CardDescription>Clear specific data categories or everything at once. Your admin account is always preserved.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <ClearButton label="All users (except admin)" icon={Users} onClear={clearUsers} />
                        <ClearButton label="Schedules, weekly events & check-ins" icon={Calendar} onClear={clearEvents} />
                        <ClearButton label="Matches, teams & solo ladder" icon={Trophy} onClear={clearMatches} />
                        <ClearButton label="Chatroom messages & announcements" icon={MessageCircle} onClear={clearChat} />
                        <ClearButton label="Articles, scout reports & strategy chats" icon={BookOpen} onClear={clearContent} />

                        <div className="pt-4 mt-4 border-t border-gray-200">
                            {confirmClearAll ? (
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-red-600">Delete ALL data? This cannot be undone.</p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="destructive"
                                            onClick={handleClearAll}
                                            disabled={clearingAll}
                                            data-testid="confirm-clear-all-btn"
                                        >
                                            {clearingAll ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                                            Yes, Clear Everything
                                        </Button>
                                        <Button variant="ghost" onClick={() => setConfirmClearAll(false)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="text-red-600 border-red-300 hover:bg-red-50 w-full"
                                    onClick={() => setConfirmClearAll(true)}
                                    data-testid="clear-all-btn"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Clear All Data At Once
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
}
