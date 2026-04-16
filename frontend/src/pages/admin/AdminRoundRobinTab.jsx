import { useState, useEffect, useCallback } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Plus, Loader2, Bell, Calendar, Users, Shuffle, Trash2 } from 'lucide-react';
import {
    getUpcomingWeeklyEvents, createWeeklyEvent, getEventCheckIns,
    approvePlayers, generateDoublesSchedule, deleteWeeklyEvent,
    createMatchReminder
} from '../../lib/api';
import { toast } from 'sonner';

export function AdminRoundRobinTab() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newEventDate, setNewEventDate] = useState('');
    const [reminderForm, setReminderForm] = useState({ match_date: '', message: '' });

    const loadEvents = useCallback(async () => {
        try {
            const res = await getUpcomingWeeklyEvents();
            // Enrich each event with check-in data
            const enriched = await Promise.all(res.data.map(async (ev) => {
                const checkinsRes = await getEventCheckIns(ev.id);
                return { ...ev, checkins: checkinsRes.data };
            }));
            setEvents(enriched);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => { loadEvents(); }, [loadEvents]);

    const handleCreateEvent = async () => {
        if (!newEventDate) { toast.error('Select a date'); return; }
        setLoading(true);
        try {
            await createWeeklyEvent({ event_date: newEventDate });
            toast.success('Sunday event created!');
            setNewEventDate('');
            loadEvents();
        } catch (e) { toast.error('Failed to create event'); }
        finally { setLoading(false); }
    };

    const handleApproveAll = async (ev) => {
        const available = (ev.checkins || []).filter(c => c.status === 'available');
        const maybe = (ev.checkins || []).filter(c => c.status === 'maybe');
        setLoading(true);
        try {
            await approvePlayers(ev.id, {
                event_id: ev.id,
                approved_player_ids: available.map(c => c.user_id),
                waitlist_player_ids: maybe.map(c => c.user_id)
            });
            toast.success('Players approved!');
            loadEvents();
        } catch (e) { toast.error('Failed to approve'); }
        finally { setLoading(false); }
    };

    const handleGenerate = async (ev) => {
        setLoading(true);
        try {
            const res = await generateDoublesSchedule(ev.id, { event_id: ev.id });
            toast.success(res.data.message);
            loadEvents();
        } catch (e) { toast.error(e.response?.data?.detail || 'Failed to generate'); }
        finally { setLoading(false); }
    };

    const handleDeleteEvent = async (ev) => {
        try {
            await deleteWeeklyEvent(ev.id);
            toast.success('Event deleted');
            loadEvents();
        } catch (e) { toast.error('Delete failed'); }
    };

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
        } catch (err) {
            toast.error('Failed to post reminder');
        } finally {
            setLoading(false);
        }
    };

    const upcomingSundays = (() => {
        const today = new Date();
        const sundays = [];
        let d = new Date(today);
        d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
        for (let i = 0; i < 4; i++) {
            sundays.push(new Date(d).toISOString().split('T')[0]);
            d.setDate(d.getDate() + 7);
        }
        return sundays;
    })();

    return (
        <TabsContent value="roundrobin">
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Create Event */}
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#0051BA]" />
                            Create Sunday Event
                        </CardTitle>
                        <CardDescription>Create an event to open check-in for members (opens Monday 7 AM)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Sunday</Label>
                            <Select value={newEventDate} onValueChange={setNewEventDate}>
                                <SelectTrigger data-testid="new-event-select">
                                    <SelectValue placeholder="Choose a Sunday" />
                                </SelectTrigger>
                                <SelectContent>
                                    {upcomingSundays.map(date => (
                                        <SelectItem key={date} value={date}>
                                            {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleCreateEvent} disabled={loading || !newEventDate} className="btn-primary w-full" data-testid="create-event-btn">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Create Event & Open Check-In
                        </Button>
                    </CardContent>
                </Card>

                {/* Match Reminder */}
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-[#E06040]" />
                            Send Match Reminder
                        </CardTitle>
                        <CardDescription>Post a reminder to the chatroom</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSendReminder} className="space-y-4">
                            <Select value={reminderForm.match_date} onValueChange={(v) => setReminderForm({ ...reminderForm, match_date: v })}>
                                <SelectTrigger data-testid="reminder-date-select">
                                    <SelectValue placeholder="Select a Sunday" />
                                </SelectTrigger>
                                <SelectContent>
                                    {upcomingSundays.map(date => (
                                        <SelectItem key={date} value={date}>
                                            {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Textarea
                                value={reminderForm.message}
                                onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })}
                                placeholder="e.g., Don't forget! Matches start at 9 AM this Sunday."
                                className="min-h-20"
                                data-testid="reminder-message-input"
                            />
                            <Button type="submit" className="btn-primary w-full" disabled={loading || !reminderForm.match_date || !reminderForm.message} data-testid="send-reminder-btn">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                                Post Reminder to Chatroom
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Events List */}
                {events.length > 0 && (
                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Upcoming Events</CardTitle>
                            <CardDescription>Manage check-ins, approve players, and generate schedules</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {events.map(ev => {
                                const available = (ev.checkins || []).filter(c => c.status === 'available');
                                const maybe = (ev.checkins || []).filter(c => c.status === 'maybe');
                                const approved = ev.approved_players || [];
                                return (
                                    <div key={ev.id} className="p-4 border border-gray-100 rounded-lg space-y-3" data-testid={`admin-event-${ev.id}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold">{ev.title}</h4>
                                                <p className="text-sm text-gray-500">{new Date(ev.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={ev.status === 'scheduled' ? 'bg-green-100 text-green-800' : ev.status === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}>
                                                    {ev.status}
                                                </Badge>
                                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteEvent(ev)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Check-in stats */}
                                        <div className="flex gap-4 text-sm">
                                            <span className="text-green-700"><Users className="w-4 h-4 inline mr-1" />{available.length} Available</span>
                                            <span className="text-amber-700">{maybe.length} Maybe</span>
                                            <span className="text-blue-700">{approved.length} Approved</span>
                                        </div>

                                        {/* Player names */}
                                        {available.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {available.map(c => <Badge key={c.user_id} className="bg-green-100 text-green-800 text-xs">{c.user_name}</Badge>)}
                                                {maybe.map(c => <Badge key={c.user_id} className="bg-amber-100 text-amber-800 text-xs">{c.user_name}</Badge>)}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {ev.status === 'open' && available.length > 0 && (
                                                <Button size="sm" className="bg-[#0051BA]" onClick={() => handleApproveAll(ev)} disabled={loading} data-testid={`approve-${ev.id}`}>
                                                    Approve Available ({available.length})
                                                </Button>
                                            )}
                                            {ev.status === 'approved' && approved.length >= 4 && (
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleGenerate(ev)} disabled={loading} data-testid={`generate-${ev.id}`}>
                                                    <Shuffle className="w-4 h-4 mr-1" />Generate Doubles Schedule
                                                </Button>
                                            )}
                                        </div>

                                        {/* Generated schedule preview */}
                                        {ev.generated_schedule && (
                                            <div className="bg-green-50 rounded-lg p-3 text-sm">
                                                <p className="font-medium text-green-800 mb-1">Schedule Generated ({ev.generated_schedule.length} rounds)</p>
                                                {ev.generated_schedule.slice(0, 2).map(r => (
                                                    <div key={r.round} className="text-green-700 text-xs">
                                                        Round {r.round}: {r.matches.map(m => `${m.team_a.map(p => p.name).join(' & ')} vs ${m.team_b.map(p => p.name).join(' & ')}`).join(' | ')}
                                                    </div>
                                                ))}
                                                {ev.generated_schedule.length > 2 && <p className="text-xs text-green-600 mt-1">...and {ev.generated_schedule.length - 2} more rounds</p>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}
            </div>
        </TabsContent>
    );
}
