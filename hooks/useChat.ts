import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Silent background poll — never shows spinner
  const pollSilent = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await fetchMessages(conversationId);
    setMessages(data);
  }, [conversationId]);

  // Manual pull-to-refresh — shows refreshing indicator
  const reload = useCallback(async () => {
    setRefreshing(true);
    await pollSilent();
    setRefreshing(false);
  }, [pollSilent]);

  useEffect(() => {
    if (!conversationId) return;
    // Initial load
    fetchMessages(conversationId).then(({ data }) => {
      setMessages(data);
      setInitialLoading(false);
    });
    // Background polling (silent)
    intervalRef.current = setInterval(pollSilent, CHAT_POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [conversationId]);

  return { messages, loading: initialLoading, refreshing, reload };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Recompute only the unread badge count without refetching conversations */
  const refreshUnread = async () => {
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
      prevUnreadRef.current = newCount;
      setUnreadCount(newCount);
      // Update app badge count
      if (Notifications && Platform.OS !== 'web') {
        try { await Notifications.setBadgeCountAsync(newCount); } catch (_) {}
      }
    } catch {
      setUnreadCount(0);
    }
  };

  const load = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    const { data } = await fetchMyConversations();
    setConversations(data);
    if (showSpinner) setLoading(false);

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
      // Update app badge count
      if (Notifications && Platform.OS !== 'web') {
        try { await Notifications.setBadgeCountAsync(newCount); } catch (_) {}
      }
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    load(true); // Show spinner only on first load
    intervalRef.current = setInterval(() => load(false), CHAT_POLL_INTERVAL); // Silent polls
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { conversations, loading, reload: () => load(true), unreadCount, refreshUnread };
}
