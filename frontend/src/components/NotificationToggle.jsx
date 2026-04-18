import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { getVapidKey, pushSubscribe, pushUnsubscribe, getPushStatus } from '../lib/api';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function NotificationToggle({ compact = false }) {
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [supported, setSupported] = useState(true);

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setSupported(false);
            setLoading(false);
            return;
        }
        getPushStatus()
            .then(res => setSubscribed(res.data.subscribed))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleToggle = useCallback(async () => {
        setToggling(true);
        try {
            if (subscribed) {
                await pushUnsubscribe();
                const reg = await navigator.serviceWorker.getRegistration('/sw-push.js');
                if (reg) {
                    const sub = await reg.pushManager.getSubscription();
                    if (sub) await sub.unsubscribe();
                }
                setSubscribed(false);
                toast.success('Notifications disabled');
            } else {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    toast.error('Notification permission denied');
                    setToggling(false);
                    return;
                }
                const reg = await navigator.serviceWorker.register('/sw-push.js');
                await navigator.serviceWorker.ready;
                const vapidRes = await getVapidKey();
                const applicationServerKey = urlBase64ToUint8Array(vapidRes.data.publicKey);
                const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey
                });
                await pushSubscribe(sub.toJSON());
                setSubscribed(true);
                toast.success('Notifications enabled! You\'ll be notified when promoted from bench.');
            }
        } catch (err) {
            console.error('Push toggle error:', err);
            toast.error('Failed to toggle notifications');
        } finally {
            setToggling(false);
        }
    }, [subscribed]);

    if (!supported) return null;
    if (loading) return null;

    if (compact) {
        return (
            <Button
                size="sm"
                variant={subscribed ? 'default' : 'outline'}
                className={subscribed ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-gray-500'}
                onClick={handleToggle}
                disabled={toggling}
                data-testid="notification-toggle"
            >
                {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : subscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>
        );
    }

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid="notification-toggle-area">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${subscribed ? 'bg-green-100' : 'bg-gray-200'}`}>
                    {subscribed ? <Bell className="w-4 h-4 text-green-600" /> : <BellOff className="w-4 h-4 text-gray-400" />}
                </div>
                <div>
                    <p className="text-sm font-medium">{subscribed ? 'Notifications On' : 'Enable Notifications'}</p>
                    <p className="text-xs text-gray-500">Get notified when promoted from bench</p>
                </div>
            </div>
            <Button
                size="sm"
                variant={subscribed ? 'outline' : 'default'}
                className={subscribed ? 'text-red-500 border-red-200' : 'bg-[#0051BA]'}
                onClick={handleToggle}
                disabled={toggling}
                data-testid="notification-toggle-btn"
            >
                {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : subscribed ? 'Disable' : 'Enable'}
            </Button>
        </div>
    );
}
