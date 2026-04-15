import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { getUpcomingSundays, setAvailability, getAvailability } from '../lib/api';
import { toast } from 'sonner';
import { Calendar, Check, X, Loader2 } from 'lucide-react';

export default function Availability() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sundays, setSundays] = useState([]);
    const [myAvailability, setMyAvailability] = useState({});
    const [allAvailability, setAllAvailability] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadData();
    }, [user, navigate]);

    const loadData = async () => {
        try {
            const sundaysRes = await getUpcomingSundays();
            setSundays(sundaysRes.data.sundays);

            // Load availability for each Sunday
            const availMap = {};
            const allAvailMap = {};
            for (const date of sundaysRes.data.sundays) {
                const availRes = await getAvailability(date);
                allAvailMap[date] = availRes.data;
                const myAvail = availRes.data.find(a => a.user_id === user.id);
                if (myAvail) {
                    availMap[date] = myAvail.available;
                }
            }
            setMyAvailability(availMap);
            setAllAvailability(allAvailMap);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSetAvailability = async (date, available) => {
        setSubmitting(date);
        try {
            await setAvailability({ date, available });
            setMyAvailability(prev => ({ ...prev, [date]: available }));
            toast.success(available ? 'Marked as available!' : 'Marked as unavailable');
            loadData(); // Refresh all availability
        } catch (error) {
            toast.error('Failed to update availability');
        } finally {
            setSubmitting(null);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="availability-page">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-8 h-8 text-[#0051BA]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl font-black uppercase tracking-tight text-[#0F172A]">
                        Sunday Availability
                    </h1>
                </div>
                <p className="text-gray-600">Confirm your availability for upcoming Sunday doubles</p>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : (
                <div className="space-y-6">
                    {sundays.map(date => {
                        const dateObj = new Date(date + 'T12:00:00');
                        const isAvailable = myAvailability[date];
                        const availablePlayers = (allAvailability[date] || []).filter(a => a.available);

                        return (
                            <Card key={date} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-testid={`availability-${date}`}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="font-['Barlow_Condensed'] text-xl uppercase">
                                                {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                            </CardTitle>
                                            <CardDescription>
                                                {availablePlayers.length} player{availablePlayers.length !== 1 ? 's' : ''} available
                                            </CardDescription>
                                        </div>
                                        {isAvailable !== undefined && (
                                            <Badge className={isAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                                {isAvailable ? 'You\'re In!' : 'Not Available'}
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleSetAvailability(date, true)}
                                                disabled={submitting === date}
                                                className={`flex-1 ${isAvailable === true ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-100 text-gray-700 hover:bg-green-100'}`}
                                                data-testid={`available-btn-${date}`}
                                            >
                                                {submitting === date ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Check className="w-4 h-4 mr-2" />
                                                        I'm In!
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => handleSetAvailability(date, false)}
                                                disabled={submitting === date}
                                                variant="outline"
                                                className={`flex-1 ${isAvailable === false ? 'bg-gray-200' : ''}`}
                                                data-testid={`unavailable-btn-${date}`}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Can't Make It
                                            </Button>
                                        </div>
                                    </div>

                                    {availablePlayers.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <p className="text-sm text-gray-500 mb-2">Who's playing:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {availablePlayers.map(player => (
                                                    <Badge key={player.user_id} variant="outline" className="border-[#0051BA] text-[#0051BA]">
                                                        {player.user_name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
