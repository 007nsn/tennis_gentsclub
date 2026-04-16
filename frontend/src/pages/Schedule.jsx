import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import {
    getSchedules, getUpcomingWeeklyEvents, getWeeklyEvent,
    submitCheckIn, getMyCheckIn, getCheckInWindow,
    createWeeklyEvent, approvePlayers, adminOverride,
    cancelPlayerSpot, generateDoublesSchedule, deleteWeeklyEvent,
    getEventCheckIns
} from '../lib/api';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import {
    Calendar, Clock, MapPin, Users, Check, X, HelpCircle,
    Plus, Loader2, Shield, UserCheck, UserX, ListChecks,
    Shuffle, Trash2, ChevronDown, ChevronUp, CloudSun
} from 'lucide-react';

function CheckInButton({ eventId, onUpdate }) {
    const { user } = useAuth();
    const [myStatus, setMyStatus] = useState(null);
    const [windowOpen, setWindowOpen] = useState(false);
    const [windowInfo, setWindowInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!user || !eventId) return;
        Promise.all([
            getMyCheckIn(eventId).then(r => setMyStatus(r.data.status)),
            getCheckInWindow(eventId).then(r => { setWindowOpen(r.data.is_open); setWindowInfo(r.data); })
        ]).finally(() => setLoading(false));
    }, [eventId, user]);

    const handleCheckIn = async (status) => {
        setSubmitting(true);
        try {
            await submitCheckIn({ event_id: eventId, status });
            setMyStatus(status);
            toast.success(status === 'available' ? "You're in!" : status === 'maybe' ? 'Marked as Maybe' : 'Marked as unavailable');
            onUpdate?.();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to check in');
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) return null;
    if (loading) return <div className="text-sm text-gray-400">Loading...</div>;

    if (!windowOpen) {
        const opensAt = windowInfo?.opens_at ? new Date(windowInfo.opens_at) : null;
        return (
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3" data-testid="checkin-closed">
                <Clock className="w-4 h-4 inline mr-1" />
                Check-in opens Monday at 7:00 AM ({windowInfo?.timezone || 'US/Eastern'})
                {opensAt && <div className="text-xs mt-1">{opensAt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>}
            </div>
        );
    }

    const statusConfig = {
        available: { label: 'Available', icon: Check, color: 'bg-green-500 hover:bg-green-600 text-white' },
        maybe: { label: 'Maybe', icon: HelpCircle, color: 'bg-amber-500 hover:bg-amber-600 text-white' },
        not_available: { label: 'Not Available', icon: X, color: 'bg-red-500 hover:bg-red-600 text-white' },
    };

    return (
        <div data-testid="checkin-buttons">
            <p className="text-sm font-medium mb-2">Your RSVP:</p>
            <div className="flex gap-2 flex-wrap">
                {Object.entries(statusConfig).map(([status, cfg]) => {
                    const Icon = cfg.icon;
                    const isActive = myStatus === status;
                    return (
                        <Button
                            key={status}
                            size="sm"
                            disabled={submitting}
                            className={isActive ? cfg.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                            onClick={() => handleCheckIn(status)}
                            data-testid={`checkin-${status}`}
                        >
                            <Icon className="w-4 h-4 mr-1" />
                            {cfg.label}
                        </Button>
                    );
                })}
            </div>
            {myStatus && (
                <p className="text-xs text-gray-500 mt-1">
                    Current: <span className="font-medium capitalize">{myStatus.replace('_', ' ')}</span>
                </p>
            )}
        </div>
    );
}

function GeneratedScheduleDisplay({ schedule }) {
    if (!schedule || schedule.length === 0) return null;

    return (
        <div className="mt-4 space-y-3" data-testid="generated-schedule">
            <h4 className="font-bold text-sm uppercase text-[#0051BA] flex items-center gap-2">
                <Shuffle className="w-4 h-4" />
                Doubles Round Robin
            </h4>
            {schedule.map((round) => (
                <div key={round.round} className="bg-gray-50 rounded-lg p-3">
                    <div className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Badge className="bg-[#0051BA] text-white">Round {round.round}</Badge>
                        {round.time && <span className="text-gray-500 text-xs">{round.time}</span>}
                    </div>
                    <div className="space-y-2">
                        {round.matches.map((match, mIdx) => (
                            <div key={`r${round.round}-m${mIdx}`} className="flex items-center gap-2 text-sm bg-white rounded p-2 border border-gray-100">
                                <Badge variant="outline" className="text-xs shrink-0">Court {match.court}</Badge>
                                <span className="font-medium text-green-700">
                                    {match.team_a.map(p => p.name).join(' & ')}
                                </span>
                                <span className="text-gray-400 text-xs">vs</span>
                                <span className="font-medium text-blue-700">
                                    {match.team_b.map(p => p.name).join(' & ')}
                                </span>
                            </div>
                        ))}
                        {round.byes?.length > 0 && (
                            <div className="text-xs text-gray-500 italic">
                                Bye: {round.byes.map(b => b.name).join(', ')}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function AdminEventPanel({ event, onRefresh }) {
    const [checkins, setCheckins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [expanded, setExpanded] = useState(true);

    const loadCheckins = useCallback(async () => {
        try {
            const res = await getEventCheckIns(event.id);
            setCheckins(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [event.id]);

    useEffect(() => { loadCheckins(); }, [loadCheckins]);

    const available = checkins.filter(c => c.status === 'available');
    const maybe = checkins.filter(c => c.status === 'maybe');
    const approved = event.approved_players || [];
    const waitlist = event.waitlist_players || [];

    const handleApproveAll = async () => {
        const ids = available.map(c => c.user_id);
        const maybeIds = maybe.map(c => c.user_id);
        try {
            await approvePlayers(event.id, {
                event_id: event.id,
                approved_player_ids: ids,
                waitlist_player_ids: maybeIds
            });
            toast.success('Players approved!');
            onRefresh();
        } catch (e) { toast.error('Failed to approve'); }
    };

    const handleOverride = async (playerId, action) => {
        try {
            await adminOverride(event.id, { event_id: event.id, player_id: playerId, action });
            toast.success('Player updated');
            onRefresh();
        } catch (e) { toast.error('Override failed'); }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await generateDoublesSchedule(event.id, { event_id: event.id });
            toast.success('Doubles schedule generated!');
            onRefresh();
        } catch (e) { toast.error(e.response?.data?.detail || 'Failed to generate schedule'); }
        finally { setGenerating(false); }
    };

    const handleDelete = async () => {
        try {
            await deleteWeeklyEvent(event.id);
            toast.success('Event deleted');
            onRefresh();
        } catch (e) { toast.error('Delete failed'); }
    };

    return (
        <Card className="border-l-4 border-l-[#0051BA] shadow-[0_2px_8px_rgba(0,0,0,0.06)]" data-testid={`admin-event-${event.id}`}>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#0051BA]" />
                        Admin: {event.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge className={event.status === 'scheduled' ? 'bg-green-100 text-green-800' : event.status === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}>
                            {event.status}
                        </Badge>
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </CardHeader>
            {expanded && (
                <CardContent className="space-y-4">
                    {loading ? <p className="text-sm text-gray-500">Loading check-ins...</p> : (
                        <>
                            {/* Check-in summary */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-green-700">{available.length}</div>
                                    <div className="text-xs text-green-600">Available</div>
                                </div>
                                <div className="bg-amber-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-amber-700">{maybe.length}</div>
                                    <div className="text-xs text-amber-600">Maybe</div>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-700">{approved.length}</div>
                                    <div className="text-xs text-blue-600">Approved</div>
                                </div>
                            </div>

                            {/* Available players */}
                            {available.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-1 flex items-center gap-1"><UserCheck className="w-4 h-4 text-green-600" /> Available:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {available.map(c => (
                                            <Badge key={c.user_id} className="bg-green-100 text-green-800">{c.user_name}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {maybe.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-1 flex items-center gap-1"><HelpCircle className="w-4 h-4 text-amber-600" /> Maybe:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {maybe.map(c => (
                                            <Badge key={c.user_id} className="bg-amber-100 text-amber-800">{c.user_name}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Approved / Waitlist */}
                            {approved.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-1 flex items-center gap-1"><ListChecks className="w-4 h-4 text-blue-600" /> Approved ({approved.length}):</p>
                                    <div className="flex flex-wrap gap-1">
                                        {approved.map(p => (
                                            <Badge key={p.id} className="bg-blue-100 text-blue-800 pr-1">
                                                {p.name}
                                                <button onClick={() => handleOverride(p.id, 'move_to_waitlist')} className="ml-1 hover:text-red-600" title="Move to waitlist"><X className="w-3 h-3" /></button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {waitlist.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-1 text-gray-500">Waitlist ({waitlist.length}):</p>
                                    <div className="flex flex-wrap gap-1">
                                        {waitlist.map(p => (
                                            <Badge key={p.id} variant="outline" className="pr-1">
                                                {p.name}
                                                <button onClick={() => handleOverride(p.id, 'add_approved')} className="ml-1 hover:text-green-600" title="Promote to approved"><Check className="w-3 h-3" /></button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                                {event.status === 'open' && available.length > 0 && (
                                    <Button size="sm" className="bg-[#0051BA]" onClick={handleApproveAll} data-testid="approve-all-btn">
                                        <UserCheck className="w-4 h-4 mr-1" />
                                        Approve Available ({available.length})
                                    </Button>
                                )}
                                {(event.status === 'approved' && approved.length >= 4) && (
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleGenerate} disabled={generating} data-testid="generate-schedule-btn">
                                        {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Shuffle className="w-4 h-4 mr-1" />}
                                        Generate Doubles Schedule
                                    </Button>
                                )}
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={handleDelete}>
                                    <Trash2 className="w-4 h-4 mr-1" /> Delete Event
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            )}
        </Card>
    );
}

export default function Schedule() {
    const { user, isAdmin } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [weeklyEvents, setWeeklyEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newEventDate, setNewEventDate] = useState('');
    const [creating, setCreating] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [schedulesRes, eventsRes] = await Promise.all([
                getSchedules(),
                getUpcomingWeeklyEvents().catch(() => ({ data: [] }))
            ]);
            setSchedules(schedulesRes.data);
            setWeeklyEvents(eventsRes.data);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const refreshEvents = useCallback(async () => {
        const eventsRes = await getUpcomingWeeklyEvents().catch(() => ({ data: [] }));
        setWeeklyEvents(eventsRes.data);
    }, []);

    const scheduleDates = schedules.map(s => new Date(s.match_date).toDateString());
    const eventDates = weeklyEvents.map(e => new Date(e.event_date).toDateString());
    const allDates = [...scheduleDates, ...eventDates];

    const calendarModifiers = useMemo(() => ({
        hasMatch: (date) => allDates.includes(date.toDateString())
    }), [allDates]);

    const calendarModifierStyles = useMemo(() => ({
        hasMatch: { backgroundColor: '#CCFF00', color: '#002040', fontWeight: 'bold' }
    }), []);

    const filteredSchedules = schedules.filter(s =>
        new Date(s.match_date).toDateString() === selectedDate.toDateString()
    );

    const handleCreateEvent = async () => {
        if (!newEventDate) { toast.error('Select a date'); return; }
        setCreating(true);
        try {
            await createWeeklyEvent({ event_date: newEventDate });
            toast.success('Sunday event created!');
            setNewEventDate('');
            setShowCreateForm(false);
            refreshEvents();
        } catch (e) { toast.error('Failed to create event'); }
        finally { setCreating(false); }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="schedule-page">
            <div className="mb-8">
                <h1 className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black uppercase tracking-tight text-[#0F172A]">
                    Match Schedule
                </h1>
                <p className="text-gray-600 mt-2">Weekly check-in, round robin matches, and upcoming events</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left: Calendar + Admin Create */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <CardHeader>
                            <CardTitle className="font-['Barlow_Condensed'] uppercase">Select Date</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CalendarComponent
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                className="rounded-lg"
                                modifiers={calendarModifiers}
                                modifiersStyles={calendarModifierStyles}
                            />
                        </CardContent>
                    </Card>

                    {/* Weather Shortcut */}
                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <CardContent className="p-4">
                            <a
                                href="https://weather.com/weather/today/l/Hawthorne+NY+10532"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 group"
                                data-testid="weather-link"
                            >
                                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                                    <CloudSun className="w-5 h-5 text-sky-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm group-hover:text-[#0051BA] transition-colors">Hawthorne, NY Weather</p>
                                    <p className="text-xs text-gray-500">Check conditions for Sunday</p>
                                </div>
                            </a>
                        </CardContent>
                    </Card>

                    {/* Admin: Create Sunday Event */}
                    {isAdmin && (
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-[#0051BA]" />
                                    Create Sunday Event
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {showCreateForm ? (
                                    <div className="space-y-3">
                                        <div>
                                            <Label className="text-sm">Sunday Date</Label>
                                            <Input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} data-testid="new-event-date" />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="bg-[#0051BA]" onClick={handleCreateEvent} disabled={creating} data-testid="create-event-btn">
                                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                                                Create
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button size="sm" variant="outline" className="w-full" onClick={() => setShowCreateForm(true)} data-testid="show-create-event-btn">
                                        <Plus className="w-4 h-4 mr-1" /> New Sunday Event
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Events + Schedules */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Weekly Events with Check-In */}
                    {weeklyEvents.length > 0 && (
                        <div>
                            <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-[#0051BA]" />
                                Upcoming Sunday Events
                            </h2>
                            <div className="space-y-4">
                                {weeklyEvents.map(event => (
                                    <Card key={event.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-testid={`weekly-event-${event.id}`}>
                                        <CardContent className="p-6">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="font-bold text-lg">{event.title}</h3>
                                                        <Badge className={event.status === 'scheduled' ? 'bg-green-100 text-green-800' : event.status === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-[#CCFF00] text-[#002040]'}>
                                                            {event.status === 'scheduled' ? 'Schedule Ready' : event.status === 'approved' ? 'Approved' : 'Check-in Open'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                                                        <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                                                        <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{event.start_time}</div>
                                                        <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{event.location}</div>
                                                        <div className="flex items-center gap-1"><Users className="w-4 h-4" />{event.num_courts} court{event.num_courts > 1 ? 's' : ''}</div>
                                                    </div>

                                                    {/* Approved players display */}
                                                    {event.approved_players?.length > 0 && (
                                                        <div className="mb-3">
                                                            <p className="text-xs font-medium text-gray-500 mb-1">Playing ({event.approved_players.length}):</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {event.approved_players.map(p => (
                                                                    <Badge key={p.id} className="bg-green-100 text-green-800 text-xs">{p.name}</Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {event.waitlist_players?.length > 0 && (
                                                        <div className="mb-3">
                                                            <p className="text-xs font-medium text-gray-500 mb-1">Waitlist ({event.waitlist_players.length}):</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {event.waitlist_players.map(p => (
                                                                    <Badge key={p.id} variant="outline" className="text-xs">{p.name}</Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Generated Schedule */}
                                                    <GeneratedScheduleDisplay schedule={event.generated_schedule} />
                                                </div>

                                                {/* Check-in area */}
                                                <div className="md:w-64 shrink-0">
                                                    {user && event.status !== 'scheduled' ? (
                                                        <CheckInButton eventId={event.id} onUpdate={refreshEvents} />
                                                    ) : event.status === 'scheduled' && user && event.approved_players?.some(p => p.id === user.id) ? (
                                                        <div>
                                                            <Badge className="bg-green-100 text-green-800 mb-2">You're playing!</Badge>
                                                            <Button size="sm" variant="outline" className="text-red-500 w-full" onClick={async () => { await cancelPlayerSpot(event.id); refreshEvents(); }} data-testid="cancel-spot-btn">
                                                                <UserX className="w-4 h-4 mr-1" /> Cancel My Spot
                                                            </Button>
                                                        </div>
                                                    ) : !user ? (
                                                        <p className="text-sm text-gray-500">Log in to check in</p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Admin Panels for each event */}
                    {isAdmin && weeklyEvents.length > 0 && (
                        <div>
                            <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-[#0051BA]" />
                                Admin Controls
                            </h2>
                            <div className="space-y-4">
                                {weeklyEvents.map(event => (
                                    <AdminEventPanel key={event.id} event={event} onRefresh={refreshEvents} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Existing schedules for selected date */}
                    {filteredSchedules.length > 0 && (
                        <div>
                            <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-[#0051BA]" />
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h2>
                            <div className="space-y-4">
                                {filteredSchedules.map(schedule => (
                                    <Card key={schedule.id} className="match-card border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-testid={`schedule-item-${schedule.id}`}>
                                        <CardContent className="p-6">
                                            <h3 className="font-bold text-lg mb-2">{schedule.title}</h3>
                                            {schedule.description && <p className="text-gray-600 text-sm mb-3">{schedule.description}</p>}
                                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{schedule.match_time}</div>
                                                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{schedule.location}</div>
                                            </div>
                                            {schedule.teams?.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {schedule.teams.map((team) => (
                                                        <Badge key={team} variant="outline" className="border-[#0051BA] text-[#0051BA]">
                                                            <Users className="w-3 h-3 mr-1" />{team}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && weeklyEvents.length === 0 && filteredSchedules.length === 0 && (
                        <Card className="border-none">
                            <CardContent className="p-8 text-center text-gray-500">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>No upcoming events or matches scheduled</p>
                                {isAdmin && <p className="text-sm mt-2">Create a Sunday event using the panel on the left.</p>}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
