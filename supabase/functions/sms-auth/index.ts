import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function sendTwilioSMS(to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body });
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Twilio error: ${err}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, phone, otp } = await req.json();

    // ── SEND OTP ──
    if (action === 'send') {
      if (!phone) {
        return new Response(JSON.stringify({ error: 'Phone number is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Invalidate previous OTPs for this phone
      await supabaseAdmin
        .from('phone_otps')
        .update({ used: true })
        .eq('phone', phone)
        .eq('used', false);

      // Store new OTP
      const { error: insertError } = await supabaseAdmin
        .from('phone_otps')
        .insert({ phone, otp_code: code, expires_at: expiresAt });

      if (insertError) throw new Error(`DB error: ${insertError.message}`);

      // Send via Twilio
      const message = `رمز التحقق الخاص بك في سوق قلقيلية هو: ${code}\nYour Souq Qalqilya verification code: ${code}`;
      await sendTwilioSMS(phone, message);

      console.log(`OTP sent to ${phone}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── VERIFY OTP & SIGN IN / REGISTER ──
    if (action === 'verify') {
      if (!phone || !otp) {
        return new Response(JSON.stringify({ error: 'Phone and OTP are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Look up OTP
      const { data: otpRecord, error: otpError } = await supabaseAdmin
        .from('phone_otps')
        .select('*')
        .eq('phone', phone)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpRecord) {
        return new Response(JSON.stringify({ error: 'Invalid or expired code. Please request a new one.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (otpRecord.otp_code !== otp) {
        return new Response(JSON.stringify({ error: 'Incorrect code. Please try again.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark OTP as used
      await supabaseAdmin.from('phone_otps').update({ used: true }).eq('id', otpRecord.id);

      // Derive a synthetic email from phone (normalized)
      const normalizedPhone = phone.replace(/[^0-9]/g, '');
      const syntheticEmail = `phone_${normalizedPhone}@sms.souqqalqilya.local`;
      const syntheticPassword = `SMS_${normalizedPhone}_SQ_2024!`;

      // Try to find existing user via user_profiles table (efficient — no listUsers)
      const { data: profileData } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', syntheticEmail)
        .maybeSingle();

      let userId: string;

      if (profileData?.id) {
        // Existing user
        userId = profileData.id;
      } else {
        // New user — create account
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: syntheticEmail,
          password: syntheticPassword,
          email_confirm: true,
          user_metadata: { phone, auth_method: 'sms' },
        });

        if (createError || !newUser.user) {
          console.error('Create user error:', createError);
          throw new Error(`Failed to create user: ${createError?.message}`);
        }

        userId = newUser.user.id;

        // Update user_profiles with phone number
        await supabaseAdmin
          .from('user_profiles')
          .update({ phone, username: phone })
          .eq('id', userId);
      }

      // Generate session using sign-in with password
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: syntheticEmail,
      });

      if (signInError || !signInData) {
        console.error('Sign in error:', signInError);
        throw new Error(`Failed to create session: ${signInError?.message}`);
      }

      // Use signInWithPassword to get a proper session
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
        email: syntheticEmail,
        password: syntheticPassword,
      });

      if (sessionError || !sessionData.session) {
        throw new Error(`Session error: ${sessionError?.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        session: sessionData.session,
        user: sessionData.user,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('sms-auth error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
