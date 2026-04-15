import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { useAuth } from '../context/AuthContext';
import { getMessages, sendMessage, markMessageRead, getUsers } from '../lib/api';
import { toast } from 'sonner';
import { MessageCircle, Send, Loader2, User, Shield } from 'lucide-react';

export default function Messages() {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [users, setUsers] = useState([]);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadData();
    }, [user, navigate]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadData = async () => {
        try {
            const [messagesRes, usersRes] = await Promise.all([
                getMessages(),
                getUsers()
            ]);
            setMessages(messagesRes.data.reverse());
            setUsers(usersRes.data);

            // Mark unread messages as read
            for (const msg of messagesRes.data) {
                if (!msg.read && msg.recipient_id === user.id) {
                    await markMessageRead(msg.id);
                }
            }
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
            await sendMessage({ content: newMessage.trim() });
            setNewMessage('');
            toast.success('Message sent!');
            loadData();
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const getAdminName = () => {
        const admin = users.find(u => u.role === 'admin');
        return admin?.name || 'Admin';
    };

    if (!user) return null;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="messages-page">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <MessageCircle className="w-8 h-8 text-[#0051BA]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl font-black uppercase tracking-tight text-[#0F172A]">
                        Messages
                    </h1>
                </div>
                <p className="text-gray-600">
                    {isAdmin ? 'Messages from club members' : `Contact ${getAdminName()} (Admin)`}
                </p>
            </div>

            <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                <CardHeader className="border-b border-gray-100">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        {isAdmin ? (
                            <>
                                <User className="w-5 h-5" />
                                Member Messages
                            </>
                        ) : (
                            <>
                                <Shield className="w-5 h-5 text-[#0051BA]" />
                                Chat with Admin
                            </>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading messages...</div>
                    ) : (
                        <>
                            <ScrollArea className="h-96 p-4" ref={scrollRef}>
                                {messages.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>No messages yet</p>
                                        <p className="text-sm">Start a conversation!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map(msg => {
                                            const isMine = msg.sender_id === user.id;
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`max-w-[80%] ${isMine ? 'order-2' : 'order-1'}`}>
                                                        {!isMine && (
                                                            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                                                {msg.sender_name}
                                                                {users.find(u => u.id === msg.sender_id)?.role === 'admin' && (
                                                                    <Badge className="bg-[#0051BA] text-white text-[10px] py-0 px-1">Admin</Badge>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`px-4 py-2 rounded-2xl ${
                                                                isMine
                                                                    ? 'bg-[#0051BA] text-white rounded-br-sm'
                                                                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                                                            }`}
                                                        >
                                                            {msg.content}
                                                        </div>
                                                        <div className={`text-xs text-gray-400 mt-1 ${isMine ? 'text-right' : ''}`}>
                                                            {new Date(msg.created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>

                            <div className="p-4 border-t border-gray-100">
                                <div className="flex gap-2">
                                    <Textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={isAdmin ? "Reply to members..." : "Send a message to the admin..."}
                                        className="flex-1 min-h-[44px] max-h-32 resize-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        data-testid="message-input"
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={sending || !newMessage.trim()}
                                        className="bg-[#0051BA] hover:bg-[#003E94] self-end"
                                        data-testid="send-message-btn"
                                    >
                                        {sending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
