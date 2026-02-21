import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { getSchedules } from '../lib/api';
import { Calendar as CalendarComponent } from '../components/ui/calendar';

export default function Schedule() {
    const [schedules, setSchedules] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSchedules();
    }, []);

    const loadSchedules = async () => {
        try {
            const response = await getSchedules();
            setSchedules(response.data);
        } catch (error) {
            console.error('Error loading schedules:', error);
        } finally {
            setLoading(false);
        }
    };

    const scheduleDates = schedules.map(s => new Date(s.match_date).toDateString());
    
    const filteredSchedules = schedules.filter(s => 
        new Date(s.match_date).toDateString() === selectedDate.toDateString()
    );

    const upcomingSchedules = schedules.filter(s => 
        new Date(s.match_date) >= new Date(new Date().toDateString())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="schedule-page">
            {/* Header */}
            <div className="mb-8">
                <h1 className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black uppercase tracking-tight text-[#0F172A]">
                    Match Schedule
                </h1>
                <p className="text-gray-600 mt-2">Round Robin matches and upcoming events</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Calendar */}
                <div className="lg:col-span-1">
                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <CardHeader>
                            <CardTitle className="font-['Barlow_Condensed'] uppercase">Select Date</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CalendarComponent
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                className="rounded-lg"
                                modifiers={{
                                    hasMatch: (date) => scheduleDates.includes(date.toDateString())
                                }}
                                modifiersStyles={{
                                    hasMatch: { 
                                        backgroundColor: '#CCFF00', 
                                        color: '#002040',
                                        fontWeight: 'bold'
                                    }
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Schedule List */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Selected Date Matches */}
                    <div>
                        <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#0051BA]" />
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h2>
                        
                        {loading ? (
                            <Card className="border-none">
                                <CardContent className="p-8 text-center text-gray-500">
                                    Loading schedules...
                                </CardContent>
                            </Card>
                        ) : filteredSchedules.length > 0 ? (
                            <div className="space-y-4">
                                {filteredSchedules.map(schedule => (
                                    <Card key={schedule.id} className="match-card border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-testid={`schedule-item-${schedule.id}`}>
                                        <CardContent className="p-6">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="font-bold text-lg mb-2">{schedule.title}</h3>
                                                    {schedule.description && (
                                                        <p className="text-gray-600 text-sm mb-3">{schedule.description}</p>
                                                    )}
                                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4" />
                                                            {schedule.match_time}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-4 h-4" />
                                                            {schedule.location}
                                                        </div>
                                                    </div>
                                                </div>
                                                {schedule.teams && schedule.teams.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {schedule.teams.map((team, idx) => (
                                                            <Badge key={idx} variant="outline" className="border-[#0051BA] text-[#0051BA]">
                                                                <Users className="w-3 h-3 mr-1" />
                                                                {team}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-none">
                                <CardContent className="p-8 text-center text-gray-500">
                                    No matches scheduled for this date
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Upcoming Matches */}
                    <div>
                        <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase mb-4">
                            All Upcoming Matches
                        </h2>
                        {upcomingSchedules.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingSchedules.map(schedule => (
                                    <Card 
                                        key={schedule.id} 
                                        className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() => setSelectedDate(new Date(schedule.match_date))}
                                    >
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-[#0051BA]/10 rounded-lg flex flex-col items-center justify-center">
                                                    <span className="text-xs text-[#0051BA] font-bold uppercase">
                                                        {new Date(schedule.match_date).toLocaleDateString('en-US', { month: 'short' })}
                                                    </span>
                                                    <span className="text-lg font-bold text-[#0051BA]">
                                                        {new Date(schedule.match_date).getDate()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold">{schedule.title}</h4>
                                                    <p className="text-sm text-gray-500">{schedule.match_time} • {schedule.location}</p>
                                                </div>
                                            </div>
                                            <Badge className="bg-[#CCFF00] text-[#002040]">
                                                {schedule.teams?.length || 0} Teams
                                            </Badge>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-none">
                                <CardContent className="p-8 text-center text-gray-500">
                                    No upcoming matches scheduled
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
