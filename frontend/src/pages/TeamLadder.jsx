import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { getPartnerships } from '../lib/api';
import { Users, Trophy, TrendingUp, Handshake, Star } from 'lucide-react';

export default function BestPartnerships() {
    const [partnerships, setPartnerships] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const res = await getPartnerships();
            setPartnerships(res.data);
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
                        Best Partnerships
                    </h1>
                </div>
                <p className="text-gray-600">Doubles pairings ranked by matches played together and win rate</p>
            </div>

            {/* Top 3 Podium */}
            {partnerships.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {/* 2nd Place */}
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
                                <div className="text-sm text-gray-500">{partnerships[1].matches_together} matches</div>
                                {partnerships[1].wins + partnerships[1].losses > 0 && (
                                    <Badge className="mt-2 bg-green-100 text-green-800">{partnerships[1].win_rate}% win rate</Badge>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* 1st Place */}
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
                                <div className="text-sm text-gray-500">{partnerships[0].matches_together} matches together</div>
                                {partnerships[0].wins + partnerships[0].losses > 0 && (
                                    <Badge className="mt-2 bg-[#CCFF00] text-[#002040]">{partnerships[0].win_rate}% win rate</Badge>
                                )}
                                <div className="mt-2">
                                    <Badge className="bg-[#0051BA]">
                                        <Star className="w-3 h-3 mr-1" />Best Duo
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 3rd Place */}
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
                                <div className="text-sm text-gray-500">{partnerships[2].matches_together} matches</div>
                                {partnerships[2].wins + partnerships[2].losses > 0 && (
                                    <Badge className="mt-2 bg-amber-100 text-amber-800">{partnerships[2].win_rate}% win rate</Badge>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Full Rankings Table */}
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardHeader>
                    <CardTitle className="font-['Barlow_Condensed'] uppercase">All Partnerships</CardTitle>
                    <CardDescription>Every doubles pairing from your Sunday round robins</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading partnerships...</div>
                    ) : partnerships.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="font-medium mb-1">No partnerships yet</p>
                            <p className="text-sm">Once the admin generates doubles round robin schedules, partnership stats will appear here automatically.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" data-testid="partnerships-table">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-4 font-mono text-xs uppercase text-gray-500">Rank</th>
                                        <th className="text-left py-3 px-4 font-mono text-xs uppercase text-gray-500">Partnership</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">Matches</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">W</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">L</th>
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
