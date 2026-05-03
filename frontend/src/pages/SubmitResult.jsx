import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import {
    submitMatch,
    getSoloLadder,
    getEventsWithSchedules,
    submitRoundRobinScore,
} from '../lib/api';
import { toast } from 'sonner';
import { Trophy, Loader2, Calendar, Clock, CheckCircle2, Users } from 'lucide-react';

function formatEventDate(iso) {
    if (!iso) return '';
    try {
        // iso is "2025-07-06" — render as local weekday/date, no timezone shift
        return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        });
    } catch { return iso; }
}

function teamLabel(team) {
    if (!team || !team.length) return '—';
    return team.map(p => p.name).join(' & ');
}

export default function SubmitResult() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [matchType, setMatchType] = useState('rr'); // 'rr' or 'solo'

    // Round-Robin state
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [selectedRound, setSelectedRound] = useState('');
    const [selectedCourt, setSelectedCourt] = useState('');
    const [rrScoreA, setRrScoreA] = useState('');
    const [rrScoreB, setRrScoreB] = useState('');

    // Solo state
    const [players, setPlayers] = useState([]);
    const [soloForm, setSoloForm] = useState({
        player_a_id: '',
        player_b_id: '',
        score_a: '',
        score_b: '',
        match_date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadAll();
    }, [user, navigate]);

    const loadAll = async () => {
        try {
            const [evRes, playersRes] = await Promise.all([
                getEventsWithSchedules(),
                getSoloLadder(),
            ]);
            setEvents(evRes.data || []);
            setPlayers(playersRes.data || []);
            // Auto-select the most recent event
            if (evRes.data && evRes.data.length && !selectedEventId) {
                setSelectedEventId(evRes.data[0].id);
            }
        } catch (e) {
            console.error('Error loading data:', e);
            toast.error('Could not load events');
        }
    };

    const selectedEvent = useMemo(
        () => events.find(e => e.id === selectedEventId) || null,
        [events, selectedEventId]
    );

    const rounds = selectedEvent?.generated_schedule || [];

    const selectedRoundObj = useMemo(
        () => rounds.find(r => String(r.round) === String(selectedRound)) || null,
        [rounds, selectedRound]
    );

    const matchesInRound = selectedRoundObj?.matches || [];

    const selectedMatch = useMemo(
        () => matchesInRound.find(m => String(m.court) === String(selectedCourt)) || null,
        [matchesInRound, selectedCourt]
    );

    // When user picks a different match, pre-fill scores if already recorded
    useEffect(() => {
        if (selectedMatch && selectedMatch.score_a != null && selectedMatch.score_b != null) {
            setRrScoreA(String(selectedMatch.score_a));
            setRrScoreB(String(selectedMatch.score_b));
        } else {
            setRrScoreA('');
            setRrScoreB('');
        }
    }, [selectedMatch]);

    const handleRrSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEventId) { toast.error('Pick an event'); return; }
        if (!selectedRound) { toast.error('Pick a round'); return; }
        if (!selectedCourt) { toast.error('Pick a match'); return; }
        if (rrScoreA === '' || rrScoreB === '') { toast.error('Enter both scores'); return; }
        const sa = parseInt(rrScoreA, 10);
        const sb = parseInt(rrScoreB, 10);
        if (Number.isNaN(sa) || Number.isNaN(sb)) { toast.error('Scores must be numbers'); return; }
        if (sa === sb) { toast.error('Scores cannot be equal (no ties)'); return; }
        setLoading(true);
        try {
            await submitRoundRobinScore(selectedEventId, {
                round_num: parseInt(selectedRound, 10),
                court: parseInt(selectedCourt, 10),
                score_a: sa,
                score_b: sb,
            });
            toast.success('Score saved!');
            // Reload so archive reflects the new score
            await loadAll();
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Could not save score');
        } finally {
            setLoading(false);
        }
    };

    const handleSoloSubmit = async (e) => {
        e.preventDefault();
        const { player_a_id, player_b_id, score_a, score_b, match_date } = soloForm;
        if (!player_a_id || !player_b_id) { toast.error('Pick both players'); return; }
        if (player_a_id === player_b_id) { toast.error('Different players, please'); return; }
        if (score_a === '' || score_b === '') { toast.error('Enter both scores'); return; }
        setLoading(true);
        try {
            await submitMatch({
                match_type: 'solo',
                player_a_id,
                player_b_id,
                score_a: parseInt(score_a, 10),
                score_b: parseInt(score_b, 10),
                match_date,
            });
            toast.success('Match submitted! Awaiting admin approval.');
            navigate('/solo-ladder');
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Failed to submit');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="submit-result-page">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-8 h-8 text-[#CCFF00]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl font-black uppercase tracking-tight text-[#0F172A]">
                        Submit Result
                    </h1>
                </div>
                <p className="text-gray-600">Record match scores and browse past results</p>
            </div>

            {/* Match Type */}
            <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] mb-6">
                <CardContent className="pt-6">
                    <RadioGroup value={matchType} onValueChange={setMatchType} className="flex gap-4 flex-wrap">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="rr" id="rr" data-testid="match-type-rr" />
                            <Label htmlFor="rr" className="cursor-pointer font-medium">Round-Robin Match</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="solo" id="solo" data-testid="match-type-solo" />
                            <Label htmlFor="solo" className="cursor-pointer font-medium">Solo Ladder Match</Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>

            {matchType === 'rr' && (
                <>
                    <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] mb-6">
                        <CardHeader>
                            <CardTitle>Round-Robin Match</CardTitle>
                            <CardDescription>Pick a Sunday event, round, and match — then enter the score. Any member can submit.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {events.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                    <p>No events with a generated schedule yet.</p>
                                    <p className="text-sm">Admin needs to create an event and generate the schedule first.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleRrSubmit} className="space-y-5">
                                    <div className="grid md:grid-cols-3 gap-4">
                                        {/* Event dropdown */}
                                        <div className="space-y-2">
                                            <Label>Event (Sunday)</Label>
                                            <Select value={selectedEventId} onValueChange={(v) => { setSelectedEventId(v); setSelectedRound(''); setSelectedCourt(''); }}>
                                                <SelectTrigger data-testid="rr-event-select">
                                                    <SelectValue placeholder="Select event" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {events.map(ev => (
                                                        <SelectItem key={ev.id} value={ev.id}>
                                                            {formatEventDate(ev.event_date)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Round dropdown */}
                                        <div className="space-y-2">
                                            <Label>Round</Label>
                                            <Select value={selectedRound} onValueChange={(v) => { setSelectedRound(v); setSelectedCourt(''); }} disabled={!selectedEventId || rounds.length === 0}>
                                                <SelectTrigger data-testid="rr-round-select">
                                                    <SelectValue placeholder={rounds.length ? 'Select round' : '—'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {rounds.map(r => (
                                                        <SelectItem key={r.round} value={String(r.round)}>
                                                            Round {r.round}{r.time ? ` @ ${r.time}` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Match dropdown */}
                                        <div className="space-y-2">
                                            <Label>Match</Label>
                                            <Select value={selectedCourt} onValueChange={setSelectedCourt} disabled={!selectedRound || matchesInRound.length === 0}>
                                                <SelectTrigger data-testid="rr-match-select">
                                                    <SelectValue placeholder={matchesInRound.length ? 'Select match' : '—'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {matchesInRound.map(m => (
                                                        <SelectItem key={m.court} value={String(m.court)}>
                                                            Court {m.court}: {teamLabel(m.team_a)} vs {teamLabel(m.team_b)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Match card preview + score inputs */}
                                    {selectedMatch && (
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Users className="w-4 h-4" />
                                                    <span>Court {selectedMatch.court} · {selectedMatch.match_type || 'doubles'}</span>
                                                </div>
                                                {selectedMatch.score_a != null && (
                                                    <Badge className="bg-green-100 text-green-800 border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Already scored — submitting will update</Badge>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase tracking-wide text-gray-500">Team A</Label>
                                                    <div className="font-medium">{teamLabel(selectedMatch.team_a)}</div>
                                                    <Input
                                                        type="number" min="0" max="20"
                                                        value={rrScoreA}
                                                        onChange={e => setRrScoreA(e.target.value)}
                                                        placeholder="e.g. 6"
                                                        data-testid="rr-score-a"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase tracking-wide text-gray-500">Team B</Label>
                                                    <div className="font-medium">{teamLabel(selectedMatch.team_b)}</div>
                                                    <Input
                                                        type="number" min="0" max="20"
                                                        value={rrScoreB}
                                                        onChange={e => setRrScoreB(e.target.value)}
                                                        placeholder="e.g. 4"
                                                        data-testid="rr-score-b"
                                                    />
                                                </div>
                                            </div>
                                            {selectedMatch.submitted_by_name && (
                                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Last updated by {selectedMatch.submitted_by_name}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <Button type="submit" className="w-full btn-primary" disabled={loading || !selectedMatch} data-testid="rr-submit-btn">
                                        {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>) : (selectedMatch?.score_a != null ? 'Update Score' : 'Save Score')}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    {/* Archive: scored matches for selected event */}
                    {selectedEvent && (
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardHeader>
                                <CardTitle className="text-lg">Results for {formatEventDate(selectedEvent.event_date)}</CardTitle>
                                <CardDescription>Archive of all matches from this event</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {rounds.length === 0 ? (
                                    <p className="text-sm text-gray-500">No schedule generated.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {rounds.map(r => (
                                            <div key={r.round}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-semibold text-sm text-gray-700">Round {r.round}</h3>
                                                    {r.time && <span className="text-xs text-gray-400">{r.time}</span>}
                                                </div>
                                                <div className="space-y-1.5">
                                                    {(r.matches || []).map(m => {
                                                        const scored = m.score_a != null && m.score_b != null;
                                                        const winnerA = scored && m.score_a > m.score_b;
                                                        const winnerB = scored && m.score_b > m.score_a;
                                                        return (
                                                            <div key={m.court} className="flex items-center justify-between gap-2 text-sm px-3 py-2 rounded bg-gray-50 border border-gray-100">
                                                                <div className="text-gray-500 text-xs w-16 shrink-0">Court {m.court}</div>
                                                                <div className={`flex-1 truncate ${winnerA ? 'font-semibold text-[#0051BA]' : ''}`}>{teamLabel(m.team_a)}</div>
                                                                <div className="font-mono font-bold text-sm tabular-nums">
                                                                    {scored ? `${m.score_a} – ${m.score_b}` : <span className="text-gray-300">— : —</span>}
                                                                </div>
                                                                <div className={`flex-1 truncate text-right ${winnerB ? 'font-semibold text-[#0051BA]' : ''}`}>{teamLabel(m.team_b)}</div>
                                                            </div>
                                                        );
                                                    })}
                                                    {(r.byes || []).length > 0 && (
                                                        <div className="text-xs text-gray-400 italic pl-3">Byes: {r.byes.map(b => b.name).join(', ')}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {matchType === 'solo' && (
                <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                    <CardHeader>
                        <CardTitle>Solo Ladder Match</CardTitle>
                        <CardDescription>Results will be reviewed by an admin before updating the ladder</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSoloSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Player A</Label>
                                    <Select value={soloForm.player_a_id} onValueChange={v => setSoloForm(p => ({ ...p, player_a_id: v }))}>
                                        <SelectTrigger data-testid="player-a-select">
                                            <SelectValue placeholder="Select player" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {players.map(pl => (
                                                <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Player B</Label>
                                    <Select value={soloForm.player_b_id} onValueChange={v => setSoloForm(p => ({ ...p, player_b_id: v }))}>
                                        <SelectTrigger data-testid="player-b-select">
                                            <SelectValue placeholder="Select player" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {players.map(pl => (
                                                <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Score A</Label>
                                    <Input type="number" min="0" value={soloForm.score_a} onChange={e => setSoloForm(p => ({ ...p, score_a: e.target.value }))} placeholder="0" data-testid="score-a-input" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Score B</Label>
                                    <Input type="number" min="0" value={soloForm.score_b} onChange={e => setSoloForm(p => ({ ...p, score_b: e.target.value }))} placeholder="0" data-testid="score-b-input" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Match Date</Label>
                                <Input type="date" value={soloForm.match_date} onChange={e => setSoloForm(p => ({ ...p, match_date: e.target.value }))} data-testid="match-date-input" />
                            </div>
                            <Button type="submit" className="w-full btn-primary" disabled={loading} data-testid="submit-result-btn">
                                {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>) : 'Submit Result'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
