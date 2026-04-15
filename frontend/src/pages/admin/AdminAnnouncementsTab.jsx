import { useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

export function AdminAnnouncementsTab({ announcements, loading, onCreateAnnouncement, onDeleteAnnouncement }) {
    const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', priority: 'normal' });

    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();
        if (!announcementForm.title || !announcementForm.content) {
            return;
        }
        const success = await onCreateAnnouncement(announcementForm);
        if (success) {
            setAnnouncementForm({ title: '', content: '', priority: 'normal' });
        }
    };

    return (
        <TabsContent value="announcements">
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader><CardTitle>Post Announcement</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                            <Input value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} placeholder="Title" data-testid="announcement-title-input" />
                            <Textarea value={announcementForm.content} onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })} placeholder="Content..." data-testid="announcement-content-input" />
                            <Select value={announcementForm.priority} onValueChange={(v) => setAnnouncementForm({ ...announcementForm, priority: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit" className="w-full btn-primary" disabled={loading} data-testid="post-announcement-btn"><Plus className="w-4 h-4 mr-2" />Post</Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader><CardTitle>Recent Announcements</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {announcements.map(ann => (
                                <div key={ann.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`announcement-${ann.id}`}>
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            {ann.title}
                                            {ann.priority === 'urgent' && <Badge className="bg-[#E06040]">Urgent</Badge>}
                                        </div>
                                        <div className="text-sm text-gray-500">{new Date(ann.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => onDeleteAnnouncement(ann.id)}>
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
