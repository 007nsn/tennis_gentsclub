import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { getSeasonStandings } from '../lib/api';
import { Trophy, TrendingUp, TrendingDown, Minus, Flame, Award } from 'lucide-react';

export default function SeasonStandings() {
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStandings();
    }, []);

    const loadStandings = async () => {
        try {
            const res = await getSeasonStandings();
            setStandings(res.data);
        } catch (error) {
            console.error('Error loading standings:', error);
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

    const getStreakDisplay = (streak) => {
        if (streak > 0) {
            return (
                <div className="flex items-center gap-1 text-green-600">
                    <Flame className="w-4 h-4" />
                    <span className="font-bold">{streak}W</span>
                </div>
            );
        } else if (streak < 0) {
            return (
                <div className="flex items-center gap-1 text-red-500">
                    <TrendingDown className="w-4 h-4" />
                    <span className="font-bold">{Math.abs(streak)}L</span>
                </div>
            );
        }
        return <Minus className="w-4 h-4 text-gray-400" />;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="season-standings-page">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Award className="w-8 h-8 text-[#CCFF00]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black uppercase tracking-tight text-[#0F172A]">
                        Season Standings
                    </h1>
                </div>
                <p className="text-gray-600">Cumulative stats for the current season</p>
            </div>

            {/* Top 3 Podium */}
            {standings.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center mt-8">
                        <Card className="w-full border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-300"></div>
                            <CardContent className="p-6 text-center">
                                <div className="ladder-position silver text-4xl mb-2">#2</div>
                                <h3 className="font-bold text-lg">{standings[1]?.player_name}</h3>
                                <div className="text-2xl font-bold text-[#0051BA] mt-2">{standings[1]?.points} pts</div>
                                <div className="text-sm text-gray-500">{standings[1]?.wins}W - {standings[1]?.losses}L</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 1st Place */}
                    <div className="flex flex-col items-center">
                        <Card className="w-full border-none shadow-[0_8px_24px_rgba(0,0,0,0.12)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 to-yellow-500"></div>
                            <CardContent className="p-8 text-center">
                                <div className="w-16 h-16 bg-[#CCFF00] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trophy className="w-8 h-8 text-[#002040]" />
                                </div>
                                <div className="ladder-position gold text-5xl mb-2">#1</div>
                                <h3 className="font-bold text-xl">{standings[0]?.player_name}</h3>
                                <div className="text-3xl font-bold text-[#0051BA] mt-2">{standings[0]?.points} pts</div>
                                <div className="text-sm text-gray-500 mb-2">{standings[0]?.wins}W - {standings[0]?.losses}L</div>
                                <Badge className="bg-[#CCFF00] text-[#002040]">Season Leader</Badge>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 3rd Place */}
                    <div className="flex flex-col items-center mt-12">
                        <Card className="w-full border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-600"></div>
                            <CardContent className="p-6 text-center">
                                <div className="ladder-position bronze text-4xl mb-2">#3</div>
                                <h3 className="font-bold text-lg">{standings[2]?.player_name}</h3>
                                <div className="text-2xl font-bold text-[#0051BA] mt-2">{standings[2]?.points} pts</div>
                                <div className="text-sm text-gray-500">{standings[2]?.wins}W - {standings[2]?.losses}L</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Full Standings Table */}
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardHeader>
                    <CardTitle className="font-['Barlow_Condensed'] uppercase">Full Season Standings</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading standings...</div>
                    ) : standings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No matches played yet this season</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-4 font-mono text-xs uppercase text-gray-500">Rank</th>
                                        <th className="text-left py-3 px-4 font-mono text-xs uppercase text-gray-500">Player</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">Played</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">W</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">L</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">Win %</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">Streak</th>
                                        <th className="text-center py-3 px-4 font-mono text-xs uppercase text-gray-500">Best</th>
                                        <th className="text-right py-3 px-4 font-mono text-xs uppercase text-gray-500">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {standings.map((player, idx) => (
                                        <tr 
                                            key={player.player_id}
                                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                            data-testid={`standing-row-${idx}`}
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
                                                            {player.player_name?.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="font-bold">{player.player_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center font-medium">{player.matches_played}</td>
                                            <td className="py-4 px-4 text-center text-green-600 font-bold">{player.wins}</td>
                                            <td className="py-4 px-4 text-center text-red-500 font-bold">{player.losses}</td>
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {player.win_rate >= 50 ? (
                                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                                    ) : player.matches_played > 0 ? (
                                                        <TrendingDown className="w-4 h-4 text-red-500" />
                                                    ) : (
                                                        <Minus className="w-4 h-4 text-gray-400" />
                                                    )}
                                                    <span className="font-medium">{player.win_rate}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex justify-center">
                                                    {getStreakDisplay(player.current_streak)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {player.best_streak > 0 && (
                                                    <Badge className="bg-green-100 text-green-800">{player.best_streak}W</Badge>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className="text-xl font-bold text-[#0051BA]">{player.points}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Season Info */}
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] mt-6 bg-[#0051BA]/5">
                <CardContent className="p-6">
                    <h4 className="font-bold mb-2">Season Scoring</h4>
                    <p className="text-gray-600 text-sm">
                        Each match win = 1 point. Standings update automatically when match results are approved.
                        Current streak shows your recent form. Keep winning to climb the ladder!
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
