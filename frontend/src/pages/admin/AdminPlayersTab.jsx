import { useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Edit2 } from 'lucide-react';

export function AdminPlayersTab({ soloPlayers, users, loading, onUpdatePlayer, onUpdateUser }) {
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editingUser, setEditingUser] = useState(null);

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
            </div>
        </TabsContent>
    );
}
