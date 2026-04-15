import { useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Edit2, Trash2, Plus, X } from 'lucide-react';

export function AdminPlayersTab({ soloPlayers, users, teams, loading, onUpdatePlayer, onUpdateUser, onCreateTeam, onDeleteTeam }) {
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [teamForm, setTeamForm] = useState({ name: '', member_ids: [] });

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        if (!teamForm.name || teamForm.member_ids.length === 0) {
            return;
        }
        const success = await onCreateTeam(teamForm);
        if (success) {
            setTeamForm({ name: '', member_ids: [] });
        }
    };

    return (
        <TabsContent value="players">
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle>Solo Ladder Players</CardTitle>
                        <CardDescription>Edit player names and wins</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {soloPlayers.map((player, idx) => (
                                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`solo-player-${player.id}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-[#0051BA]">#{idx + 1}</span>
                                        {editingPlayer === player.id ? (
                                            <Input
                                                type="number"
                                                defaultValue={player.wins}
                                                className="w-20"
                                                onBlur={(e) => { onUpdatePlayer(player.id, e.target.value); setEditingPlayer(null); }}
                                                autoFocus
                                            />
                                        ) : (
                                            <div>
                                                <div className="font-medium">{player.name}</div>
                                                <div className="text-sm text-gray-500">{player.wins} wins</div>
                                            </div>
                                        )}
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingPlayer(editingPlayer === player.id ? null : player.id)}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle>Club Members</CardTitle>
                        <CardDescription>Edit member names</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {users.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`user-${u.id}`}>
                                    <div className="flex items-center gap-3">
                                        {u.role === 'admin' && <Badge className="bg-[#0051BA]">Admin</Badge>}
                                        {editingUser === u.id ? (
                                            <Input
                                                defaultValue={u.name}
                                                className="w-40"
                                                onBlur={(e) => { onUpdateUser(u.id, e.target.value); setEditingUser(null); }}
                                                autoFocus
                                            />
                                        ) : (
                                            <div>
                                                <div className="font-medium">{u.name}</div>
                                                <div className="text-sm text-gray-500">{u.email}</div>
                                            </div>
                                        )}
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingUser(editingUser === u.id ? null : u.id)}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle>Create Team</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateTeam} className="space-y-4">
                            <Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="Team Name" />
                            <Select onValueChange={(v) => { if (!teamForm.member_ids.includes(v)) setTeamForm({ ...teamForm, member_ids: [...teamForm.member_ids, v] }); }}>
                                <SelectTrigger><SelectValue placeholder="Add member" /></SelectTrigger>
                                <SelectContent>
                                    {users.map(u => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            <div className="flex flex-wrap gap-2">
                                {teamForm.member_ids.map(id => {
                                    const member = users.find(u => u.id === id);
                                    return (
                                        <Badge key={id} variant="secondary" className="pr-1">
                                            {member?.name}
                                            <button type="button" onClick={() => setTeamForm({ ...teamForm, member_ids: teamForm.member_ids.filter(m => m !== id) })} className="ml-1 hover:text-red-500">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                            <Button type="submit" className="w-full btn-primary" disabled={loading}><Plus className="w-4 h-4 mr-2" />Create Team</Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader><CardTitle>Existing Teams</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {teams.map(team => (
                                <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`team-${team.id}`}>
                                    <div>
                                        <div className="font-medium">{team.name}</div>
                                        <div className="text-sm text-gray-500">{team.member_names?.join(' & ')}</div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => onDeleteTeam(team.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
}
