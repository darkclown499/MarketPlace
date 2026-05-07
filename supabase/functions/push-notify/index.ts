import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      recipient_id,
      sender_name,
      message_preview,
    }: {
      recipient_id: string;
      sender_name: string;
      message_preview: string;
    } = await req.json();

    if (!recipient_id || !sender_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: recipient_id, sender_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch recipient push token and actual unread message count
    const [profileResult, convResult] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select('push_token')
        .eq('id', recipient_id)
        .single(),
      supabaseAdmin
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${recipient_id},seller_id.eq.${recipient_id}`),
    ]);

    const { data: profile, error: profileError } = profileResult;
    const convIds: string[] = (convResult.data ?? []).map((c: any) => c.id);

    let unreadCount = 1;
    if (convIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .neq('sender_id', recipient_id)
        .in('conversation_id', convIds);
      unreadCount = count ?? 1;
    }

    if (profileError) {
      console.error('[push-notify] Profile fetch error:', profileError.message);
    }

    const pushToken: string | null = profile?.push_token ?? null;

    if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
      // No valid push token — not an error, just skip silently
      return new Response(
        JSON.stringify({ ok: true, skipped: 'no_valid_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Send via Expo Push Notification API
    const expoPayload = {
      to: pushToken,
      title: sender_name,
      body: message_preview.substring(0, 100),
      sound: 'default',
      badge: unreadCount,
      data: { type: 'new_message', recipient_id },
      priority: 'high',
    };

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(expoPayload),
    });

    const expoResult = await expoRes.json();
    console.log('[push-notify] Expo response:', JSON.stringify(expoResult));

    return new Response(
      JSON.stringify({ ok: true, expo: expoResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[push-notify] Unexpected error:', err?.message);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
