import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Calendar, Trophy, Users, BookOpen, ArrowRight, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSchedules, getAnnouncements, getStats } from '../lib/api';

export default function Home() {
    const { user } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [teams, setTeams] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [stats, setStats] = useState({ total_members: 0, total_teams: 0, total_matches: 0 });

    const loadData = useCallback(async () => {
        try {
            const [schedulesRes, teamsRes, announcementsRes, statsRes] = await Promise.all([
                getSchedules(),
                getTeams(),
                getAnnouncements(),
                getStats()
            ]);
            setSchedules(schedulesRes.data.slice(0, 3));
            setTeams(teamsRes.data.slice(0, 5));
            setAnnouncements(announcementsRes.data.slice(0, 2));
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const features = [
        {
            icon: Calendar,
            title: 'Sunday Schedule',
            description: 'Check upcoming matches and round-robin pairings',
            link: '/schedule',
            color: 'bg-[#0051BA]'
        },
        {
            icon: Trophy,
            title: 'Best Partnerships',
            description: 'See which doubles pairings dominate the court',
            link: '/partnerships',
            color: 'bg-[#CCFF00] text-[#002040]'
        },
        {
            icon: Users,
            title: 'Solo Ladder',
            description: 'Individual player rankings and progress',
            link: '/solo-ladder',
            color: 'bg-[#E06040]'
        },
        {
            icon: BookOpen,
            title: 'Learn & Improve',
            description: 'Tennis tips, techniques and coaching videos',
            link: '/education',
            color: 'bg-[#0051BA]'
        }
    ];

    return (
        <div data-testid="home-page">
            {/* Hero Section */}
            <section className="hero-gradient relative overflow-hidden">
                <div className="absolute inset-0 net-texture opacity-50"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="animate-fade-in">
                            <Badge className="bg-[#CCFF00] text-[#002040] hover:bg-[#B3E600] mb-6 font-mono text-xs tracking-widest uppercase">
                                Sunday Doubles
                            </Badge>
                            <h1 className="font-['Barlow_Condensed'] text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-[#0F172A] leading-none mb-6">
                                Tennis<br />
                                <span className="text-[#0051BA]">Buddies</span><br />
                                Club
                            </h1>
                            <p className="text-lg text-gray-600 mb-8 max-w-lg">
                                Your Sunday doubles tennis community. Check schedules, track rankings, 
                                and improve your game with our coaching resources.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                {user ? (
                                    <Link to="/schedule">
                                        <Button className="btn-primary flex items-center gap-2" data-testid="hero-schedule-btn">
                                            View Schedule
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <Link to="/register">
                                        <Button className="btn-primary flex items-center gap-2" data-testid="hero-join-btn">
                                            Join the Club
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                )}
                                <Link to="/education">
                                    <Button className="btn-secondary" data-testid="hero-learn-btn">
                                        Doubles Tips
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        <div className="relative hidden lg:block">
                            <div className="relative z-10 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                                <img 
                                    src="https://images.unsplash.com/photo-1758314810669-346173121689?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHwxfHx0ZW5uaXMlMjBwbGF5ZXIlMjBzZXJ2aW5nJTIwYWN0aXZlfGVufDB8fHx8MTc3MTYzNTk1NXww&ixlib=rb-4.1.0&q=85"
                                    alt="Tennis player serving"
                                    className="w-full h-[400px] object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-[#CCFF00] rounded-2xl -z-10"></div>
                            <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#0051BA] rounded-full -z-10"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="bg-[#0051BA] py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-3 gap-8 text-center text-white">
                        <div>
                            <div className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black">{stats.total_members}</div>
                            <div className="text-blue-200 text-sm uppercase tracking-wide">Members</div>
                        </div>
                        <div>
                            <div className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black">{stats.total_teams}</div>
                            <div className="text-blue-200 text-sm uppercase tracking-wide">Teams</div>
                        </div>
                        <div>
                            <div className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black">{stats.total_matches}</div>
                            <div className="text-blue-200 text-sm uppercase tracking-wide">Matches Played</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Announcements */}
            {announcements.length > 0 && (
                <section className="py-12 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="font-['Barlow_Condensed'] text-2xl md:text-3xl font-bold uppercase mb-6">
                            Club Announcements
                        </h2>
                        <div className="space-y-4">
                            {announcements.map(ann => (
                                <Card key={ann.id} className={`border-l-4 ${ann.priority === 'urgent' ? 'border-l-[#E06040]' : ann.priority === 'high' ? 'border-l-[#CCFF00]' : 'border-l-[#0051BA]'}`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-lg">{ann.title}</h3>
                                                <p className="text-gray-600 mt-1">{ann.content}</p>
                                            </div>
                                            {ann.priority === 'urgent' && (
                                                <Badge className="bg-[#E06040] text-white">Urgent</Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Features Grid */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="font-['Barlow_Condensed'] text-3xl md:text-4xl font-bold uppercase mb-4">
                            Everything You Need
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            From match schedules to skill improvement, we've got your tennis journey covered
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, idx) => (
                            <Link to={feature.link} key={feature.link}>
                                <Card className="card-hover h-full border-none bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] group" data-testid={`feature-card-${idx}`}>
                                    <CardContent className="p-6">
                                        <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                            <feature.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                                        <p className="text-gray-600 text-sm">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Upcoming Matches */}
            {schedules.length > 0 && (
                <section className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="font-['Barlow_Condensed'] text-2xl md:text-3xl font-bold uppercase">
                                Upcoming Matches
                            </h2>
                            <Link to="/schedule" className="text-[#0051BA] font-medium flex items-center gap-1 hover:underline">
                                View All <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            {schedules.map(schedule => (
                                <Card key={schedule.id} className="match-card bg-white" data-testid={`schedule-card-${schedule.id}`}>
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(schedule.match_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </div>
                                        <h3 className="font-bold text-lg mb-2">{schedule.title}</h3>
                                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                                            <Clock className="w-4 h-4" />
                                            {schedule.match_time}
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <MapPin className="w-4 h-4" />
                                            {schedule.location}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* CTA Section */}
            {!user && (
                <section className="py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="relative bg-[#0051BA] rounded-3xl overflow-hidden">
                            <div className="absolute inset-0 net-texture opacity-10"></div>
                            <div className="grid lg:grid-cols-2 gap-8 p-8 md:p-12 items-center relative z-10">
                                <div className="text-white">
                                    <h2 className="font-['Barlow_Condensed'] text-3xl md:text-4xl font-black uppercase mb-4">
                                        Ready to Play?
                                    </h2>
                                    <p className="text-blue-200 mb-6">
                                        Join our Sunday doubles community. Track your progress, compete in our ladder, 
                                        and improve your game with coaching resources.
                                    </p>
                                    <Link to="/register">
                                        <Button className="btn-primary" data-testid="cta-join-btn">
                                            Join Tennis Buddies
                                        </Button>
                                    </Link>
                                </div>
                                <div className="hidden lg:block">
                                    <img 
                                        src="https://images.pexels.com/photos/5739200/pexels-photo-5739200.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                                        alt="Doubles tennis action"
                                        className="rounded-2xl w-full h-64 object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}
            {/* Support Banner */}
            <section className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#CCFF00] rounded-full flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-[#002040]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Love Tennis Buddies Club?</p>
                                <p className="text-gray-400 text-xs">Help keep the site running by supporting us on Emergent</p>
                            </div>
                        </div>
                        <a
                            href="https://www.emergentagent.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#CCFF00] text-[#002040] rounded-lg text-sm font-bold hover:bg-[#B3E600] transition-colors shrink-0"
                            data-testid="home-support-btn"
                        >
                            Support This Site
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}
