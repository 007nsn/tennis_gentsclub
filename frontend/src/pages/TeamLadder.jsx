import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Trophy, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { getTeams } from '../lib/api';

export default function TeamLadder() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTeams();
    }, []);

    const loadTeams = async () => {
        try {
            const response = await getTeams();
            setTeams(response.data);
        } catch (error) {
            console.error('Error loading teams:', error);
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

    const getWinRate = (wins, losses) => {
        const total = wins + losses;
        if (total === 0) return 0;
        return Math.round((wins / total) * 100);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="team-ladder-page">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-8 h-8 text-[#CCFF00]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black uppercase tracking-tight text-[#0F172A]">
                        Team Ladder
                    </h1>
                </div>
                <p className="text-gray-600">Doubles team rankings based on match performance</p>
            </div>

            {/* Top 3 Podium */}
            {teams.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center mt-8">
                        <Card className="w-full border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] relative overflow-hidden" data-testid="podium-2">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-300"></div>
                            <CardContent className="p-6 text-center">
                                <div className="ladder-position silver text-4xl mb-2">#2</div>
                                <h3 className="font-bold text-lg">{teams[1]?.name}</h3>
                                <p className="text-sm text-gray-500 mb-2">{teams[1]?.member_names?.join(' & ')}</p>
                                <div className="text-2xl font-bold text-[#0051BA]">{teams[1]?.points} pts</div>
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
                                <div className="ladder-position gold text-5xl mb-2">#1</div>
                                <h3 className="font-bold text-xl">{teams[0]?.name}</h3>
                                <p className="text-sm text-gray-500 mb-3">{teams[0]?.member_names?.join(' & ')}</p>
                                <div className="text-3xl font-bold text-[#0051BA]">{teams[0]?.points} pts</div>
                                <Badge className="mt-2 bg-[#CCFF00] text-[#002040]">Champion</Badge>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 3rd Place */}
                    <div className="flex flex-col items-center mt-12">
                        <Card className="w-full border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] relative overflow-hidden" data-testid="podium-3">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-600"></div>
                            <CardContent className="p-6 text-center">
                                <div className="ladder-position bronze text-4xl mb-2">#3</div>
                                <h3 className="font-bold text-lg">{teams[2]?.name}</h3>
                                <p className="text-sm text-gray-500 mb-2">{teams[2]?.member_names?.join(' & ')}</p>
                                <div className="text-2xl font-bold text-[#0051BA]">{teams[2]?.points} pts</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Full Ladder */}
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardHeader>
                    <CardTitle className="font-['Barlow_Condensed'] uppercase">Full Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading teams...</div>
                    ) : teams.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No teams registered yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-4 font-mono text-xs uppercase text-gray-500">Rank</th>
                                        <th className="text-left py-3 px-4 font-mono text-xs uppercase text-gray-500">Team</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">W</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">L</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">Win %</th>
                                        <th className="text-right py-3 px-4 font-mono text-xs uppercase text-gray-500">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teams.map((team, idx) => (
                                        <tr 
                                            key={team.id} 
                                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                            data-testid={`team-row-${idx}`}
                                        >
                                            <td className="py-4 px-4">
                                                <span className={`ladder-position ${getPositionStyle(idx + 1)} text-2xl`}>
                                                    #{idx + 1}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-bold">{team.name}</div>
                                                <div className="text-sm text-gray-500">{team.member_names?.join(' & ')}</div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className="text-green-600 font-bold">{team.wins}</span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className="text-red-500 font-bold">{team.losses}</span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {getWinRate(team.wins, team.losses) >= 50 ? (
                                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                                    ) : team.wins + team.losses > 0 ? (
                                                        <TrendingDown className="w-4 h-4 text-red-500" />
                                                    ) : (
                                                        <Minus className="w-4 h-4 text-gray-400" />
                                                    )}
                                                    <span className="font-medium">{getWinRate(team.wins, team.losses)}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className="text-xl font-bold text-[#0051BA]">{team.points}</span>
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
