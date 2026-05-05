import { getSupabaseClient } from '@/template';

export interface Conversation {
  id: string;
  ad_id: string;
  buyer_id: string;
  seller_id: string;
  last_message?: string;
  last_message_at: string;
  created_at: string;
  ads?: { title: string };
  buyer?: { username: string; email: string };
  seller?: { username: string; email: string };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at?: string | null;
  created_at: string;
}

export async function fetchMyConversations(): Promise<{ data: Conversation[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      ads(title),
      buyer:user_profiles!conversations_buyer_id_fkey(username, email),
      seller:user_profiles!conversations_seller_id_fkey(username, email)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: data as Conversation[], error: null };
}

export async function fetchOrCreateConversation(
  adId: string,
  sellerId: string
): Promise<{ data: Conversation | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('ad_id', adId)
    .eq('buyer_id', user.id)
    .single();

  if (existing) return { data: existing as Conversation, error: null };

  const { data, error } = await supabase
    .from('conversations')
    .insert({ ad_id: adId, buyer_id: user.id, seller_id: sellerId })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Conversation, error: null };
}

export async function fetchConversationById(id: string): Promise<{ data: Conversation | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      ads(title),
      buyer:user_profiles!conversations_buyer_id_fkey(username, email),
      seller:user_profiles!conversations_seller_id_fkey(username, email)
    `)
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Conversation, error: null };
}

export async function fetchMessages(conversationId: string): Promise<{ data: Message[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: data as Message[], error: null };
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ data: Message | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, content })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await supabase
    .from('conversations')
    .update({ last_message: content, last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return { data: data as Message, error: null };
}

/** Mark all messages in a conversation as read (for the current user, messages not sent by them) */
export async function markMessagesRead(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
    .is('read_at', null);
}
