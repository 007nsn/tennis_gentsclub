import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { login } from '../lib/api';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const { loginUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await login(formData);
            loginUser(response.data.token, response.data.user);
            toast.success('Welcome back!');
            navigate('/');
        } catch (error) {
            const detail = error.response?.data?.detail;
            let message =
                typeof detail === 'string'
                    ? detail
                    : Array.isArray(detail)
                      ? detail[0]?.msg
                      : undefined;
            if (!message && error.request && !error.response) {
                message =
                    'Cannot reach the server. Start the backend (e.g. port 8000) and check REACT_APP_BACKEND_URL.';
            }
            toast.error(message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4" data-testid="login-page">
            <div className="w-full max-w-md">
                <Card className="border-none shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                    <CardHeader className="text-center pb-2">
                        <div className="w-16 h-16 bg-[#0051BA] rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-white font-bold text-2xl">TB</span>
                        </div>
                        <CardTitle className="font-['Barlow_Condensed'] text-2xl uppercase">Welcome Back</CardTitle>
                        <CardDescription>Sign in to your Tennis Buddies account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    data-testid="login-email-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        data-testid="login-password-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <Button 
                                type="submit" 
                                className="w-full btn-primary"
                                disabled={loading}
                                data-testid="login-submit-btn"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>
                        <div className="mt-6 text-center text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-[#0051BA] font-medium hover:underline" data-testid="register-link">
                                Join the club
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
