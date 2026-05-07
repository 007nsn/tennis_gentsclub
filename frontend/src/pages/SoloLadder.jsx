import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Trophy, User } from 'lucide-react';
import { getSoloLadder } from '../lib/api';

export default function SoloLadder() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPlayers();
    }, []);

    const loadPlayers = async () => {
        try {
            const response = await getSoloLadder();
            setPlayers(response.data);
        } catch (error) {
            console.error('Error loading players:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPositionStyle = (position) => {
        if (position === 1) return 'gold';
        if (position === 2) return 'silver';
        if (position === 3) return 'bronze';
        return '';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="solo-ladder-page">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <User className="w-8 h-8 text-[#0051BA]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black uppercase tracking-tight text-[#0F172A]">
                        Player Ladder
                    </h1>
                </div>
                <p className="text-gray-600">Individual rankings • Count only Sunday <strong>2v2 doubles</strong> round-robin results (not singles or Canadian doubles).</p>
            </div>

            {/* Top 3 Cards */}
            {players.length >= 3 && (
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {players.slice(0, 3).map((player, idx) => (
                        <Card 
                            key={player.id} 
                            className={`border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] relative overflow-hidden ${idx === 0 ? 'md:order-2' : idx === 1 ? 'md:order-1' : 'md:order-3'}`}
                            data-testid={`solo-podium-${idx + 1}`}
                        >
                            <div className={`absolute top-0 left-0 right-0 h-1 ${idx === 0 ? 'bg-yellow-400 h-2' : idx === 1 ? 'bg-gray-300' : 'bg-amber-600'}`}></div>
                            <CardContent className={`p-6 text-center ${idx === 0 ? 'py-8' : ''}`}>
                                <div className={`ladder-position ${getPositionStyle(idx + 1)} ${idx === 0 ? 'text-5xl' : 'text-4xl'} mb-2`}>
                                    #{idx + 1}
                                </div>
                                <div className={`w-${idx === 0 ? '16' : '12'} h-${idx === 0 ? '16' : '12'} bg-[#0051BA] rounded-full flex items-center justify-center mx-auto mb-3`}>
                                    <span className="text-white font-bold text-xl">
                                        {player.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <h3 className={`font-bold ${idx === 0 ? 'text-xl' : 'text-lg'}`}>{player.name}</h3>
                                <div className={`font-bold text-[#0051BA] ${idx === 0 ? 'text-3xl' : 'text-2xl'} mt-2`}>
                                    {player.wins} {player.wins === 1 ? 'WIN' : 'WINS'}
                                </div>
                                {idx === 0 && (
                                    <Badge className="mt-2 bg-[#CCFF00] text-[#002040]">Top Player</Badge>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Full Ladder */}
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardHeader>
                    <CardTitle className="font-['Barlow_Condensed'] uppercase">All Players</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading players...</div>
                    ) : players.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No players registered yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-4 font-mono text-xs uppercase text-gray-500">Rank</th>
                                        <th className="text-left py-3 px-4 font-mono text-xs uppercase text-gray-500">Player</th>
                                        <th className="text-right py-3 px-4 font-mono text-xs uppercase text-gray-500">Set Wins</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map((player, idx) => (
                                        <tr 
                                            key={player.id} 
                                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                            data-testid={`player-row-${idx}`}
                                        >
                                            <td className="py-4 px-4">
                                                <span className={`ladder-position ${getPositionStyle(idx + 1)} text-2xl`}>
                                                    #{idx + 1}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-[#0051BA]/10 rounded-full flex items-center justify-center">
                                                        <span className="text-[#0051BA] font-bold">
                                                            {player.name?.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="font-bold">{player.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Trophy className="w-5 h-5 text-[#CCFF00]" />
                                                    <span className="text-xl font-bold text-[#0051BA]">{player.wins}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] mt-6 bg-[#0051BA]/5">
                <CardContent className="p-6">
                    <h4 className="font-bold mb-2">How the Player Ladder works</h4>
                    <p className="text-gray-600 text-sm">
                        Each Sunday <strong>2v2 doubles</strong> match you win counts as one win. Singles and Canadian doubles do not affect this ladder.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
