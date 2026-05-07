import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getMatchHistory, getAllPlayerStats, getSoloLadder } from '../lib/api';
import { History, Trophy, TrendingUp, TrendingDown, User, Calendar, Target } from 'lucide-react';

export default function MatchHistory() {
    const [matches, setMatches] = useState([]);
    const [playerStats, setPlayerStats] = useState([]);
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState('all');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('history');

    const loadData = useCallback(async () => {
        try {
            const [statsRes, playersRes] = await Promise.all([
                getAllPlayerStats(),
                getSoloLadder()
            ]);
            setPlayerStats(statsRes.data);
            setPlayers(playersRes.data);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMatches = useCallback(async () => {
        try {
            const playerId = selectedPlayer === 'all' ? undefined : selectedPlayer;
            const res = await getMatchHistory(playerId);
            setMatches(res.data);
        } catch (error) {
            console.error('Error loading matches:', error);
        }
    }, [selectedPlayer]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        loadMatches();
    }, [loadMatches]);

    const getWinnerName = (match) => {
        if (match.match_type === 'team') {
            return match.score_a > match.score_b ? match.team_a_name : match.team_b_name;
        }
        return match.score_a > match.score_b ? match.player_a_name : match.player_b_name;
    };

    const getFormBadge = (result) => {
        return result === 'W' ? (
            <Badge className="bg-green-100 text-green-800 w-6 h-6 flex items-center justify-center p-0">W</Badge>
        ) : (
            <Badge className="bg-red-100 text-red-800 w-6 h-6 flex items-center justify-center p-0">L</Badge>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="match-history-page">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <History className="w-8 h-8 text-[#0051BA]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black uppercase tracking-tight text-[#0F172A]">
                        Match History
                    </h1>
                </div>
                <p className="text-gray-600">View past matches and player statistics</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList className="bg-white border border-gray-100 p-1">
                    <TabsTrigger value="history" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Match History
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Player Stats
                    </TabsTrigger>
                </TabsList>

                {/* Match History Tab */}
                <TabsContent value="history">
                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <CardTitle className="font-['Barlow_Condensed'] uppercase">Past Matches</CardTitle>
                                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                                    <SelectTrigger className="w-[200px]" data-testid="player-filter">
                                        <SelectValue placeholder="Filter by player" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Players</SelectItem>
                                        {players.map(player => (
                                            <SelectItem key={player.id} value={player.id}>
                                                {player.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8 text-gray-500">Loading matches...</div>
                            ) : matches.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <p>No matches found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {matches.map((match, idx) => (
                                        <div 
                                            key={match.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                            data-testid={`match-${idx}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="text-center min-w-[60px]">
                                                    <div className="text-xs text-gray-500 uppercase">
                                                        {new Date(match.match_date).toLocaleDateString('en-US', { month: 'short' })}
                                                    </div>
                                                    <div className="text-lg font-bold text-[#0051BA]">
                                                        {new Date(match.match_date).getDate()}
                                                    </div>
                                                </div>
                                                <div className="border-l border-gray-200 pl-4">
                                                    {match.match_type === 'team' ? (
                                                        <div className="font-medium">
                                                            {match.team_a_name} vs {match.team_b_name}
                                                        </div>
                                                    ) : (
                                                        <div className="font-medium">
                                                            {match.player_a_name} vs {match.player_b_name}
                                                        </div>
                                                    )}
                                                    <div className="text-sm text-gray-500">
                                                        Winner: <span className="text-green-600 font-medium">{getWinnerName(match)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-[#0051BA]">
                                                    {match.score_a} - {match.score_b}
                                                </div>
                                                <Badge className="bg-green-100 text-green-800">
                                                    {match.match_type === 'team' ? 'Team' : 'Singles'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Player Stats Tab */}
                <TabsContent value="stats">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            <div className="col-span-full text-center py-8 text-gray-500">Loading stats...</div>
                        ) : playerStats.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>No player stats available</p>
                            </div>
                        ) : (
                            playerStats.map((stat, idx) => (
                                <Card 
                                    key={stat.player_id}
                                    className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
                                    data-testid={`player-stat-${idx}`}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 bg-[#0051BA] rounded-full flex items-center justify-center">
                                                <span className="text-white font-bold text-lg">
                                                    {stat.player_name?.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{stat.player_name}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {stat.total_matches} matches played
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-[#0051BA]">{stat.wins}</div>
                                                <div className="text-xs text-gray-500 uppercase">Wins</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-gray-400">{stat.total_matches - stat.wins}</div>
                                                <div className="text-xs text-gray-500 uppercase">Losses</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={`text-2xl font-bold ${stat.win_rate >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {stat.win_rate}%
                                                </div>
                                                <div className="text-xs text-gray-500 uppercase">Win Rate</div>
                                            </div>
                                        </div>

                                        {stat.recent_form.length > 0 && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-2">Recent Form</p>
                                                <div className="flex gap-1">
                                                    {stat.recent_form.map((result, i) => (
                                                        <span key={`${stat.player_id}-form-${i}`}>{getFormBadge(result)}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {stat.total_matches > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    {stat.win_rate >= 50 ? (
                                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <TrendingDown className="w-4 h-4 text-red-500" />
                                                    )}
                                                    <span className="text-sm text-gray-600">
                                                        {stat.win_rate >= 50 ? 'Above' : 'Below'} average performance
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
