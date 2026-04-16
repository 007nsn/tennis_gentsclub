import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getSoloLadder, getHeadToHead, getHeadToHeadMatrix } from '../lib/api';
import { Swords, Trophy, Minus, Calendar } from 'lucide-react';

export default function HeadToHead() {
    const [players, setPlayers] = useState([]);
    const [matrix, setMatrix] = useState(null);
    const [playerA, setPlayerA] = useState('');
    const [playerB, setPlayerB] = useState('');
    const [h2hData, setH2hData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [playersRes, matrixRes] = await Promise.all([
                getSoloLadder(),
                getHeadToHeadMatrix()
            ]);
            setPlayers(playersRes.data);
            setMatrix(matrixRes.data);
        } catch (e) {
            console.error('Error loading data:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (!playerA || !playerB || playerA === playerB) {
            setH2hData(null);
            return;
        }
        setDetailLoading(true);
        getHeadToHead(playerA, playerB)
            .then(res => setH2hData(res.data))
            .catch(() => setH2hData(null))
            .finally(() => setDetailLoading(false));
    }, [playerA, playerB]);

    const getRecordCell = (pid, oppId) => {
        if (!matrix || !matrix.matrix[pid]) return null;
        const cell = matrix.matrix[pid][oppId];
        if (!cell || cell.total === 0) return <Minus className="w-4 h-4 text-gray-300 mx-auto" />;
        const isWinning = cell.wins > cell.losses;
        const isTied = cell.wins === cell.losses;
        return (
            <span className={`text-xs font-bold ${isWinning ? 'text-green-700' : isTied ? 'text-gray-600' : 'text-red-600'}`}>
                {cell.wins}-{cell.losses}
            </span>
        );
    };

    const matrixPlayers = matrix?.players || [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="h2h-page">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Swords className="w-8 h-8 text-[#E06040]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black uppercase tracking-tight text-[#0F172A]">
                        Head to Head
                    </h1>
                </div>
                <p className="text-gray-600">Player vs Player records and rivalry history</p>
            </div>

            {/* Player Selector */}
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-8">
                <CardHeader>
                    <CardTitle className="text-lg">Compare Players</CardTitle>
                    <CardDescription>Select two players to see their head-to-head record</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-4 max-w-xl">
                        <div>
                            <Select value={playerA} onValueChange={setPlayerA}>
                                <SelectTrigger data-testid="h2h-player-a">
                                    <SelectValue placeholder="Select Player A" />
                                </SelectTrigger>
                                <SelectContent>
                                    {players.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Select value={playerB} onValueChange={setPlayerB}>
                                <SelectTrigger data-testid="h2h-player-b">
                                    <SelectValue placeholder="Select Player B" />
                                </SelectTrigger>
                                <SelectContent>
                                    {players.filter(p => p.id !== playerA).map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* H2H Detail */}
                    {detailLoading && <p className="text-sm text-gray-400 mt-4">Loading...</p>}
                    {h2hData && !detailLoading && (
                        <div className="mt-6" data-testid="h2h-detail">
                            {h2hData.total_matches === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Swords className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                    <p>No matches played between these players yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Score banner */}
                                    <div className="flex items-center justify-center gap-6 py-6 bg-gradient-to-r from-green-50 via-white to-blue-50 rounded-xl">
                                        <div className="text-center">
                                            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <span className="font-bold text-green-800 text-lg">
                                                    {h2hData.player_a.name.charAt(0)}
                                                </span>
                                            </div>
                                            <p className="font-bold text-sm">{h2hData.player_a.name}</p>
                                            <p className="text-3xl font-black text-green-700 mt-1">{h2hData.a_wins}</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-gray-400 font-bold text-xs uppercase mb-1">vs</div>
                                            <Badge className="bg-gray-100 text-gray-600">{h2hData.total_matches} matches</Badge>
                                        </div>
                                        <div className="text-center">
                                            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <span className="font-bold text-blue-800 text-lg">
                                                    {h2hData.player_b.name.charAt(0)}
                                                </span>
                                            </div>
                                            <p className="font-bold text-sm">{h2hData.player_b.name}</p>
                                            <p className="text-3xl font-black text-blue-700 mt-1">{h2hData.b_wins}</p>
                                        </div>
                                    </div>

                                    {/* Match history */}
                                    <div>
                                        <h4 className="font-bold text-sm uppercase text-gray-500 mb-2">Match History</h4>
                                        <div className="space-y-2">
                                            {h2hData.matches.map((m, idx) => (
                                                <div key={`h2h-match-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <Calendar className="w-4 h-4" />
                                                        {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                    <div className="font-bold text-[#0051BA]">{m.a_score} - {m.b_score}</div>
                                                    <Badge className={m.winner === h2hData.player_a.name ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                                                        <Trophy className="w-3 h-3 mr-1" />{m.winner}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Full Matrix */}
            {!loading && matrixPlayers.length > 0 && (
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle className="font-['Barlow_Condensed'] uppercase">Full H2H Matrix</CardTitle>
                        <CardDescription>Win-Loss record for every player pair (row player's wins - losses)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm" data-testid="h2h-matrix">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left p-2 font-mono text-xs uppercase text-gray-500 sticky left-0 bg-white">vs</th>
                                        {matrixPlayers.map(p => (
                                            <th key={p.id} className="p-2 text-center font-mono text-xs uppercase text-gray-500 min-w-[60px]">
                                                {p.name.split(' ')[0]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrixPlayers.map(p => (
                                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="p-2 font-medium sticky left-0 bg-white">{p.name}</td>
                                            {matrixPlayers.map(opp => (
                                                <td key={opp.id} className={`p-2 text-center ${p.id === opp.id ? 'bg-gray-100' : ''}`}>
                                                    {p.id === opp.id ? <span className="text-gray-300">-</span> : getRecordCell(p.id, opp.id)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {loading && <div className="text-center py-12 text-gray-500">Loading head-to-head data...</div>}
            {!loading && matrixPlayers.length === 0 && (
                <Card className="border-none">
                    <CardContent className="py-12 text-center text-gray-500">
                        <Swords className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No players registered yet. Head-to-head records will appear once matches are played.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
