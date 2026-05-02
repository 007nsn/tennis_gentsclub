import { useEffect, useMemo, useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { getSiteSettings, updateSiteSettingsDraft, publishSiteSettings } from '../../lib/api';
import { SITE_SETTINGS_DEFAULTS as defaultDraft, mergeSitePayload } from '../../lib/siteSettingsDefaults';

export function AdminVisualEditorTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [draft, setDraft] = useState(defaultDraft);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getSiteSettings();
                const patch = res.data?.draft || res.data?.published;
                setDraft(mergeSitePayload(defaultDraft, patch));
            } catch (_e) {
                toast.error('Failed to load visual settings');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const previewStyle = useMemo(() => ({
        '--primary': draft.theme.primary_color,
        '--accent': draft.theme.accent_color,
        borderRadius: draft.theme.corner_radius === 'large' ? '1rem' : draft.theme.corner_radius === 'small' ? '0.35rem' : '0.65rem',
    }), [draft]);

    const saveDraft = async () => {
        setSaving(true);
        try {
            await updateSiteSettingsDraft(draft);
            toast.success('Visual settings draft saved');
        } catch (_e) {
            toast.error('Failed to save draft');
        } finally {
            setSaving(false);
        }
    };

    const publishDraft = async () => {
        setPublishing(true);
        try {
            await updateSiteSettingsDraft(draft);
            await publishSiteSettings();
            toast.success('Visual settings published');
        } catch (_e) {
            toast.error('Failed to publish settings');
        } finally {
            setPublishing(false);
        }
    };

    if (loading) {
        return <TabsContent value="visual-editor"><p className="text-sm text-gray-500">Loading visual editor...</p></TabsContent>;
    }

    return (
        <TabsContent value="visual-editor">
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle>Visual Editor</CardTitle>
                        <CardDescription>Edit theme and homepage content, then publish.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-3">
                            <h4 className="font-medium text-sm">Theme</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>Primary Color</Label>
                                    <Input type="color" value={draft.theme.primary_color} onChange={(e) => setDraft({ ...draft, theme: { ...draft.theme, primary_color: e.target.value } })} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Accent Color</Label>
                                    <Input type="color" value={draft.theme.accent_color} onChange={(e) => setDraft({ ...draft, theme: { ...draft.theme, accent_color: e.target.value } })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>Button Style</Label>
                                    <Select value={draft.theme.button_style} onValueChange={(v) => setDraft({ ...draft, theme: { ...draft.theme, button_style: v } })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="solid">Solid</SelectItem>
                                            <SelectItem value="outline">Outline</SelectItem>
                                            <SelectItem value="pill">Pill</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Corner Radius</Label>
                                    <Select value={draft.theme.corner_radius} onValueChange={(v) => setDraft({ ...draft, theme: { ...draft.theme, corner_radius: v } })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="small">Small</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="large">Large</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-medium text-sm">Homepage Content</h4>
                            <Input value={draft.home_content.hero_title} onChange={(e) => setDraft({ ...draft, home_content: { ...draft.home_content, hero_title: e.target.value } })} placeholder="Hero Title" />
                            <Input value={draft.home_content.hero_subtitle} onChange={(e) => setDraft({ ...draft, home_content: { ...draft.home_content, hero_subtitle: e.target.value } })} placeholder="Hero Subtitle" />
                            <div className="grid grid-cols-2 gap-3">
                                <Input value={draft.home_content.hero_cta_label} onChange={(e) => setDraft({ ...draft, home_content: { ...draft.home_content, hero_cta_label: e.target.value } })} placeholder="CTA Label" />
                                <Input value={draft.home_content.hero_cta_url} onChange={(e) => setDraft({ ...draft, home_content: { ...draft.home_content, hero_cta_url: e.target.value } })} placeholder="CTA URL" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Section Visibility</h4>
                            <div className="flex items-center justify-between"><Label>Show Announcements</Label><Switch checked={draft.layout_flags.show_announcements} onCheckedChange={(v) => setDraft({ ...draft, layout_flags: { ...draft.layout_flags, show_announcements: v } })} /></div>
                            <div className="flex items-center justify-between"><Label>Show Upcoming Matches</Label><Switch checked={draft.layout_flags.show_upcoming_matches} onCheckedChange={(v) => setDraft({ ...draft, layout_flags: { ...draft.layout_flags, show_upcoming_matches: v } })} /></div>
                            <div className="flex items-center justify-between"><Label>Show Support Banner</Label><Switch checked={draft.layout_flags.show_support_banner} onCheckedChange={(v) => setDraft({ ...draft, layout_flags: { ...draft.layout_flags, show_support_banner: v } })} /></div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setDraft(defaultDraft)} data-testid="visual-reset-btn">Reset</Button>
                            <Button onClick={saveDraft} disabled={saving} className="bg-[#0051BA]" data-testid="visual-save-draft-btn">{saving ? 'Saving...' : 'Save Draft'}</Button>
                            <Button onClick={publishDraft} disabled={publishing} className="bg-green-600 hover:bg-green-700" data-testid="visual-publish-btn">{publishing ? 'Publishing...' : 'Publish'}</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle>Live Preview</CardTitle>
                        <CardDescription>Preview draft theme and hero content.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="p-5 border border-gray-100 bg-gray-50" style={previewStyle}>
                            <div className="p-5 text-white" style={{ backgroundColor: draft.theme.primary_color, borderRadius: previewStyle.borderRadius }}>
                                <p className="text-sm opacity-90">Hero Preview</p>
                                <h3 className="text-xl font-bold mt-1">{draft.home_content.hero_title}</h3>
                                <p className="text-sm mt-1 opacity-90">{draft.home_content.hero_subtitle}</p>
                                <button
                                    type="button"
                                    className={`mt-3 px-3 py-2 text-sm font-semibold ${
                                        draft.theme.button_style === 'pill' ? 'rounded-full' : draft.theme.button_style === 'outline' ? 'rounded border border-white' : 'rounded'
                                    }`}
                                    style={{
                                        backgroundColor: draft.theme.button_style === 'outline' ? 'transparent' : draft.theme.accent_color,
                                        color: draft.theme.button_style === 'outline' ? '#fff' : '#0F172A',
                                    }}
                                >
                                    {draft.home_content.hero_cta_label}
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-gray-600 space-y-1">
                                <p>Announcements: {draft.layout_flags.show_announcements ? 'Visible' : 'Hidden'}</p>
                                <p>Upcoming Matches: {draft.layout_flags.show_upcoming_matches ? 'Visible' : 'Hidden'}</p>
                                <p>Support Banner: {draft.layout_flags.show_support_banner ? 'Visible' : 'Hidden'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
}

