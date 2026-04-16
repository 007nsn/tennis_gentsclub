import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { submitMatch, getTeams, getSoloLadder } from '../lib/api';
import { toast } from 'sonner';
import { Trophy, Loader2, Calendar } from 'lucide-react';

export default function SubmitResult() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [matchType, setMatchType] = useState('team');
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [formData, setFormData] = useState({
        team_a_id: '',
        team_b_id: '',
        player_a_id: '',
        player_b_id: '',
        score_a: '',
        score_b: '',
        match_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadData();
    }, [user, navigate]);

    const loadData = async () => {
        try {
            const [teamsRes, playersRes] = await Promise.all([
                getTeams(),
                getSoloLadder()
            ]);
            setTeams(teamsRes.data);
            setPlayers(playersRes.data);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (matchType === 'team') {
            if (!formData.team_a_id || !formData.team_b_id) {
                toast.error('Please select both teams');
                return;
            }
            if (formData.team_a_id === formData.team_b_id) {
                toast.error('Please select different teams');
                return;
            }
        } else {
            if (!formData.player_a_id || !formData.player_b_id) {
                toast.error('Please select both players');
                return;
            }
            if (formData.player_a_id === formData.player_b_id) {
                toast.error('Please select different players');
                return;
            }
        }

        if (!formData.score_a || !formData.score_b) {
            toast.error('Please enter the scores');
            return;
        }

        setLoading(true);

        try {
            await submitMatch({
                match_type: matchType,
                team_a_id: matchType === 'team' ? formData.team_a_id : null,
                team_b_id: matchType === 'team' ? formData.team_b_id : null,
                player_a_id: matchType === 'solo' ? formData.player_a_id : null,
                player_b_id: matchType === 'solo' ? formData.player_b_id : null,
                score_a: parseInt(formData.score_a),
                score_b: parseInt(formData.score_b),
                match_date: formData.match_date
            });
            toast.success('Match result submitted! Waiting for admin approval.');
            navigate('/solo-ladder');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to submit result');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="submit-result-page">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-8 h-8 text-[#CCFF00]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl font-black uppercase tracking-tight text-[#0F172A]">
                        Submit Result
                    </h1>
                </div>
                <p className="text-gray-600">Report your match results for ladder updates</p>
            </div>

            <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                <CardHeader>
                    <CardTitle>Match Details</CardTitle>
                    <CardDescription>Results will be reviewed by an admin before updating the ladder</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Match Type */}
                        <div className="space-y-3">
                            <Label>Match Type</Label>
                            <RadioGroup 
                                value={matchType} 
                                onValueChange={setMatchType}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="team" id="team" data-testid="match-type-team" />
                                    <Label htmlFor="team" className="cursor-pointer">Team Match</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="solo" id="solo" data-testid="match-type-solo" />
                                    <Label htmlFor="solo" className="cursor-pointer">Solo Match</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Team Selection */}
                        {matchType === 'team' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Team A</Label>
                                    <Select 
                                        value={formData.team_a_id}
                                        onValueChange={(v) => setFormData({ ...formData, team_a_id: v })}
                                    >
                                        <SelectTrigger data-testid="team-a-select">
                                            <SelectValue placeholder="Select team" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map(team => (
                                                <SelectItem key={team.id} value={team.id}>
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Team B</Label>
                                    <Select 
                                        value={formData.team_b_id}
                                        onValueChange={(v) => setFormData({ ...formData, team_b_id: v })}
                                    >
                                        <SelectTrigger data-testid="team-b-select">
                                            <SelectValue placeholder="Select team" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map(team => (
                                                <SelectItem key={team.id} value={team.id}>
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Player Selection */}
                        {matchType === 'solo' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Player A</Label>
                                    <Select 
                                        value={formData.player_a_id}
                                        onValueChange={(v) => setFormData({ ...formData, player_a_id: v })}
                                    >
                                        <SelectTrigger data-testid="player-a-select">
                                            <SelectValue placeholder="Select player" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {players.map(player => (
                                                <SelectItem key={player.id} value={player.id}>
                                                    {player.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Player B</Label>
                                    <Select 
                                        value={formData.player_b_id}
                                        onValueChange={(v) => setFormData({ ...formData, player_b_id: v })}
                                    >
                                        <SelectTrigger data-testid="player-b-select">
                                            <SelectValue placeholder="Select player" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {players.map(player => (
                                                <SelectItem key={player.id} value={player.id}>
                                                    {player.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Scores */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Score {matchType === 'team' ? 'Team A' : 'Player A'}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.score_a}
                                    onChange={(e) => setFormData({ ...formData, score_a: e.target.value })}
                                    placeholder="0"
                                    data-testid="score-a-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Score {matchType === 'team' ? 'Team B' : 'Player B'}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.score_b}
                                    onChange={(e) => setFormData({ ...formData, score_b: e.target.value })}
                                    placeholder="0"
                                    data-testid="score-b-input"
                                />
                            </div>
                        </div>

                        {/* Match Date */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Match Date
                            </Label>
                            <Input
                                type="date"
                                value={formData.match_date}
                                onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                                data-testid="match-date-input"
                            />
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full btn-primary"
                            disabled={loading}
                            data-testid="submit-result-btn"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Result'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
