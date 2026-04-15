import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { 
    Home, Calendar, Trophy, Users, BookOpen, MessageCircle, 
    Menu, X, LogOut, User, Settings, ChevronDown 
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import ChatWidget from './ChatWidget';

const navLinks = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/schedule', label: 'Schedule', icon: Calendar },
    { path: '/team-ladder', label: 'Team Ladder', icon: Trophy },
    { path: '/solo-ladder', label: 'Solo Ladder', icon: Users },
    { path: '/education', label: 'Learn', icon: BookOpen },
    { path: '/availability', label: 'Availability', icon: Calendar, authRequired: true },
];

export const Layout = ({ children }) => {
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA]">
            {/* Navigation */}
            <nav className="floating-nav sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
                            <div className="w-10 h-10 bg-[#0051BA] rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-lg">TB</span>
                            </div>
                            <span className="font-['Barlow_Condensed'] font-extrabold text-xl uppercase tracking-tight text-[#0F172A] hidden sm:block">
                                Tennis Buddies
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-1">
                            {navLinks.filter(link => !link.authRequired || user).map(({ path, label, icon: Icon }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                                        location.pathname === path
                                            ? 'text-[#0051BA] bg-[#0051BA]/5'
                                            : 'text-gray-600 hover:text-[#0051BA] hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </Link>
                            ))}
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-3">
                            {user ? (
                                <>
                                    {/* Chat button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setChatOpen(!chatOpen)}
                                        className="relative"
                                        data-testid="chat-toggle-btn"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                    </Button>

                                    {/* User dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-btn">
                                                <div className="w-8 h-8 bg-[#CCFF00] rounded-full flex items-center justify-center">
                                                    <span className="text-[#002040] font-bold text-sm">
                                                        {user.name?.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="hidden sm:block font-medium">{user.name}</span>
                                                <ChevronDown className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem asChild>
                                                <Link to="/profile" className="flex items-center gap-2" data-testid="profile-link">
                                                    <User className="w-4 h-4" />
                                                    Profile
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link to="/submit-result" className="flex items-center gap-2" data-testid="submit-result-link">
                                                    <Trophy className="w-4 h-4" />
                                                    Submit Result
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link to="/messages" className="flex items-center gap-2" data-testid="messages-link">
                                                    <MessageCircle className="w-4 h-4" />
                                                    Messages
                                                </Link>
                                            </DropdownMenuItem>
                                            {isAdmin && (
                                                <DropdownMenuItem asChild>
                                                    <Link to="/admin" className="flex items-center gap-2" data-testid="admin-link">
                                                        <Settings className="w-4 h-4" />
                                                        Admin Panel
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                                onClick={handleLogout}
                                                className="text-red-600 cursor-pointer"
                                                data-testid="logout-btn"
                                            >
                                                <LogOut className="w-4 h-4 mr-2" />
                                                Logout
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Link to="/login">
                                        <Button variant="ghost" data-testid="login-nav-btn">Log In</Button>
                                    </Link>
                                    <Link to="/register">
                                        <Button className="btn-primary" data-testid="register-nav-btn">Join Club</Button>
                                    </Link>
                                </div>
                            )}

                            {/* Mobile menu button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                data-testid="mobile-menu-btn"
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-100 bg-white animate-fade-in">
                        <div className="px-4 py-3 space-y-1">
                            {navLinks.filter(link => !link.authRequired || user).map(({ path, label, icon: Icon }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${
                                        location.pathname === path
                                            ? 'text-[#0051BA] bg-[#0051BA]/5'
                                            : 'text-gray-600'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </nav>

            {/* Main content */}
            <main className="min-h-[calc(100vh-64px)]">
                {children}
            </main>

            {/* Chat Widget */}
            {user && <ChatWidget isOpen={chatOpen} onClose={() => setChatOpen(false)} />}

            {/* Footer */}
            <footer className="bg-[#0F172A] text-white py-12 mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-[#CCFF00] rounded-full flex items-center justify-center">
                                    <span className="text-[#002040] font-bold text-lg">TB</span>
                                </div>
                                <span className="font-['Barlow_Condensed'] font-extrabold text-xl uppercase tracking-tight">
                                    Tennis Buddies
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Sunday doubles tennis community. Play, compete, improve.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-['Barlow_Condensed'] font-bold uppercase tracking-wide mb-4">Quick Links</h4>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li><Link to="/schedule" className="hover:text-white transition-colors">Schedule</Link></li>
                                <li><Link to="/team-ladder" className="hover:text-white transition-colors">Team Ladder</Link></li>
                                <li><Link to="/education" className="hover:text-white transition-colors">Learn Tennis</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-['Barlow_Condensed'] font-bold uppercase tracking-wide mb-4">Club Info</h4>
                            <p className="text-gray-400 text-sm">
                                Every Sunday morning<br />
                                Local Tennis Courts
                            </p>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
                        © {new Date().getFullYear()} Tennis Buddies Club. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
