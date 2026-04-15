import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { scoutOpponent, getScoutReports } from '../lib/api';
import { toast } from 'sonner';
import { Target, Loader2, Lightbulb, AlertTriangle, History, Sparkles, Crosshair } from 'lucide-react';

export default function OpponentScout() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState([]);
    const [currentStrategy, setCurrentStrategy] = useState(null);
    const [activeTab, setActiveTab] = useState('scout');
    const [formData, setFormData] = useState({
        opponent_name: '',
        playstyle: '',
        strengths: '',
        weaknesses: '',
        additional_notes: ''
    });

    const loadReports = useCallback(async () => {
        try {
            const res = await getScoutReports();
            setReports(res.data);
        } catch (error) {
            console.error('Error loading reports:', error);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadReports();
    }, [user, navigate, loadReports]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.opponent_name || !formData.playstyle || !formData.strengths || !formData.weaknesses) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setCurrentStrategy(null);

        try {
            const res = await scoutOpponent(formData);
            setCurrentStrategy(res.data);
            toast.success('Strategy generated!');
            loadReports();
        } catch (error) {
            toast.error('Failed to generate strategy. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const playstyleExamples = [
        'Aggressive baseliner',
        'Serve and volley',
        'Counter-puncher',
        'All-court player',
        'Big server',
        'Net rusher',
        'Defensive retriever'
    ];

    if (!user) return null;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="opponent-scout-page">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Target className="w-8 h-8 text-[#E06040]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl font-black uppercase tracking-tight text-[#0F172A]">
                        Opponent Scout
                    </h1>
                </div>
                <p className="text-gray-600">Get AI-powered tactical strategies for your upcoming matches</p>
                <Badge className="mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Powered by Gemini Pro
                </Badge>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border border-gray-100 p-1 mb-6">
                    <TabsTrigger value="scout" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <Crosshair className="w-4 h-4" />
                        Scout Opponent
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Past Reports
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="scout">
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Input Form */}
                        <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                            <CardHeader>
                                <CardTitle>Describe Your Opponent</CardTitle>
                                <CardDescription>
                                    Provide details about your opponent's game for personalized tactics
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Opponent Name *</Label>
                                        <Input
                                            value={formData.opponent_name}
                                            onChange={(e) => setFormData({ ...formData, opponent_name: e.target.value })}
                                            placeholder="e.g., John Smith"
                                            data-testid="opponent-name-input"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Playstyle *</Label>
                                        <Input
                                            value={formData.playstyle}
                                            onChange={(e) => setFormData({ ...formData, playstyle: e.target.value })}
                                            placeholder="e.g., Aggressive baseliner, Serve and volley"
                                            data-testid="playstyle-input"
                                        />
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {playstyleExamples.slice(0, 4).map(style => (
                                                <Badge 
                                                    key={style}
                                                    variant="outline" 
                                                    className="cursor-pointer hover:bg-[#0051BA]/10"
                                                    onClick={() => setFormData({ ...formData, playstyle: style })}
                                                >
                                                    {style}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Strengths *</Label>
                                        <Textarea
                                            value={formData.strengths}
                                            onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                                            placeholder="e.g., Powerful serve, Strong forehand, Good net presence, Fast footwork"
                                            className="min-h-20"
                                            data-testid="strengths-input"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Weaknesses *</Label>
                                        <Textarea
                                            value={formData.weaknesses}
                                            onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                                            placeholder="e.g., Inconsistent backhand, Struggles with high balls, Poor movement to the left"
                                            className="min-h-20"
                                            data-testid="weaknesses-input"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Additional Notes (Optional)</Label>
                                        <Textarea
                                            value={formData.additional_notes}
                                            onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                                            placeholder="e.g., Gets frustrated when losing, Tends to play safer when ahead"
                                            className="min-h-16"
                                        />
                                    </div>

                                    <Button 
                                        type="submit" 
                                        className="w-full btn-primary"
                                        disabled={loading}
                                        data-testid="generate-strategy-btn"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Analyzing Opponent...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Generate Match Strategy
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Strategy Output */}
                        <Card className={`border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${currentStrategy ? 'bg-gradient-to-br from-white to-[#0051BA]/5' : ''}`}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-[#E06040]" />
                                    Match Strategy
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!currentStrategy ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <p>Fill in opponent details and generate a strategy</p>
                                        <p className="text-sm mt-2">Our AI coach will analyze their game and provide tactical advice</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-fade-in">
                                        {/* Strategy Overview */}
                                        <div className="p-4 bg-[#0051BA]/10 rounded-lg">
                                            <h4 className="font-bold text-[#0051BA] mb-2 flex items-center gap-2">
                                                <Lightbulb className="w-4 h-4" />
                                                Overall Strategy
                                            </h4>
                                            <p className="text-gray-700">{currentStrategy.strategy}</p>
                                        </div>

                                        {/* Key Tactics */}
                                        <div>
                                            <h4 className="font-bold mb-3 flex items-center gap-2">
                                                <Crosshair className="w-4 h-4 text-green-600" />
                                                Key Tactics
                                            </h4>
                                            <ul className="space-y-2">
                                                {currentStrategy.key_tactics.map((tactic, idx) => (
                                                    <li key={tactic} className="flex items-start gap-2">
                                                        <Badge className="bg-green-100 text-green-800 mt-0.5">{idx + 1}</Badge>
                                                        <span className="text-gray-700">{tactic}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Warnings */}
                                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                            <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Watch Out For
                                            </h4>
                                            <ul className="space-y-1">
                                                {currentStrategy.warnings.map((warning) => (
                                                    <li key={warning} className="text-amber-700 flex items-start gap-2">
                                                        <span>•</span>
                                                        <span>{warning}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <CardHeader>
                            <CardTitle>Past Scout Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {reports.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <p>No scout reports yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reports.map((report, idx) => (
                                        <Card key={report.id} className="border border-gray-100" data-testid={`report-${idx}`}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-bold">{report.opponent_name}</h4>
                                                    <Badge variant="outline">
                                                        {new Date(report.created_at).toLocaleDateString()}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-500 mb-2">
                                                    <strong>Playstyle:</strong> {report.request.playstyle}
                                                </p>
                                                <p className="text-sm text-gray-700 line-clamp-2">
                                                    {report.response.strategy}
                                                </p>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="mt-2"
                                                    onClick={() => {
                                                        setCurrentStrategy(report.response);
                                                        setActiveTab('scout');
                                                    }}
                                                >
                                                    View Full Strategy
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
