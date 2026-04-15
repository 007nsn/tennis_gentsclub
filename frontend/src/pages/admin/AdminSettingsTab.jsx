import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export function AdminSettingsTab({ settings, onSettingsChange, onSave }) {
    return (
        <TabsContent value="settings">
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-xl">
                <CardHeader>
                    <CardTitle>Club Settings</CardTitle>
                    <CardDescription>Configure court and schedule defaults</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Number of Courts</Label>
                        <Input type="number" min="1" max="10" value={settings.num_courts} onChange={(e) => onSettingsChange({ ...settings, num_courts: parseInt(e.target.value) })} data-testid="courts-input" />
                    </div>
                    <div className="space-y-2">
                        <Label>Default Location</Label>
                        <Input value={settings.default_location} onChange={(e) => onSettingsChange({ ...settings, default_location: e.target.value })} data-testid="location-input" />
                    </div>
                    <div className="space-y-2">
                        <Label>Match Duration (minutes)</Label>
                        <Input type="number" min="15" max="120" value={settings.match_duration_minutes} onChange={(e) => onSettingsChange({ ...settings, match_duration_minutes: parseInt(e.target.value) })} data-testid="duration-input" />
                    </div>
                    <div className="space-y-2">
                        <Label>Default Start Time</Label>
                        <Input type="time" value={settings.default_start_time} onChange={(e) => onSettingsChange({ ...settings, default_start_time: e.target.value })} data-testid="start-time-input" />
                    </div>
                    <Button onClick={() => onSave(settings)} className="w-full btn-primary" data-testid="save-settings-btn">Save Settings</Button>
                </CardContent>
            </Card>
        </TabsContent>
    );
}
