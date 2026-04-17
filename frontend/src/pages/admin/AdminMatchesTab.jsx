import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Check, X, Trash2 } from 'lucide-react';

export function AdminMatchesTab({ pendingMatches, onApprove, onReject, onClearMatches }) {
    return (
        <TabsContent value="matches">
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardHeader>
                    <CardTitle>Pending Match Results</CardTitle>
                    <CardDescription>Review and approve submitted match results</CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingMatches.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                            <p>No pending matches to review</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingMatches.map(match => (
                                <div key={match.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" data-testid={`pending-match-${match.id}`}>
                                    <div>
                                        <div className="font-medium">
                                            {match.match_type === 'team'
                                                ? `${match.team_a_name} vs ${match.team_b_name}`
                                                : `${match.player_a_name} vs ${match.player_b_name}`
                                            }
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Score: {match.score_a} - {match.score_b} {'\u2022'} {new Date(match.match_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => onApprove(match.id)} data-testid={`approve-match-${match.id}`}>
                                            <Check className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => onReject(match.id)} data-testid={`reject-match-${match.id}`}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            {onClearMatches && (
                <div className="mt-4">
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { if (window.confirm('Delete all matches, teams & solo ladder entries?')) onClearMatches(); }} data-testid="clear-matches-btn">
                        <Trash2 className="w-3 h-3 mr-1" /> Clear All Matches & Teams
                    </Button>
                </div>
            )}
        </TabsContent>
    );
}
