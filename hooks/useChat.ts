import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { fetchMessages, fetchMyConversations, Message, Conversation } from '@/services/chatService';
import { getSupabaseClient } from '@/template';
import { CHAT_POLL_INTERVAL } from '@/constants/config';

// Lazy-import expo-notifications to avoid crashing on web
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (_) {}

/** Request push notification permissions (call once on app startup) */
export async function requestNotificationPermissions(): Promise<void> {
  if (!Notifications || Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (_) {}
}

/** Fire a local notification for a new message */
async function notifyNewMessage(senderName: string, preview: string): Promise<void> {
  if (!Notifications || Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: senderName,
        body: preview,
        sound: true,
      },
      trigger: null,
    });
  } catch (_) {}
}

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    const { data } = await fetchMessages(conversationId);
    setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!conversationId) return;
    load();
    intervalRef.current = setInterval(load, CHAT_POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [conversationId]);

  return { messages, loading, reload: load };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await fetchMyConversations();
    setConversations(data);
    setLoading(false);

    // Compute unread count
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setUnreadCount(0); prevUnreadRef.current = 0; return; }

      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .neq('sender_id', user.id);

      const newCount = count ?? 0;

      // If unread count increased, fire a local push notification
      if (newCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
        // Fetch the latest unread message for preview
        try {
          const { data: latestMsgs } = await supabase
            .from('messages')
            .select('content, sender_id, user_profiles!sender_id(username, email)')
            .is('read_at', null)
            .neq('sender_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (latestMsgs && latestMsgs.length > 0) {
            const msg = latestMsgs[0] as any;
            const profile = msg['user_profiles'];
            const senderName = profile?.username || profile?.email?.split('@')[0] || 'New Message';
            const preview = msg.content?.substring(0, 80) || '...';
            await notifyNewMessage(senderName, preview);
          }
        } catch (_) {}
      }

      prevUnreadRef.current = newCount;
      setUnreadCount(newCount);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, CHAT_POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { conversations, loading, reload: load, unreadCount };
}
