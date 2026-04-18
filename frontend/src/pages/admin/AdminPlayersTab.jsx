import { useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Edit2, Trash2, Download } from 'lucide-react';
import { exportUsersExcel } from '../../lib/api';
import { toast } from 'sonner';

export function AdminPlayersTab({ soloPlayers, users, loading, onUpdatePlayer, onUpdateUser, onClearUsers }) {

    const handleExport = async () => {
        try {
            const res = await exportUsersExcel();
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tennis_buddies_members.xlsx';
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Members exported!');
        } catch (e) {
            toast.error('Export failed');
        }
    };
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
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Club Members</CardTitle>
                                <CardDescription>Edit member names</CardDescription>
                            </div>
                            <Button size="sm" variant="outline" className="text-[#0051BA] border-[#0051BA]/30" onClick={handleExport} data-testid="export-members-btn">
                                <Download className="w-4 h-4 mr-1" /> Export Excel
                            </Button>
                        </div>
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
                                                {u.phone && <div className="text-sm text-gray-400">{u.phone}</div>}
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
                {onClearUsers && (
                    <div className="lg:col-span-2 pt-2">
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { if (window.confirm('Delete all users except admin?')) onClearUsers(); }} data-testid="clear-users-btn">
                            <Trash2 className="w-3 h-3 mr-1" /> Clear All Users (except admin)
                        </Button>
                    </div>
                )}
            </div>
        </TabsContent>
    );
}
