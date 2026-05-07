import { useState, useEffect, useCallback } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Plus, Loader2, Bell, Calendar, Users, Shuffle, Trash2, Lock, Unlock, UserPlus, Armchair, UserCheck } from 'lucide-react';
import {
    getUpcomingWeeklyEvents, createWeeklyEvent, getEventCheckIns,
    generateDoublesSchedule, deleteWeeklyEvent,
    createMatchReminder, closeRsvp, reopenRsvp, addExternalPlayer
} from '../../lib/api';
import { toast } from 'sonner';

const getConfirmed = (ev) => ev.confirmed_players || ev.approved_players || [];
const getBench = (ev) => ev.bench_players || ev.waitlist_players || [];

export function AdminRoundRobinTab({ onClearEvents }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newEventDate, setNewEventDate] = useState('');
    const [reminderForm, setReminderForm] = useState({ match_date: '', message: '' });
    const [extNames, setExtNames] = useState({});
    const [scheduleMode, setScheduleMode] = useState('hybrid');
    const [allowCanadianDoubles, setAllowCanadianDoubles] = useState(true);
    const [optimizationMode, setOptimizationMode] = useState('balanced');

    const loadEvents = useCallback(async () => {
        try {
            const res = await getUpcomingWeeklyEvents();
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

    const handleGenerate = async (ev) => {
        if (ev.is_admin_overridden) {
            if (!window.confirm('This will overwrite the admin-edited schedule. Continue?')) return;
        }
        setLoading(true);
        try {
            const res = await generateDoublesSchedule(ev.id, {
                event_id: ev.id,
                mode: scheduleMode,
                allow_canadian_doubles: allowCanadianDoubles,
                optimize: optimizationMode,
            });
            toast.success(res.data.message);
            loadEvents();
        } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
        finally { setLoading(false); }
    };

    const handleDeleteEvent = async (ev) => {
        try { await deleteWeeklyEvent(ev.id); toast.success('Event deleted'); loadEvents(); }
        catch (e) { toast.error('Delete failed'); }
    };

    const handleCloseRsvp = async (ev) => {
        try { await closeRsvp(ev.id); toast.success('RSVP closed.'); loadEvents(); }
        catch (e) { toast.error('Failed'); }
    };

    const handleReopenRsvp = async (ev) => {
        try { await reopenRsvp(ev.id); toast.success('RSVP reopened.'); loadEvents(); }
        catch (e) { toast.error('Failed'); }
    };

    const handleAddExternal = async (ev) => {
        const name = (extNames[ev.id] || '').trim();
        if (!name) return;
        try {
            await addExternalPlayer(ev.id, { name });
            toast.success(`"${name}" added!`);
            setExtNames(prev => ({ ...prev, [ev.id]: '' }));
            loadEvents();
        } catch (e) { toast.error('Failed'); }
    };

    const handleSendReminder = async (e) => {
        e.preventDefault();
        if (!reminderForm.match_date || !reminderForm.message) { toast.error('Fill in date and message'); return; }
        setLoading(true);
        try {
            await createMatchReminder(reminderForm);
            toast.success('Reminder posted!');
            setReminderForm({ match_date: '', message: '' });
        } catch (err) { toast.error('Failed'); }
        finally { setLoading(false); }
    };

    const upcomingSundays = (() => {
        const today = new Date();
        const sundays = [];
        let d = new Date(today);
        // Find next Sunday: Sunday is day 0
        const daysUntilSunday = (7 - d.getDay()) % 7;
        d.setDate(d.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
        for (let i = 0; i < 4; i++) {
            sundays.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
            d.setDate(d.getDate() + 7);
        }
        return sundays;
    })();

    return (
        <TabsContent value="roundrobin">
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-[#0051BA]" />Create Sunday Event</CardTitle>
                        <CardDescription>Players auto-confirm when they RSVP (up to court capacity)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={newEventDate} onValueChange={setNewEventDate}>
                            <SelectTrigger data-testid="new-event-select"><SelectValue placeholder="Choose a Sunday" /></SelectTrigger>
                            <SelectContent>
                                {upcomingSundays.map(date => (
                                    <SelectItem key={date} value={date}>
                                        {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleCreateEvent} disabled={loading || !newEventDate} className="btn-primary w-full" data-testid="create-event-btn">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Create Event
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-[#E06040]" />Send Reminder</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSendReminder} className="space-y-4">
                            <Select value={reminderForm.match_date} onValueChange={(v) => setReminderForm({ ...reminderForm, match_date: v })}>
                                <SelectTrigger><SelectValue placeholder="Select a Sunday" /></SelectTrigger>
                                <SelectContent>
                                    {upcomingSundays.map(date => (
                                        <SelectItem key={date} value={date}>
                                            {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Textarea value={reminderForm.message} onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })} placeholder="e.g., Matches start at 9 AM this Sunday." className="min-h-20" />
                            <Button type="submit" className="btn-primary w-full" disabled={loading || !reminderForm.match_date || !reminderForm.message}>
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                                Post Reminder
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {events.length > 0 && (
                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Upcoming Events</CardTitle>
                            <CardDescription>Players auto-confirm up to court capacity. Manage schedules here.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <div className="space-y-1">
                                <Label>Mode</Label>
                                <Select value={scheduleMode} onValueChange={setScheduleMode}>
                                    <SelectTrigger data-testid="schedule-mode-select"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="doubles_only">Doubles Only</SelectItem>
                                        <SelectItem value="hybrid">Hybrid</SelectItem>
                                        <SelectItem value="singles_only">Singles only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Optimization</Label>
                                <Select value={optimizationMode} onValueChange={setOptimizationMode}>
                                    <SelectTrigger data-testid="optimization-mode-select"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="balanced">Balanced</SelectItem>
                                        <SelectItem value="maximize_play_time">Maximize Play Time</SelectItem>
                                        <SelectItem value="maximize_fairness">Maximize Fairness</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    variant={allowCanadianDoubles ? 'default' : 'outline'}
                                    className={allowCanadianDoubles ? 'bg-[#0051BA] hover:bg-[#003E94] w-full' : 'w-full'}
                                    onClick={() => setAllowCanadianDoubles(prev => !prev)}
                                    data-testid="toggle-canadian-doubles-btn"
                                >
                                    Canadian Doubles: {allowCanadianDoubles ? 'On' : 'Off'}
                                </Button>
                            </div>
                        </div>
                            {events.map(ev => {
                                const confirmed = getConfirmed(ev);
                                const bench = getBench(ev);
                                const maybe = (ev.checkins || []).filter(c => c.status === 'maybe');
                                const maxPlayers = (ev.num_courts || 2) * 4;
                                const rsvpClosed = ev.rsvp_closed;
                                return (
                                    <div key={ev.id} className="p-4 border border-gray-100 rounded-lg space-y-3" data-testid={`admin-event-${ev.id}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold">{ev.title}</h4>
                                                <p className="text-sm text-gray-500">{new Date(ev.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {rsvpClosed && <Badge className="bg-red-100 text-red-700"><Lock className="w-3 h-3 mr-1" />Closed</Badge>}
                                                {ev.is_admin_overridden && <Badge className="bg-amber-100 text-amber-800">Admin Edited</Badge>}
                                                <Badge className={ev.status === 'scheduled' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>{ev.status}</Badge>
                                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteEvent(ev)}><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 text-sm">
                                            <span className="text-green-700"><UserCheck className="w-4 h-4 inline mr-1" />{confirmed.length}/{maxPlayers} Confirmed</span>
                                            <span className="text-orange-700"><Armchair className="w-4 h-4 inline mr-1" />{bench.length} Bench</span>
                                            <span className="text-amber-700">{maybe.length} Maybe</span>
                                        </div>

                                        {confirmed.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {confirmed.map((p, i) => (
                                                    <Badge key={p.id} className={`text-xs ${p.external ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                        {i+1}. {p.name}{p.external ? ' (guest)' : ''}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        {bench.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                <span className="text-xs text-orange-600 mr-1">Bench:</span>
                                                {bench.map((p, i) => <Badge key={p.id || i} className="bg-orange-100 text-orange-800 text-xs">#{i+1} {p.name}</Badge>)}
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            {ev.status === 'open' && !rsvpClosed && (
                                                <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleCloseRsvp(ev)}>
                                                    <Lock className="w-4 h-4 mr-1" /> Close RSVP
                                                </Button>
                                            )}
                                            {rsvpClosed && ev.status === 'open' && (
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => handleReopenRsvp(ev)}>
                                                    <Unlock className="w-3 h-3 mr-1" /> Reopen
                                                </Button>
                                            )}
                                            {confirmed.length >= (scheduleMode === 'singles_only' ? 2 : 4) && (
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleGenerate(ev)} disabled={loading}>
                                                    <Shuffle className="w-4 h-4 mr-1" />{ev.generated_schedule ? 'Regenerate' : 'Generate'} Schedule
                                                </Button>
                                            )}
                                        </div>

                                        <div className="flex gap-2 items-center pt-2 border-t border-gray-50">
                                            <Input placeholder="Add non-member" value={extNames[ev.id] || ''} onChange={e => setExtNames(prev => ({ ...prev, [ev.id]: e.target.value }))} className="h-8 text-sm flex-1" />
                                            <Button size="sm" variant="outline" onClick={() => handleAddExternal(ev)} disabled={!(extNames[ev.id] || '').trim()}>
                                                <UserPlus className="w-4 h-4" />
                                            </Button>
                                        </div>

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
                {onClearEvents && (
                    <div className="lg:col-span-2 pt-2">
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { if (window.confirm('Delete all events, schedules & check-ins?')) onClearEvents(); }} data-testid="clear-events-btn">
                            <Trash2 className="w-3 h-3 mr-1" /> Clear All Events & Schedules
                        </Button>
                    </div>
                )}
            </div>
        </TabsContent>
    );
}
