import { useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Edit2, Trash2, Download, Save, X, Loader2, Upload, FileSpreadsheet, Eye, EyeOff, Key, RefreshCw } from 'lucide-react';
import { exportUsersExcel, downloadImportTemplate, importUsersExcel, resetAllPasswords } from '../../lib/api';
import { toast } from 'sonner';

export function AdminPlayersTab({ soloPlayers, users, loading, onUpdatePlayer, onUpdateUser, onDeleteUser, onClearUsers, onRefresh }) {
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', password: '' });
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [revealPasswords, setRevealPasswords] = useState({});
    const [resettingAll, setResettingAll] = useState(false);

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

    const handleDownloadTemplate = async () => {
        try {
            const res = await downloadImportTemplate();
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tennis_buddies_import_template.xlsx';
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Template downloaded');
        } catch (e) {
            toast.error('Template download failed');
        }
    };

    const handleImport = async () => {
        if (!importFile) { toast.error('Please select an .xlsx file first'); return; }
        setImporting(true);
        setImportResult(null);
        try {
            const res = await importUsersExcel(importFile);
            setImportResult(res.data);
            const { created, skipped, errors } = res.data || {};
            if (created > 0) toast.success(`${created} member${created === 1 ? '' : 's'} imported`);
            if (skipped > 0) toast.info(`${skipped} skipped (email already existed)`);
            if (errors && errors.length > 0) toast.error(`${errors.length} row${errors.length === 1 ? '' : 's'} had errors`);
            setImportFile(null);
            const fileInput = document.getElementById('member-import-file');
            if (fileInput) fileInput.value = '';
            if (onRefresh) await onRefresh();
        } catch (e) {
            const msg = e?.response?.data?.detail || 'Import failed';
            toast.error(msg);
        } finally {
            setImporting(false);
        }
    };

    const openEditUser = (u) => {
        setEditingUser(u.id);
        setEditForm({ name: u.name || '', email: u.email || '', phone: u.phone || '', password: '' });
        setShowEditPassword(false);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        setSaving(true);
        try {
            const payload = {
                name: editForm.name || undefined,
                email: editForm.email || undefined,
                phone: editForm.phone || undefined
            };
            if (editForm.password && editForm.password.trim()) {
                payload.password = editForm.password.trim();
            }
            await onUpdateUser(editingUser, payload);
            setEditingUser(null);
            if (payload.password) toast.success('Password updated');
        } catch (e) { /* handled in parent */ }
        finally { setSaving(false); }
    };

    const handleResetAll = async () => {
        if (!window.confirm('Reset ALL member passwords to "tennis2025"? (Admin account is not affected.)')) return;
        setResettingAll(true);
        try {
            const res = await resetAllPasswords();
            const n = res?.data?.reset_count ?? 0;
            toast.success(`${n} member${n === 1 ? '' : 's'} reset to tennis2025`);
            if (onRefresh) await onRefresh();
        } catch (e) {
            toast.error('Reset failed');
        } finally {
            setResettingAll(false);
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`Delete member "${userName}"? This removes all their data.`)) return;
        await onDeleteUser(userId);
        if (editingUser === userId) setEditingUser(null);
    };

    return (
        <TabsContent value="players">
            <div className="space-y-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-[#0051BA]" /> Import Members from Excel</CardTitle>
                                <CardDescription>Bulk-add existing roster. Columns: <strong>Name</strong>, <strong>Email</strong>, Phone, Password. Blank Password defaults to <code>tennis2025</code>. Duplicate emails are skipped.</CardDescription>
                            </div>
                            <Button size="sm" variant="outline" className="text-[#0051BA] border-[#0051BA]/30" onClick={handleDownloadTemplate} data-testid="download-template-btn">
                                <Download className="w-4 h-4 mr-1" /> Download Template
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-3">
                            <Input
                                id="member-import-file"
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportResult(null); }}
                                className="max-w-sm"
                                data-testid="import-file-input"
                            />
                            <Button onClick={handleImport} disabled={importing || !importFile} className="btn-primary" data-testid="import-members-btn">
                                {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                                Import Members
                            </Button>
                        </div>
                        {importResult && (
                            <div className="mt-3 text-sm space-y-1" data-testid="import-result">
                                <div className="flex flex-wrap gap-3">
                                    <Badge className="bg-green-100 text-green-800">{importResult.created} created</Badge>
                                    <Badge className="bg-amber-100 text-amber-800">{importResult.skipped} skipped (duplicate email)</Badge>
                                    {importResult.errors?.length > 0 && <Badge className="bg-red-100 text-red-800">{importResult.errors.length} errors</Badge>}
                                </div>
                                {importResult.errors?.length > 0 && (
                                    <ul className="text-xs text-red-700 pl-5 list-disc max-h-32 overflow-y-auto pt-1">
                                        {importResult.errors.map((er, i) => (
                                            <li key={i}>Row {er.row}: {er.error}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle>Players (rankings)</CardTitle>
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
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <CardTitle>Club Members</CardTitle>
                                <CardDescription>Edit name, email, phone, password — or delete</CardDescription>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50" onClick={handleResetAll} disabled={resettingAll} data-testid="reset-all-passwords-btn">
                                    {resettingAll ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Reset All to tennis2025
                                </Button>
                                <Button size="sm" variant="outline" className="text-[#0051BA] border-[#0051BA]/30" onClick={handleExport} data-testid="export-members-btn">
                                    <Download className="w-4 h-4 mr-1" /> Export Excel
                                </Button>
                            </div>
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
                                            <div>
                                                <Label className="text-xs text-gray-500 flex items-center gap-1"><Key className="w-3 h-3" /> Password</Label>
                                                <div className="flex gap-1">
                                                    <div className="relative flex-1">
                                                        <Input
                                                            type={showEditPassword ? 'text' : 'password'}
                                                            value={editForm.password}
                                                            onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                                            placeholder={u.admin_visible_password ? `Current: ${u.admin_visible_password}` : 'Leave blank to keep unchanged'}
                                                            className="h-8 text-sm pr-8"
                                                            data-testid="edit-password-input"
                                                        />
                                                        <button type="button" onClick={() => setShowEditPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                                                            {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs px-2" onClick={() => { setEditForm(prev => ({ ...prev, password: 'tennis2025' })); setShowEditPassword(true); }}>
                                                        tennis2025
                                                    </Button>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1">Leave blank to keep current password. Min 4 characters.</p>
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
                                                    {u.role !== 'admin' && (
                                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                            <Key className="w-3 h-3 text-gray-400" />
                                                            <span className="font-mono">
                                                                {u.admin_visible_password
                                                                    ? (revealPasswords[u.id] ? u.admin_visible_password : '••••••••')
                                                                    : <span className="italic text-gray-400">member-set (hidden)</span>}
                                                            </span>
                                                            {u.admin_visible_password && (
                                                                <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setRevealPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))} data-testid={`reveal-password-${u.id}`}>
                                                                    {revealPasswords[u.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
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
            </div>
        </TabsContent>
    );
}
