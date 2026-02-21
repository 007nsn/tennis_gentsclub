import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { X, Send, MessageCircle, Loader2 } from 'lucide-react';
import { sendChatMessage } from '../lib/api';

export const ChatWidget = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'm your Tennis Buddies assistant. Ask me anything about tennis techniques, club schedules, or how to improve your game!"
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const response = await sendChatMessage(userMessage);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: response.data.content 
            }]);
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "Sorry, I'm having trouble connecting right now. Please try again later." 
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] z-50 overflow-hidden animate-fade-in"
            data-testid="chat-widget"
        >
            {/* Header */}
            <div className="bg-[#0051BA] text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#CCFF00] rounded-full flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-[#002040]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Tennis Assistant</h3>
                        <p className="text-xs text-blue-200">Powered by AI</p>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose}
                    className="text-white hover:bg-white/20"
                    data-testid="chat-close-btn"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="h-80 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] px-4 py-2 text-sm ${
                                    msg.role === 'user'
                                        ? 'chat-bubble-user'
                                        : 'chat-bubble-bot'
                                }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="chat-bubble-bot px-4 py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask about tennis..."
                        className="flex-1"
                        disabled={loading}
                        data-testid="chat-input"
                    />
                    <Button 
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-[#0051BA] hover:bg-[#003E94]"
                        data-testid="chat-send-btn"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ChatWidget;
