import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import {
    getSchedules, getUpcomingWeeklyEvents,
    submitCheckIn, getMyCheckIn, getCheckInWindow,
    createWeeklyEvent, adminOverride,
    cancelPlayerSpot, generateDoublesSchedule, deleteWeeklyEvent,
    getEventCheckIns, closeRsvp, reopenRsvp, dropOutFromEvent,
    addPlayersToEvent, editSchedule, restoreLastEvent, getSoloLadder,
    getUsers
} from '../lib/api';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import {
    Calendar, Clock, MapPin, Users, Check, X, HelpCircle,
    Plus, Loader2, Shield, UserCheck, UserX, ListChecks,
    Shuffle, Trash2, ChevronDown, ChevronUp, CloudSun,
    Lock, Unlock, LogOut, UserPlus, Armchair, Edit3, Save
} from 'lucide-react';
import { NotificationToggle } from '../components/NotificationToggle';

// Backward-compatible: old events use approved_players, new use confirmed_players
const getConfirmed = (event) => event.confirmed_players || event.approved_players || [];
const getBench = (event) => event.bench_players || event.waitlist_players || [];

function CheckInButton({ eventId, event, onUpdate }) {
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

    const handleRsvp = async (status) => {
        setSubmitting(true);
        try {
            const res = await submitCheckIn({ event_id: eventId, status });
            setMyStatus(res.data.status);
            toast.success(res.data.message);
            onUpdate?.();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) return null;
    if (loading) return <div className="text-sm text-gray-400">Loading...</div>;

    const openDayName = windowInfo?.open_day_name || 'Wednesday';
    const openHour = windowInfo?.open_hour ?? 7;
    const rsvpClosed = windowInfo?.rsvp_closed;
    const maxPlayers = (event?.num_courts || 2) * 4;
    const confirmedCount = getConfirmed(event || {}).length;
    const spotsLeft = Math.max(0, maxPlayers - confirmedCount);

    if (!windowOpen) {
        return (
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3" data-testid="checkin-closed">
                <Clock className="w-4 h-4 inline mr-1" />
                RSVP opens {openDayName} at {openHour}:00 AM ({windowInfo?.timezone || 'US/Eastern'})
            </div>
        );
    }

    const isConfirmed = myStatus === 'confirmed';
    const isBenched = myStatus === 'bench';
    const isCancelled = myStatus === 'cancelled' || myStatus === 'not_available';

    return (
        <div data-testid="checkin-buttons">
            {/* Spots info */}
            <div className="text-xs text-gray-500 mb-2">
                {spotsLeft > 0 ? (
                    <span className="text-green-600 font-medium">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</span>
                ) : (
                    <span className="text-orange-600 font-medium">Courts full — new RSVPs go to Bench</span>
                )}
                {rsvpClosed && <span className="text-red-500 ml-2 font-medium">(RSVP Closed)</span>}
            </div>

            {isConfirmed ? (
                <div>
                    <Badge className="bg-green-500 text-white mb-2"><Check className="w-3 h-3 mr-1" />Confirmed</Badge>
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 w-full" onClick={() => handleRsvp('not_available')} disabled={submitting} data-testid="drop-out-btn">
                        <LogOut className="w-4 h-4 mr-1" /> Drop Out
                    </Button>
                </div>
            ) : isBenched ? (
                <div>
                    <Badge className="bg-orange-500 text-white mb-2"><Armchair className="w-3 h-3 mr-1" />On the Bench</Badge>
                    <p className="text-xs text-gray-500 mb-2">You'll be auto-promoted if a spot opens</p>
                    <NotificationToggle compact />
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 w-full mt-2" onClick={() => handleRsvp('not_available')} disabled={submitting}>
                        <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white w-full" onClick={() => handleRsvp('available')} disabled={submitting} data-testid="rsvp-btn">
                        {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                        {spotsLeft > 0 && !rsvpClosed ? 'RSVP — I\'m In!' : 'Join Bench'}
                    </Button>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 text-amber-600" onClick={() => handleRsvp('maybe')} disabled={submitting || rsvpClosed} data-testid="checkin-maybe">
                            <HelpCircle className="w-3 h-3 mr-1" /> Maybe
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-gray-500" onClick={() => handleRsvp('not_available')} disabled={submitting} data-testid="checkin-not-available">
                            <X className="w-3 h-3 mr-1" /> Can't
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function PlayersList({ event, onUpdate }) {
    const { user } = useAuth();
    const confirmed = getConfirmed(event);
    const bench = getBench(event);
    const maxPlayers = (event.num_courts || 2) * 4;
    const [dropping, setDropping] = useState(false);

    const isPlayerConfirmed = user && confirmed.some(p => p.id === user.id);

    const handleDropOut = async () => {
        setDropping(true);
        try {
            const res = await dropOutFromEvent(event.id);
            toast.success(res.data.message);
            onUpdate?.();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        } finally {
            setDropping(false);
        }
    };

    return (
        <div>
            {confirmed.length > 0 && (
                <div className="mb-3" data-testid="confirmed-players-list">
                    <p className="text-xs font-medium text-gray-500 mb-1">Confirmed ({confirmed.length}/{maxPlayers}):</p>
                    <div className="flex flex-wrap gap-1">
                        {confirmed.map((p, i) => (
                            <Badge key={p.id} className={`text-xs ${p.external ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                {i + 1}. {p.name}{p.external ? ' (guest)' : ''}
                            </Badge>
                        ))}
                    </div>
                    {isPlayerConfirmed && event.status !== 'scheduled' && (
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 mt-2" onClick={handleDropOut} disabled={dropping} data-testid="drop-out-list-btn">
                            {dropping ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LogOut className="w-4 h-4 mr-1" />}
                            Drop Out
                        </Button>
                    )}
                </div>
            )}

            {/* The Bench - always visible */}
            <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-100" data-testid="the-bench-section">
                <p className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                    <Armchair className="w-4 h-4" />
                    The Bench
                    {bench.length > 0 && <Badge className="bg-orange-200 text-orange-800 text-[10px]">{bench.length} waiting</Badge>}
                </p>
                {bench.length > 0 ? (
                    <div className="space-y-1">
                        {bench.map((p, i) => (
                            <div key={p.id || i} className="flex items-center gap-2 text-sm" data-testid={`bench-player-${i+1}`}>
                                <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                                <span className="text-orange-900">{p.name}</span>
                                {p.timestamp && (
                                    <span className="text-[10px] text-orange-400 ml-auto">
                                        {new Date(p.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-orange-400 italic">No one on the bench</p>
                )}
            </div>
        </div>
    );
}

function EditableScheduleDisplay({ event, onRefresh, isAdmin }) {
    const schedule = event.generated_schedule;
    const [editing, setEditing] = useState(false);
    const [editedSchedule, setEditedSchedule] = useState(null);
    const [saving, setSaving] = useState(false);
    const bench = getBench(event);
    const confirmed = getConfirmed(event);
    const allPlayers = [...confirmed, ...bench];

    if (!schedule || schedule.length === 0) return null;

    const handlePlayerSwap = (roundIdx, matchIdx, team, playerIdx, newPlayerId) => {
        if (!editedSchedule) return;
        const newSchedule = JSON.parse(JSON.stringify(editedSchedule));
        const player = allPlayers.find(p => p.id === newPlayerId);
        if (player) {
            newSchedule[roundIdx].matches[matchIdx][team][playerIdx] = { id: player.id, name: player.name };
        }
        setEditedSchedule(newSchedule);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await editSchedule(event.id, { schedule: editedSchedule });
            toast.success('Schedule updated. Admin override active.');
            setEditing(false);
            onRefresh?.();
        } catch (err) {
            toast.error('Failed to save schedule');
        } finally {
            setSaving(false);
        }
    };

    const startEditing = () => {
        setEditedSchedule(JSON.parse(JSON.stringify(schedule)));
        setEditing(true);
    };

    const displaySchedule = editing ? editedSchedule : schedule;

    return (
        <div className="mt-4 space-y-3" data-testid="generated-schedule">
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm uppercase text-[#0051BA] flex items-center gap-2">
                    <Shuffle className="w-4 h-4" />
                    Doubles Round Robin
                    {event.is_admin_overridden && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Admin Edited</Badge>}
                </h4>
                {isAdmin && (
                    <div className="flex gap-1">
                        {editing ? (
                            <>
                                <Button size="sm" variant="outline" className="h-7 text-xs text-green-600" onClick={handleSave} disabled={saving}>
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />} Save
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
                            </>
                        ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={startEditing} data-testid="edit-schedule-btn">
                                <Edit3 className="w-3 h-3 mr-1" /> Edit
                            </Button>
                        )}
                    </div>
                )}
            </div>
            {displaySchedule.map((round, rIdx) => (
                <div key={round.round} className="bg-gray-50 rounded-lg p-3">
                    <div className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Badge className="bg-[#0051BA] text-white">Round {round.round}</Badge>
                        {round.time && <span className="text-gray-500 text-xs">{round.time}</span>}
                    </div>
                    <div className="space-y-2">
                        {round.matches.map((match, mIdx) => (
                            <div key={`r${rIdx}-m${mIdx}`} className="flex items-center gap-2 text-sm bg-white rounded p-2 border border-gray-100">
                                <Badge variant="outline" className="text-xs shrink-0">Court {match.court}</Badge>
                                {editing ? (
                                    <>
                                        <div className="flex gap-1">
                                            {match.team_a.map((p, pIdx) => (
                                                <Select key={`a-${pIdx}`} value={p.id} onValueChange={(v) => handlePlayerSwap(rIdx, mIdx, 'team_a', pIdx, v)}>
                                                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{allPlayers.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            ))}
                                        </div>
                                        <span className="text-gray-400 text-xs">vs</span>
                                        <div className="flex gap-1">
                                            {match.team_b.map((p, pIdx) => (
                                                <Select key={`b-${pIdx}`} value={p.id} onValueChange={(v) => handlePlayerSwap(rIdx, mIdx, 'team_b', pIdx, v)}>
                                                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{allPlayers.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-medium text-green-700">{match.team_a.map(p => p.name).join(' & ')}</span>
                                        <span className="text-gray-400 text-xs">vs</span>
                                        <span className="font-medium text-blue-700">{match.team_b.map(p => p.name).join(' & ')}</span>
                                    </>
                                )}
                            </div>
                        ))}
                        {round.byes?.length > 0 && (
                            <div className="text-xs text-gray-500 italic">Bye: {round.byes.map(b => b.name).join(', ')}</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function AdminEventPanel({ event, onRefresh, allPlayers: registeredPlayers }) {
    const [checkins, setCheckins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
    const [addingPlayers, setAddingPlayers] = useState(false);

    const loadCheckins = useCallback(async () => {
        try {
            const res = await getEventCheckIns(event.id);
            setCheckins(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [event.id]);

    useEffect(() => { loadCheckins(); }, [loadCheckins]);

    const maybe = checkins.filter(c => c.status === 'maybe');
    const confirmed = getConfirmed(event);
    const bench = getBench(event);
    const maxPlayers = (event.num_courts || 2) * 4;
    const rsvpClosed = event.rsvp_closed;

    // Filter out already-confirmed players from the dropdown
    const confirmedIds = new Set(confirmed.map(p => p.id));
    const availableToAdd = (registeredPlayers || []).filter(p => !confirmedIds.has(p.id || p.user_id));

    const handleGenerate = async () => {
        if (event.is_admin_overridden) {
            if (!window.confirm('This will overwrite the admin-edited schedule. Continue?')) return;
        }
        setGenerating(true);
        try {
            await generateDoublesSchedule(event.id, { event_id: event.id });
            toast.success('Doubles schedule generated!');
            onRefresh();
        } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
        finally { setGenerating(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this event? You can restore it later.')) return;
        try { await deleteWeeklyEvent(event.id); toast.success('Event deleted'); onRefresh(); }
        catch (e) { toast.error('Delete failed'); }
    };

    const handleRestore = async () => {
        try {
            const res = await restoreLastEvent();
            toast.success(res.data.message);
            onRefresh();
        } catch (e) { toast.error(e.response?.data?.detail || 'Nothing to restore'); }
    };

    const handleCloseRsvp = async () => {
        try { await closeRsvp(event.id); toast.success('RSVP closed.'); onRefresh(); }
        catch (e) { toast.error('Failed'); }
    };

    const handleReopenRsvp = async () => {
        try { await reopenRsvp(event.id); toast.success('RSVP reopened.'); onRefresh(); }
        catch (e) { toast.error('Failed'); }
    };

    const togglePlayer = (playerId) => {
        setSelectedPlayerIds(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
    };

    const handleAddPlayers = async () => {
        if (selectedPlayerIds.length === 0) return;
        setAddingPlayers(true);
        try {
            const res = await addPlayersToEvent(event.id, { player_ids: selectedPlayerIds });
            toast.success(res.data.message);
            setSelectedPlayerIds([]);
            onRefresh();
        } catch (e) { toast.error('Failed to add players'); }
        finally { setAddingPlayers(false); }
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
                        {rsvpClosed && <Badge className="bg-red-100 text-red-700">RSVP Closed</Badge>}
                        <Badge className={event.status === 'scheduled' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                            {event.status}
                        </Badge>
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </CardHeader>
            {expanded && (
                <CardContent className="space-y-4">
                    {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
                        <>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-green-700">{confirmed.length}</div>
                                    <div className="text-xs text-green-600">Confirmed / {maxPlayers}</div>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-orange-700">{bench.length}</div>
                                    <div className="text-xs text-orange-600">Bench</div>
                                </div>
                                <div className="bg-amber-50 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-amber-700">{maybe.length}</div>
                                    <div className="text-xs text-amber-600">Maybe</div>
                                </div>
                            </div>

                            {confirmed.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-1 flex items-center gap-1"><UserCheck className="w-4 h-4 text-green-600" /> Confirmed:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {confirmed.map((p, i) => (
                                            <Badge key={p.id} className={`text-xs ${p.external ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                {i+1}. {p.name}{p.external ? ' (guest)' : ''}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {bench.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-1 flex items-center gap-1"><Armchair className="w-4 h-4 text-orange-600" /> Bench:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {bench.map((p, i) => (
                                            <Badge key={p.id || i} className="bg-orange-100 text-orange-800 text-xs">#{i+1} {p.name}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add registered players */}
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                                    <UserPlus className="w-3 h-3" /> Add Player from Roster:
                                </p>
                                {availableToAdd.length > 0 ? (
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                                            {availableToAdd.map(p => {
                                                const pid = p.id || p.user_id;
                                                const isSelected = selectedPlayerIds.includes(pid);
                                                return (
                                                    <Badge
                                                        key={pid}
                                                        className={`text-xs cursor-pointer select-none transition-colors ${isSelected ? 'bg-[#0051BA] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                        onClick={() => togglePlayer(pid)}
                                                        data-testid={`select-player-${pid}`}
                                                    >
                                                        {isSelected ? <Check className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                                                        {p.name}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                        {selectedPlayerIds.length > 0 && (
                                            <Button size="sm" className="bg-[#0051BA]" onClick={handleAddPlayers} disabled={addingPlayers} data-testid="add-selected-players-btn">
                                                {addingPlayers ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
                                                Add {selectedPlayerIds.length} Player{selectedPlayerIds.length > 1 ? 's' : ''}
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400">All registered players already added</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                                {event.status === 'open' && !rsvpClosed && (
                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={handleCloseRsvp} data-testid="close-rsvp-btn">
                                        <Lock className="w-4 h-4 mr-1" /> Close RSVP
                                    </Button>
                                )}
                                {rsvpClosed && event.status === 'open' && (
                                    <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={handleReopenRsvp} data-testid="reopen-rsvp-btn">
                                        <Unlock className="w-4 h-4 mr-1" /> Reopen RSVP
                                    </Button>
                                )}
                                {confirmed.length >= 4 && (
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleGenerate} disabled={generating} data-testid="generate-schedule-btn">
                                        {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Shuffle className="w-4 h-4 mr-1" />}
                                        {event.generated_schedule ? 'Regenerate' : 'Generate'} Schedule
                                    </Button>
                                )}
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={handleDelete} data-testid="delete-event-btn">
                                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                                </Button>
                                <Button size="sm" variant="ghost" className="text-blue-500" onClick={handleRestore} data-testid="restore-event-btn">
                                    <Plus className="w-4 h-4 mr-1" /> Restore
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
    const [registeredPlayers, setRegisteredPlayers] = useState([]);

    const upcomingSundays = useMemo(() => {
        const today = new Date();
        const sundays = [];
        let d = new Date(today);
        const daysUntilSunday = (7 - d.getDay()) % 7;
        d.setDate(d.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
        for (let i = 0; i < 4; i++) {
            sundays.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
            d.setDate(d.getDate() + 7);
        }
        return sundays;
    }, []);

    const loadData = useCallback(async () => {
        try {
            const [schedulesRes, eventsRes] = await Promise.all([
                getSchedules(),
                getUpcomingWeeklyEvents().catch(() => ({ data: [] }))
            ]);
            setSchedules(schedulesRes.data);
            setWeeklyEvents(eventsRes.data);
            // Load registered players for admin dropdown
            if (isAdmin) {
                try {
                    const usersRes = await getUsers();
                    // Filter out admin accounts, keep only regular players
                    setRegisteredPlayers(usersRes.data.filter(u => u.role !== 'admin'));
                } catch (e) { /* ignore */ }
            }
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
                <p className="text-gray-600 mt-2">Weekly RSVP, round robin matches, and upcoming events</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <CardHeader><CardTitle className="font-['Barlow_Condensed'] uppercase">Select Date</CardTitle></CardHeader>
                        <CardContent>
                            <CalendarComponent mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} className="rounded-lg" modifiers={calendarModifiers} modifiersStyles={calendarModifierStyles} />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <CardContent className="p-4">
                            <a href="https://weather.com/weather/today/l/Hawthorne+NY+10532" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group" data-testid="weather-link">
                                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center group-hover:bg-sky-200 transition-colors"><CloudSun className="w-5 h-5 text-sky-600" /></div>
                                <div>
                                    <p className="font-medium text-sm group-hover:text-[#0051BA] transition-colors">Hawthorne, NY Weather</p>
                                    <p className="text-xs text-gray-500">Check conditions for Sunday</p>
                                </div>
                            </a>
                        </CardContent>
                    </Card>

                    {user && !isAdmin && (
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardContent className="p-4">
                                <NotificationToggle />
                            </CardContent>
                        </Card>
                    )}

                    {isAdmin && (
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-[#0051BA]" />Create Sunday Event</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {showCreateForm ? (
                                    <div className="space-y-3">
                                        <div>
                                            <Label className="text-sm">Sunday Date</Label>
                                            <Select value={newEventDate} onValueChange={setNewEventDate}>
                                                <SelectTrigger data-testid="new-event-date"><SelectValue placeholder="Choose a Sunday" /></SelectTrigger>
                                                <SelectContent>
                                                    {upcomingSundays.map(date => (
                                                        <SelectItem key={date} value={date}>
                                                            {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="bg-[#0051BA]" onClick={handleCreateEvent} disabled={creating} data-testid="create-event-btn">
                                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Create
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

                <div className="lg:col-span-2 space-y-6">
                    {weeklyEvents.length > 0 && (
                        <div>
                            <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-[#0051BA]" /> Upcoming Sunday Events
                            </h2>
                            <div className="space-y-4">
                                {weeklyEvents.map(event => (
                                    <Card key={event.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-testid={`weekly-event-${event.id}`}>
                                        <CardContent className="p-6">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="font-bold text-lg">{event.title}</h3>
                                                        <Badge className={event.status === 'scheduled' ? 'bg-green-100 text-green-800' : 'bg-[#CCFF00] text-[#002040]'}>
                                                            {event.status === 'scheduled' ? 'Schedule Ready' : 'RSVP Open'}
                                                        </Badge>
                                                        {event.rsvp_closed && <Badge className="bg-red-100 text-red-700"><Lock className="w-3 h-3 mr-1" />Closed</Badge>}
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                                                        <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                                                        <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{event.start_time}</div>
                                                        <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{event.location}</div>
                                                        <div className="flex items-center gap-1"><Users className="w-4 h-4" />{event.num_courts} court{event.num_courts > 1 ? 's' : ''}</div>
                                                    </div>
                                                    <PlayersList event={event} onUpdate={refreshEvents} />
                                                    <EditableScheduleDisplay event={event} onRefresh={refreshEvents} isAdmin={isAdmin} />
                                                </div>
                                                <div className="md:w-56 shrink-0">
                                                    {user && !isAdmin && event.status !== 'scheduled' ? (
                                                        <CheckInButton eventId={event.id} event={event} onUpdate={refreshEvents} />
                                                    ) : event.status === 'scheduled' && user && !isAdmin && (getConfirmed(event))?.some(p => p.id === user.id) ? (
                                                        <div>
                                                            <Badge className="bg-green-100 text-green-800 mb-2">You're playing!</Badge>
                                                            <Button size="sm" variant="outline" className="text-red-500 w-full" onClick={async () => { await cancelPlayerSpot(event.id); refreshEvents(); }} data-testid="cancel-spot-btn">
                                                                <UserX className="w-4 h-4 mr-1" /> Cancel My Spot
                                                            </Button>
                                                        </div>
                                                    ) : !user ? (
                                                        <p className="text-sm text-gray-500">Log in to RSVP</p>
                                                    ) : isAdmin ? (
                                                        <p className="text-xs text-gray-400 italic">Admin controls below</p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {isAdmin && weeklyEvents.length > 0 && (
                        <div>
                            <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-[#0051BA]" /> Admin Controls
                            </h2>
                            <div className="space-y-4">
                                {weeklyEvents.map(event => (
                                    <AdminEventPanel key={event.id} event={event} onRefresh={refreshEvents} allPlayers={registeredPlayers} />
                                ))}
                            </div>
                        </div>
                    )}

                    {filteredSchedules.length > 0 && (
                        <div>
                            <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-[#0051BA]" />
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h2>
                            <div className="space-y-4">
                                {filteredSchedules.map(schedule => (
                                    <Card key={schedule.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-testid={`schedule-item-${schedule.id}`}>
                                        <CardContent className="p-6">
                                            <h3 className="font-bold text-lg mb-2">{schedule.title}</h3>
                                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{schedule.match_time}</div>
                                                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{schedule.location}</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

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
