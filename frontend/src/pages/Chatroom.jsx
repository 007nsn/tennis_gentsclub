import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { useAuth } from '../context/AuthContext';
import { getChatroomMessages, sendChatroomMessage } from '../lib/api';
import { toast } from 'sonner';
import { MessageCircle, Send, Loader2, Shield, Users } from 'lucide-react';

export default function Chatroom() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);
    const pollInterval = useRef(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadMessages();
        
        // Poll for new messages every 5 seconds
        pollInterval.current = setInterval(loadMessages, 5000);
        
        return () => {
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        };
    }, [user, navigate]);

    useEffect(() => {
        if (scrollRef.current) {
            const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [messages]);

    const loadMessages = async () => {
        try {
            const res = await getChatroomMessages(100);
            setMessages(res.data);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            await sendChatroomMessage(newMessage.trim());
            setNewMessage('');
            loadMessages();
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="chatroom-page">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Users className="w-8 h-8 text-[#0051BA]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl font-black uppercase tracking-tight text-[#0F172A]">
                        Club Chatroom
                    </h1>
                </div>
                <p className="text-gray-600">Chat with fellow Tennis Buddies members</p>
            </div>

            <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-[#0051BA] to-[#003E94] text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageCircle className="w-5 h-5" />
                        Tennis Buddies Chat
                        <Badge className="bg-[#CCFF00] text-[#002040] ml-2">
                            {messages.length} messages
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            Loading messages...
                        </div>
                    ) : (
                        <>
                            <ScrollArea className="h-[500px] p-4" ref={scrollRef}>
                                {messages.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>No messages yet</p>
                                        <p className="text-sm">Be the first to say hello!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map((msg, idx) => {
                                            const isMine = msg.sender_id === user.id;
                                            const isAdmin = msg.sender_role === 'admin';
                                            
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                                                    data-testid={`chat-message-${idx}`}
                                                >
                                                    <div className={`max-w-[75%] ${isMine ? 'order-2' : 'order-1'}`}>
                                                        {!isMine && (
                                                            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isAdmin ? 'bg-[#0051BA] text-white' : 'bg-[#CCFF00] text-[#002040]'}`}>
                                                                    {msg.sender_name?.charAt(0).toUpperCase()}
                                                                </span>
                                                                <span className="font-medium">{msg.sender_name}</span>
                                                                {isAdmin && (
                                                                    <Badge className="bg-[#0051BA] text-white text-[10px] py-0 px-1">
                                                                        <Shield className="w-2 h-2 mr-0.5" />
                                                                        Admin
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`px-4 py-2 rounded-2xl ${
                                                                isMine
                                                                    ? 'bg-[#0051BA] text-white rounded-br-sm'
                                                                    : isAdmin
                                                                    ? 'bg-[#0051BA]/10 text-gray-900 rounded-bl-sm border border-[#0051BA]/20'
                                                                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                                                            }`}
                                                        >
                                                            {msg.content}
                                                        </div>
                                                        <div className={`text-xs text-gray-400 mt-1 ${isMine ? 'text-right' : ''}`}>
                                                            {formatTime(msg.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>

                            <div className="p-4 border-t border-gray-100 bg-gray-50">
                                <div className="flex gap-2">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-white"
                                        disabled={sending}
                                        data-testid="chatroom-input"
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={sending || !newMessage.trim()}
                                        className="bg-[#0051BA] hover:bg-[#003E94]"
                                        data-testid="chatroom-send-btn"
                                    >
                                        {sending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-center">
                                    Messages are visible to all club members
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
