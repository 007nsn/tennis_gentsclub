import { useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { clearTestData } from '../../lib/api';
import { toast } from 'sonner';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';

export function AdminSettingsTab({ settings, onSettingsChange, onSave }) {
    const [clearing, setClearing] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    const handleClearTestData = async () => {
        setClearing(true);
        try {
            const res = await clearTestData();
            const d = res.data.deleted;
            toast.success(`Cleared: ${d.users} users, ${d.schedules} schedules, ${d.weekly_events} events, ${d.matches} matches, ${d.chatroom} messages`);
            setConfirmClear(false);
        } catch (e) {
            toast.error('Failed to clear test data');
        } finally {
            setClearing(false);
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

                {/* Clear Test Data */}
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-l-4 border-l-red-400">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            Clear Test Data
                        </CardTitle>
                        <CardDescription>
                            Permanently delete all test users, schedules, events, matches, messages, and content. Your admin account will be preserved.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500 mb-4">This will remove:</p>
                        <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc list-inside">
                            <li>All users except your admin account</li>
                            <li>All schedules, weekly events, and check-ins</li>
                            <li>All matches, teams, and solo ladder entries</li>
                            <li>All chatroom messages and announcements</li>
                            <li>All articles, scout reports, and strategy chats</li>
                        </ul>
                        {confirmClear ? (
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-red-600">Are you sure? This cannot be undone.</p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="destructive"
                                        onClick={handleClearTestData}
                                        disabled={clearing}
                                        data-testid="confirm-clear-btn"
                                    >
                                        {clearing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                                        Yes, Clear Everything
                                    </Button>
                                    <Button variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50 w-full"
                                onClick={() => setConfirmClear(true)}
                                data-testid="clear-test-data-btn"
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Clear All Test Data
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
}
