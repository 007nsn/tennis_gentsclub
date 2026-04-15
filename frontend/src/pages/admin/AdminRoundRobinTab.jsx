import { useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Plus, Loader2, Bell } from 'lucide-react';
import { generateRoundRobin } from '../../lib/api';
import { toast } from 'sonner';

export function AdminRoundRobinTab({ sundays, availability, settings, loading: parentLoading, onCreateSchedule, onSendReminder, onRefresh }) {
    const [selectedSunday, setSelectedSunday] = useState('');
    const [loading, setLoading] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({ title: '', description: '', match_date: '', match_time: '09:00', location: '', teams: [] });
    const [reminderForm, setReminderForm] = useState({ match_date: '', message: '' });

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
            onRefresh();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to generate round robin');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSchedule = async (e) => {
        e.preventDefault();
        if (!scheduleForm.title || !scheduleForm.match_date || !scheduleForm.match_time || !scheduleForm.location) {
            toast.error('Please fill all required fields');
            return;
        }
        const success = await onCreateSchedule(scheduleForm);
        if (success) {
            setScheduleForm({ title: '', description: '', match_date: '', match_time: '09:00', location: '', teams: [] });
        }
    };

    const handleSendReminder = async (e) => {
        e.preventDefault();
        if (!reminderForm.match_date || !reminderForm.message) {
            toast.error('Please fill in date and message');
            return;
        }
        const success = await onSendReminder(reminderForm);
        if (success) {
            setReminderForm({ match_date: '', message: '' });
        }
    };

    const isLoading = loading || parentLoading;

    return (
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
                                <SelectTrigger data-testid="roundrobin-sunday-select">
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

                        <Button onClick={handleGenerateRoundRobin} disabled={isLoading || !selectedSunday} className="btn-primary w-full" data-testid="generate-roundrobin-btn">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Round Robin & Court Assignments'}
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
                            <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                                <Plus className="w-4 h-4 mr-2" />Create Schedule
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Match Reminder */}
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-[#E06040]" />
                            Send Match Reminder
                        </CardTitle>
                        <CardDescription>Post a match reminder directly to the chatroom for all members</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSendReminder} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Match Date</Label>
                                    <Select value={reminderForm.match_date} onValueChange={(v) => setReminderForm({ ...reminderForm, match_date: v })}>
                                        <SelectTrigger data-testid="reminder-date-select">
                                            <SelectValue placeholder="Select a Sunday" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sundays.map(date => (
                                                <SelectItem key={date} value={date}>
                                                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Reminder Message</Label>
                                    <Textarea
                                        value={reminderForm.message}
                                        onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })}
                                        placeholder="e.g., Don't forget! Matches start at 9 AM this Sunday. Bring water and sunscreen!"
                                        className="min-h-20"
                                        data-testid="reminder-message-input"
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="btn-primary" disabled={isLoading || !reminderForm.match_date || !reminderForm.message} data-testid="send-reminder-btn">
                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                                Post Reminder to Chatroom
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
}
