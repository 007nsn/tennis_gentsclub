import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { useAuth } from '../context/AuthContext';
import { sendStrategyMessage, newStrategySession } from '../lib/api';
import { toast } from 'sonner';
import { Bot, Send, Loader2, Sparkles, RotateCcw, Lightbulb } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
    "How should I position myself at the net in doubles?",
    "When should I poach vs stay?",
    "Best strategy against a big server?",
    "How do I handle a lobber?",
    "Tips for serving in doubles",
    "When to use the I-formation?"
];

export default function StrategyBot() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'm your Tennis Strategy Coach, powered by Gemini Pro. I specialize in doubles tactics, court positioning, and match strategy. Ask me anything about improving your game!"
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        // Create new session on mount
        initSession();
    }, [user, navigate]);

    useEffect(() => {
        if (scrollRef.current) {
            const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [messages]);

    const initSession = async () => {
        try {
            const res = await newStrategySession();
            setSessionId(res.data.session_id);
        } catch (error) {
            console.error('Error creating session:', error);
        }
    };

    const handleSend = async (text = input) => {
        if (!text.trim() || loading) return;

        const userMessage = text.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const res = await sendStrategyMessage(userMessage, sessionId);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: res.data.response 
            }]);
            // Update session ID if returned
            if (res.data.session_id) {
                setSessionId(res.data.session_id);
            }
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "I'm having trouble connecting right now. Please try again in a moment." 
            }]);
            toast.error('Strategy bot temporarily unavailable');
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNewSession = async () => {
        setMessages([{
            role: 'assistant',
            content: "Starting fresh! I'm ready to help with your tennis strategy questions. What would you like to work on?"
        }]);
        await initSession();
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="strategy-bot-page">
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-['Barlow_Condensed'] text-3xl font-black uppercase tracking-tight text-[#0F172A]">
                                Strategy Coach
                            </h1>
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Gemini Pro AI
                            </Badge>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleNewSession} data-testid="new-session-btn">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        New Chat
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-[0_8px_24px_rgba(0,0,0,0.1)] overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[#0051BA] to-[#003E94] text-white p-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Bot className="w-5 h-5" />
                        Live Strategy Advisor
                    </CardTitle>
                    <p className="text-sm text-blue-200">
                        Ask about positioning, tactics, formations, or any doubles strategy question
                    </p>
                </CardHeader>
                
                <CardContent className="p-0">
                    <ScrollArea className="h-[450px] p-4" ref={scrollRef}>
                        <div className="space-y-4">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    data-testid={`message-${idx}`}
                                >
                                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                                    <Bot className="w-3 h-3 text-white" />
                                                </div>
                                                <span className="text-xs font-medium text-gray-500">Strategy Coach</span>
                                            </div>
                                        )}
                                        <div
                                            className={`px-4 py-3 rounded-2xl ${
                                                msg.role === 'user'
                                                    ? 'bg-[#0051BA] text-white rounded-br-sm'
                                                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                                            }`}
                                        >
                                            <div className="whitespace-pre-wrap">{msg.content}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                                            <span className="text-gray-500 text-sm">Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Suggested Questions */}
                    {messages.length <= 2 && (
                        <div className="px-4 pb-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-medium text-gray-500">Try asking:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {SUGGESTED_QUESTIONS.slice(0, 4).map((question, idx) => (
                                    <Badge
                                        key={idx}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-[#0051BA]/10 hover:border-[#0051BA] transition-colors"
                                        onClick={() => handleSend(question)}
                                        data-testid={`suggestion-${idx}`}
                                    >
                                        {question}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Ask about doubles strategy, positioning, tactics..."
                                className="flex-1 bg-white"
                                disabled={loading}
                                data-testid="strategy-input"
                            />
                            <Button
                                onClick={() => handleSend()}
                                disabled={loading || !input.trim()}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                data-testid="strategy-send-btn"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-4 mt-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardContent className="p-4">
                        <h4 className="font-bold text-sm mb-1">Court Positioning</h4>
                        <p className="text-xs text-gray-500">Learn optimal positions for different situations</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardContent className="p-4">
                        <h4 className="font-bold text-sm mb-1">Formations</h4>
                        <p className="text-xs text-gray-500">I-Formation, Australian, Both Up strategies</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardContent className="p-4">
                        <h4 className="font-bold text-sm mb-1">Match Tactics</h4>
                        <p className="text-xs text-gray-500">How to handle different opponents and situations</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
