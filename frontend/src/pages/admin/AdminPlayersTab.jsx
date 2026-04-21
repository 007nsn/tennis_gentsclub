import { useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Edit2, Trash2, Download, Save, X, Loader2 } from 'lucide-react';
import { exportUsersExcel } from '../../lib/api';
import { toast } from 'sonner';

export function AdminPlayersTab({ soloPlayers, users, loading, onUpdatePlayer, onUpdateUser, onDeleteUser, onClearUsers }) {
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
    const [saving, setSaving] = useState(false);

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

    const openEditUser = (u) => {
        setEditingUser(u.id);
        setEditForm({ name: u.name || '', email: u.email || '', phone: u.phone || '' });
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        setSaving(true);
        try {
            await onUpdateUser(editingUser, {
                name: editForm.name || undefined,
                email: editForm.email || undefined,
                phone: editForm.phone || undefined
            });
            setEditingUser(null);
        } catch (e) { /* handled in parent */ }
        finally { setSaving(false); }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`Delete member "${userName}"? This removes all their data.`)) return;
        await onDeleteUser(userId);
        if (editingUser === userId) setEditingUser(null);
    };

    return (
        <TabsContent value="players">
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle>Solo Ladder Players</CardTitle>
                        <CardDescription>Edit player wins</CardDescription>
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
                            {soloPlayers.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No players yet</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Club Members</CardTitle>
                                <CardDescription>Edit name, email, phone — or delete</CardDescription>
                            </div>
                            <Button size="sm" variant="outline" className="text-[#0051BA] border-[#0051BA]/30" onClick={handleExport} data-testid="export-members-btn">
                                <Download className="w-4 h-4 mr-1" /> Export Excel
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {users.map(u => (
                                <div key={u.id} className="p-3 bg-gray-50 rounded-lg" data-testid={`user-${u.id}`}>
                                    {editingUser === u.id ? (
                                        /* Edit Modal */
                                        <div className="space-y-3" data-testid={`edit-modal-${u.id}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-[#0051BA] uppercase">Editing Member</span>
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingUser(null)}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Name</Label>
                                                <Input
                                                    value={editForm.name}
                                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Full name"
                                                    className="h-8 text-sm"
                                                    data-testid="edit-name-input"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Email</Label>
                                                <Input
                                                    type="email"
                                                    value={editForm.email}
                                                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                                    placeholder="email@example.com"
                                                    className="h-8 text-sm"
                                                    data-testid="edit-email-input"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Phone</Label>
                                                <Input
                                                    type="tel"
                                                    value={editForm.phone}
                                                    onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="(555) 123-4567"
                                                    className="h-8 text-sm"
                                                    data-testid="edit-phone-input"
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleSaveUser} disabled={saving} data-testid="save-user-btn">
                                                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                                    Save
                                                </Button>
                                                {u.role !== 'admin' && (
                                                    <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => handleDeleteUser(u.id, u.name)} data-testid="delete-user-btn">
                                                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Display Mode */
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {u.role === 'admin' && <Badge className="bg-[#0051BA]">Admin</Badge>}
                                                <div>
                                                    <div className="font-medium">{u.name}</div>
                                                    <div className="text-sm text-gray-500">{u.email}</div>
                                                    {u.phone && <div className="text-sm text-gray-400">{u.phone}</div>}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="outline" className="text-[#0051BA] border-[#0051BA]/20 h-7 text-xs" onClick={() => openEditUser(u)} data-testid={`edit-user-${u.id}`}>
                                                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                                                </Button>
                                                {u.role !== 'admin' && (
                                                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 h-7 text-xs" onClick={() => handleDeleteUser(u.id, u.name)} data-testid={`delete-user-${u.id}`}>
                                                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {users.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No members yet</p>}
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
