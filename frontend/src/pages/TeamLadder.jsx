import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { getPartnerships } from '../lib/api';
import { Users, Trophy, TrendingUp, Handshake, Star, HeartHandshake } from 'lucide-react';

export default function BestPartnerships() {
    const [partnerships, setPartnerships] = useState([]);
    const [playerBestPartner, setPlayerBestPartner] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const res = await getPartnerships();
            const payload = res.data;
            const pairs = Array.isArray(payload) ? payload : (payload?.ranked_pairs ?? []);
            const chem = Array.isArray(payload) ? [] : (payload?.player_best_partner ?? []);
            setPartnerships(pairs);
            setPlayerBestPartner(chem);
        } catch (e) {
            console.error('Error loading partnerships:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const getMedalStyle = (idx) => {
        if (idx === 0) return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
        if (idx === 1) return 'bg-gradient-to-r from-gray-300 to-gray-400';
        if (idx === 2) return 'bg-gradient-to-r from-amber-600 to-amber-700';
        return 'bg-gray-100';
    };

    const getMedalText = (idx) => {
        if (idx <= 2) return 'text-white';
        return 'text-gray-600';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="partnerships-page">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Handshake className="w-8 h-8 text-[#0051BA]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black uppercase tracking-tight text-[#0F172A]">
                        Duos · Partner chemistry
                    </h1>
                </div>
                <p className="text-gray-600 max-w-3xl">
                    Each Sunday round you get a new partner. Joint wins below are the same <strong>2v2 doubles</strong> wins that feed your <strong>Player Ladder</strong>—so your &quot;best partner&quot; is whoever you won the most ladder points with.
                </p>
            </div>

            {/* Top 3 Podium — pairs with most co-wins */}
            {partnerships.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="flex flex-col items-center mt-8">
                        <Card className="w-full border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] relative overflow-hidden" data-testid="podium-2">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-300"></div>
                            <CardContent className="p-6 text-center">
                                <div className="text-4xl font-black text-gray-400 mb-2">#2</div>
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <span className="font-bold">{partnerships[1].player_a.name}</span>
                                </div>
                                <div className="text-xs text-gray-400 mb-1">&</div>
                                <div className="flex items-center justify-center gap-1 mb-3">
                                    <span className="font-bold">{partnerships[1].player_b.name}</span>
                                </div>
                                <div className="text-sm text-gray-500">{partnerships[1].wins} co-wins</div>
                                <div className="text-xs text-gray-400">{partnerships[1].matches_together}x paired</div>
                                {partnerships[1].wins + partnerships[1].losses > 0 && (
                                    <Badge className="mt-2 bg-green-100 text-green-800">{partnerships[1].win_rate}% when paired</Badge>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col items-center">
                        <Card className="w-full border-none shadow-[0_8px_24px_rgba(0,0,0,0.12)] relative overflow-hidden" data-testid="podium-1">
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 to-yellow-500"></div>
                            <CardContent className="p-8 text-center">
                                <div className="w-16 h-16 bg-[#CCFF00] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trophy className="w-8 h-8 text-[#002040]" />
                                </div>
                                <div className="text-5xl font-black text-yellow-500 mb-2">#1</div>
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <span className="font-bold text-lg">{partnerships[0].player_a.name}</span>
                                </div>
                                <div className="text-xs text-gray-400 mb-1">&</div>
                                <div className="flex items-center justify-center gap-1 mb-3">
                                    <span className="font-bold text-lg">{partnerships[0].player_b.name}</span>
                                </div>
                                <div className="text-sm text-gray-500">{partnerships[0].wins} co-wins</div>
                                <div className="text-xs text-gray-400">{partnerships[0].matches_together}x paired</div>
                                {partnerships[0].wins + partnerships[0].losses > 0 && (
                                    <Badge className="mt-2 bg-[#CCFF00] text-[#002040]">{partnerships[0].win_rate}% when paired</Badge>
                                )}
                                <div className="mt-2">
                                    <Badge className="bg-[#0051BA]">
                                        <Star className="w-3 h-3 mr-1" />Top chemistry pair
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col items-center mt-12">
                        <Card className="w-full border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] relative overflow-hidden" data-testid="podium-3">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-600"></div>
                            <CardContent className="p-6 text-center">
                                <div className="text-4xl font-black text-amber-600 mb-2">#3</div>
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <span className="font-bold">{partnerships[2].player_a.name}</span>
                                </div>
                                <div className="text-xs text-gray-400 mb-1">&</div>
                                <div className="flex items-center justify-center gap-1 mb-3">
                                    <span className="font-bold">{partnerships[2].player_b.name}</span>
                                </div>
                                <div className="text-sm text-gray-500">{partnerships[2].wins} co-wins</div>
                                <div className="text-xs text-gray-400">{partnerships[2].matches_together}x paired</div>
                                {partnerships[2].wins + partnerships[2].losses > 0 && (
                                    <Badge className="mt-2 bg-amber-100 text-amber-800">{partnerships[2].win_rate}% when paired</Badge>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Each player: who boosts your ladder most */}
            {playerBestPartner.length > 0 && (
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-8">
                    <CardHeader>
                        <CardTitle className="font-['Barlow_Condensed'] uppercase flex items-center gap-2">
                            <HeartHandshake className="w-5 h-5 text-[#E06040]" />
                            Your best partner (ladder)
                        </CardTitle>
                        <CardDescription>
                            For each member: the partner you shared the <strong>most joint wins</strong> with on Sunday 2v2 (tie-break: win % when paired, then times paired).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-6 text-gray-500">Loading…</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm" data-testid="chemistry-by-player-table">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="text-left py-3 px-3 font-mono text-xs uppercase text-gray-500">Player</th>
                                            <th className="text-left py-3 px-3 font-mono text-xs uppercase text-gray-500">Best partner</th>
                                            <th className="text-center py-3 px-3 font-mono text-xs uppercase text-gray-500">Co-wins</th>
                                            <th className="text-center py-3 px-3 font-mono text-xs uppercase text-gray-500">Co-losses</th>
                                            <th className="text-center py-3 px-3 font-mono text-xs uppercase text-gray-500">Paired</th>
                                            <th className="text-center py-3 px-3 font-mono text-xs uppercase text-gray-500">Win %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {playerBestPartner.map((row) => (
                                            <tr key={row.player_id} className="border-b border-gray-50 hover:bg-gray-50/80">
                                                <td className="py-3 px-3 font-medium">{row.player_name}</td>
                                                <td className="py-3 px-3">
                                                    {row.best_partner ? (
                                                        <span className="text-[#0051BA] font-medium">{row.best_partner.name}</span>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-center text-green-600 font-bold">
                                                    {row.best_partner?.wins_together ?? '—'}
                                                </td>
                                                <td className="py-3 px-3 text-center text-red-500 font-medium">
                                                    {row.best_partner?.losses_together ?? '—'}
                                                </td>
                                                <td className="py-3 px-3 text-center">{row.best_partner?.matches_together ?? '—'}</td>
                                                <td className="py-3 px-3 text-center">
                                                    {row.best_partner && (row.best_partner.wins_together + row.best_partner.losses_together) > 0
                                                        ? `${row.best_partner.win_rate}%`
                                                        : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardHeader>
                    <CardTitle className="font-['Barlow_Condensed'] uppercase">All pairs · by co-wins</CardTitle>
                    <CardDescription>Every pairing that has shared a court on Sunday round robin (ranked by joint ladder wins).</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading partnerships...</div>
                    ) : partnerships.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="font-medium mb-1">No chemistry data yet</p>
                            <p className="text-sm">Generate Sunday schedules and enter scores for standard 2v2 doubles—stats build from those results only.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" data-testid="partnerships-table">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-4 font-mono text-xs uppercase text-gray-500">Rank</th>
                                        <th className="text-left py-3 px-4 font-mono text-xs uppercase text-gray-500">Pairing</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">Times paired</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">Co-wins</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">Co-losses</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">Win %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {partnerships.map((p, idx) => (
                                        <tr key={`${p.player_a.id}-${p.player_b.id}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors" data-testid={`partnership-row-${idx}`}>
                                            <td className="py-4 px-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getMedalStyle(idx)} ${getMedalText(idx)}`}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                                                        {p.player_a.name.charAt(0)}
                                                    </div>
                                                    <span className="font-medium">{p.player_a.name}</span>
                                                    <span className="text-gray-400">&</span>
                                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs">
                                                        {p.player_b.name.charAt(0)}
                                                    </div>
                                                    <span className="font-medium">{p.player_b.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className="font-bold text-[#0051BA]">{p.matches_together}</span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className="text-green-600 font-bold">{p.wins}</span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className="text-red-500 font-bold">{p.losses}</span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {p.wins + p.losses > 0 ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <TrendingUp className={`w-4 h-4 ${p.win_rate >= 50 ? 'text-green-500' : 'text-red-500'}`} />
                                                        <span className="font-medium">{p.win_rate}%</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
