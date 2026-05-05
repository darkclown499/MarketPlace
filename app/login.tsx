import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth, useAlert } from '@/template';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Button, Input } from '@/components';
import { Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { APP_NAME, APP_NAME_AR } from '@/constants/config';
import type { Language } from '@/constants/i18n';

type Mode = 'login' | 'register' | 'otp';
type AuthMethod = 'email' | 'sms';

const PHONE_PREFIXES = ['+970', '+972', '+1', '+44'];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithPassword, sendOTP, verifyOTPAndLogin, signInWithGoogle, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const { colors, isDark } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const isAr = language === 'ar';

  const [mode, setMode] = useState<Mode>('login');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');

  // Email auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // SMS auth fields
  const [phonePrefix, setPhonePrefix] = useState('+970');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [smsOtp, setSmsOtp] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const togglePassword = useCallback(() => setShowPassword(v => !v), []);
  const toggleConfirmPassword = useCallback(() => setShowConfirmPassword(v => !v), []);

  const fullPhone = `${phonePrefix}${phoneLocal.trim()}`;

  // ── Email Login ──
  const handleLogin = async () => {
    if (!email || !password) return showAlert(t.missingFields, t.fillAllFields);
    const { error } = await signInWithPassword(email.trim(), password);
    if (error) showAlert(t.loginFailed, error);
  };

  // ── Email Register: Send OTP ──
  const handleSendOTP = async () => {
    if (!email || !password) return showAlert(t.missingFields, t.fillAllFields);
    if (password !== confirmPassword) return showAlert(t.passwordMismatch, t.passwordsDontMatch);
    if (password.length < 6) return showAlert(t.weakPassword, t.passwordMin6);
    const { error } = await sendOTP(email.trim());
    if (error) return showAlert('Error', error);
    setMode('otp');
  };

  // ── Email Register: Verify OTP ──
  const handleVerifyOTP = async () => {
    if (!otp) return showAlert(t.enterCode, t.enterCodeMsg);
    const { error } = await verifyOTPAndLogin(email.trim(), otp, { password });
    if (error) showAlert(t.verificationFailed, error);
  };

  // ── Helper: extract edge function error message ──
  const extractEdgeFnError = async (error: any): Promise<string> => {
    if (error instanceof FunctionsHttpError) {
      try {
        const text = await error.context?.text();
        if (text) {
          try { const p = JSON.parse(text); return p?.error ?? p?.message ?? text; }
          catch { return text; }
        }
      } catch { }
    }
    return error?.message ?? 'Unknown error';
  };

  // ── Google Sign-In ──
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) showAlert(isAr ? 'خطأ' : 'Error', error);
    } catch (e: any) {
      showAlert(isAr ? 'خطأ' : 'Error', e.message ?? 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── SMS: Send OTP ──
  const handleSendSmsOtp = async () => {
    if (!phoneLocal.trim()) {
      return showAlert(isAr ? 'مطلوب' : 'Required', isAr ? 'يرجى إدخال رقم الهاتف' : 'Please enter your phone number.');
    }
    setSmsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('sms-auth', {
        body: { action: 'send', phone: fullPhone },
      });
      if (error) {
        const msg = await extractEdgeFnError(error);
        showAlert(isAr ? 'خطأ' : 'Error', msg);
        return;
      }
      if (data?.error) {
        showAlert(isAr ? 'خطأ' : 'Error', data.error);
        return;
      }
      setSmsSent(true);
    } catch (e: any) {
      showAlert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed to send SMS');
    } finally {
      setSmsLoading(false);
    }
  };

  // ── SMS: Verify OTP & Sign In ──
  const handleVerifySmsOtp = async () => {
    if (!smsOtp || smsOtp.length < 4) {
      return showAlert(isAr ? 'أدخل الرمز' : 'Enter code', isAr ? 'يرجى إدخال رمز التحقق' : 'Please enter the verification code.');
    }
    setSmsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('sms-auth', {
        body: { action: 'verify', phone: fullPhone, otp: smsOtp },
      });
      if (error) {
        const msg = await extractEdgeFnError(error);
        showAlert(isAr ? 'فشل التحقق' : 'Verification failed', msg);
        return;
      }
      if (data?.error) {
        showAlert(isAr ? 'فشل التحقق' : 'Verification failed', data.error);
        return;
      }
      if (data?.session) {
        // Set the session in Supabase client
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
    } catch (e: any) {
      showAlert(isAr ? 'خطأ' : 'Error', e.message ?? 'Verification failed');
    } finally {
      setSmsLoading(false);
    }
  };

  const resetSms = () => { setSmsSent(false); setSmsOtp(''); };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.primary }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Language Selector */}
        <View style={[styles.langRow, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
          {(['en', 'ar'] as Language[]).map(lang => (
            <Pressable
              key={lang}
              style={[
                styles.langPill,
                language === lang
                  ? { backgroundColor: 'rgba(255,255,255,0.9)' }
                  : { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' },
              ]}
              onPress={() => setLanguage(lang)}
            >
              <MaterialIcons name="language" size={13} color={language === lang ? colors.primary : 'rgba(255,255,255,0.8)'} />
              <Text style={[styles.langPillText, { color: language === lang ? colors.primary : 'rgba(255,255,255,0.85)' }, language === lang && { fontWeight: '700' }]}>
                {lang === 'en' ? 'English' : 'العربية'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoRing}>
            <View style={styles.logo}>
              <MaterialIcons name="storefront" size={36} color="#fff" />
            </View>
          </View>
          <Text style={styles.appName}>{isAr ? APP_NAME_AR : APP_NAME}</Text>
          <Text style={styles.tagline}>{t.tagline}</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, ...Shadow.lg }]}>

          {/* Auth Method Toggle (Email / SMS) */}
          <View style={[styles.methodToggle, { backgroundColor: colors.background }]}>
            {(['email', 'sms'] as AuthMethod[]).map(m => {
              const isActive = authMethod === m;
              return (
                <Pressable
                  key={m}
                  style={[
                    styles.methodBtn,
                    isActive && [styles.methodBtnActive, { backgroundColor: colors.primary, ...Shadow.colored }],
                  ]}
                  onPress={() => {
                    setAuthMethod(m);
                    setMode('login');
                    setSmsSent(false);
                    setSmsOtp('');
                    setOtp('');
                  }}
                >
                  <MaterialIcons
                    name={m === 'email' ? 'email' : 'sms'}
                    size={15}
                    color={isActive ? '#fff' : colors.textMuted}
                  />
                  <Text style={[styles.methodBtnText, { color: isActive ? '#fff' : colors.textMuted }, isActive && { fontWeight: '700' }]}>
                    {m === 'email'
                      ? (isAr ? 'البريد الإلكتروني' : 'Email')
                      : (isAr ? 'رسالة SMS' : 'SMS')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ══ SMS AUTH ══ */}
          {authMethod === 'sms' ? (
            <>
              {!smsSent ? (
                <>
                  <View style={styles.formHeader}>
                    <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                      {isAr ? 'تسجيل الدخول بالهاتف' : 'Sign In with Phone'}
                    </Text>
                    <Text style={[styles.formSub, { color: colors.textMuted }]}>
                      {isAr ? 'سنرسل لك رمز تحقق عبر رسالة نصية' : 'We will send you a verification code via SMS'}
                    </Text>
                  </View>

                  {/* Phone prefix selector */}
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary, textAlign: isAr ? 'right' : 'left' }]}>
                    {isAr ? 'رقم الهاتف' : 'Phone Number'}
                  </Text>
                  <View style={[styles.phoneRow, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={[styles.prefixScroll, { borderColor: colors.border, backgroundColor: colors.background }]}
                      contentContainerStyle={styles.prefixContent}
                    >
                      {PHONE_PREFIXES.map(prefix => (
                        <Pressable
                          key={prefix}
                          style={[
                            styles.prefixBtn,
                            phonePrefix === prefix && { backgroundColor: colors.primary },
                          ]}
                          onPress={() => setPhonePrefix(prefix)}
                        >
                          <Text style={[styles.prefixText, { color: phonePrefix === prefix ? '#fff' : colors.textSecondary }]}>
                            {prefix}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <View style={styles.phoneInputWrap}>
                      <Input
                        placeholder={isAr ? 'XXXXXXXXX' : 'XXXXXXXXX'}
                        value={phoneLocal}
                        onChangeText={setPhoneLocal}
                        keyboardType="phone-pad"
                        containerStyle={styles.noMargin}
                      />
                    </View>
                  </View>
                  <Text style={[styles.phoneHint, { color: colors.textMuted, textAlign: isAr ? 'right' : 'left' }]}>
                    {isAr ? `سيتم الإرسال إلى: ${fullPhone}` : `Will send to: ${fullPhone}`}
                  </Text>

                  <Button
                    label={isAr ? 'إرسال رمز التحقق' : 'Send Verification Code'}
                    onPress={handleSendSmsOtp}
                    loading={smsLoading}
                    size="lg"
                    style={styles.submitBtn}
                  />
                </>
              ) : (
                <>
                  <View style={styles.otpHeader}>
                    <View style={[styles.otpIconWrap, { backgroundColor: '#dcfce7' }]}>
                      <MaterialIcons name="sms" size={32} color="#16a34a" />
                    </View>
                    <Text style={[styles.otpTitle, { color: colors.textPrimary }]}>
                      {isAr ? 'تحقق من هاتفك' : 'Check Your Phone'}
                    </Text>
                    <Text style={[styles.otpSub, { color: colors.textSecondary }]}>
                      {isAr ? 'أدخل الرمز المرسل إلى' : 'Enter the code sent to'}
                    </Text>
                    <Text style={[styles.otpEmail, { color: colors.primary }]}>{fullPhone}</Text>
                  </View>

                  <Input
                    label={isAr ? 'رمز التحقق' : 'Verification Code'}
                    placeholder="0  0  0  0"
                    value={smsOtp}
                    onChangeText={setSmsOtp}
                    keyboardType="number-pad"
                    maxLength={4}
                    textAlign="center"
                  />

                  <Button
                    label={isAr ? 'تحقق وتسجيل الدخول' : 'Verify & Sign In'}
                    onPress={handleVerifySmsOtp}
                    loading={smsLoading}
                    size="lg"
                  />
                  <Pressable style={styles.link} onPress={resetSms}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>
                      {isAr ? 'تغيير رقم الهاتف' : 'Change phone number'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.link} onPress={handleSendSmsOtp}>
                    <Text style={[styles.linkText, { color: colors.textMuted }]}>
                      {isAr ? 'إعادة إرسال الرمز' : 'Resend code'}
                    </Text>
                  </Pressable>
                </>
              )}
            </>
          ) : (
            /* ══ EMAIL AUTH ══ */
            <>
              {mode !== 'otp' ? (
                <View style={[styles.tabs, { backgroundColor: colors.background }]}>
                  {(['login', 'register'] as const).map(tab => (
                    <Pressable
                      key={tab}
                      style={[styles.tab, mode === tab && [styles.tabActive, { backgroundColor: colors.primary, ...Shadow.colored }]]}
                      onPress={() => setMode(tab)}
                    >
                      <Text style={[styles.tabText, { color: colors.textMuted }, mode === tab && styles.tabTextActive]}>
                        {tab === 'login' ? t.signIn : t.register}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {mode === 'otp' ? (
                <>
                  <View style={styles.otpHeader}>
                    <View style={[styles.otpIconWrap, { backgroundColor: colors.primaryGhost }]}>
                      <MaterialIcons name="mark-email-unread" size={32} color={colors.primary} />
                    </View>
                    <Text style={[styles.otpTitle, { color: colors.textPrimary }]}>{t.checkEmail}</Text>
                    <Text style={[styles.otpSub, { color: colors.textSecondary }]}>{t.codeSentTo}</Text>
                    <Text style={[styles.otpEmail, { color: colors.primary }]}>{email}</Text>
                  </View>
                  <Input
                    label={t.verificationCode}
                    placeholder="0  0  0  0"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={4}
                    textAlign="center"
                  />
                  <Button label={t.verifyCreate} onPress={handleVerifyOTP} loading={operationLoading} size="lg" />
                  <Pressable style={styles.link} onPress={() => setMode('register')}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>{t.backToRegistration}</Text>
                  </Pressable>
                </>
              ) : mode === 'login' ? (
                <>
                  <View style={styles.formHeader}>
                    <Text style={[styles.formTitle, { color: colors.textPrimary }]}>{t.welcomeBack}</Text>
                    <Text style={[styles.formSub, { color: colors.textMuted }]}>{t.signInAccount}</Text>
                  </View>
                  <Input label={t.emailAddress} placeholder={t.emailPlaceholder} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                  <Input
                    label={t.password}
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    rightElement={
                      <Pressable onPress={togglePassword} hitSlop={8}>
                        <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={colors.textMuted} />
                      </Pressable>
                    }
                  />
                  <Button label={t.signIn} onPress={handleLogin} loading={operationLoading} size="lg" />
                </>
              ) : (
                <>
                  <View style={styles.formHeader}>
                    <Text style={[styles.formTitle, { color: colors.textPrimary }]}>{t.createAccount}</Text>
                    <Text style={[styles.formSub, { color: colors.textMuted }]}>{t.joinToBuySell}</Text>
                  </View>
                  <Input label={t.emailAddress} placeholder={t.emailPlaceholder} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                  <Input
                    label={t.password}
                    placeholder={t.minPassword}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    rightElement={
                      <Pressable onPress={togglePassword} hitSlop={8}>
                        <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={colors.textMuted} />
                      </Pressable>
                    }
                  />
                  <Input
                    label={t.confirmPassword}
                    placeholder={t.repeatPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    rightElement={
                      <Pressable onPress={toggleConfirmPassword} hitSlop={8}>
                        <MaterialIcons name={showConfirmPassword ? 'visibility' : 'visibility-off'} size={20} color={colors.textMuted} />
                      </Pressable>
                    }
                  />
                  <Button label={t.continueCode} onPress={handleSendOTP} loading={operationLoading} size="lg" />
                </>
              )}

              {mode !== 'otp' ? (
                <Text style={styles.footerHint}>
                  {mode === 'login' ? t.noAccount : t.haveAccount}
                  <Text style={styles.footerLink} onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
                    {mode === 'login' ? t.register : t.signIn}
                  </Text>
                </Text>
              ) : null}
            </>
          )}
        </View>

        {/* ── GOOGLE DIVIDER + BUTTON ── */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <Text style={[styles.dividerText, { color: 'rgba(255,255,255,0.55)' }]}>
            {isAr ? 'أو' : 'or'}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
        </View>
        <Pressable
          style={[styles.googleBtn, { opacity: googleLoading ? 0.75 : 1 }]}
          onPress={handleGoogleSignIn}
          disabled={googleLoading}
        >
          <View style={styles.googleIconWrap}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text style={styles.googleBtnText}>
            {isAr ? 'المتابعة عبر Google' : 'Continue with Google'}
          </Text>
        </Pressable>

        {/* SMS info note */}
        {authMethod === 'sms' ? (
          <View style={[styles.smsNote, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]}>
            <MaterialIcons name="info-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.smsNoteText}>
              {isAr
                ? 'سيتم إنشاء حساب جديد تلقائياً إذا لم تكن مسجلاً من قبل.'
                : 'A new account will be created automatically if you are not registered yet.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },

  langRow: { justifyContent: 'flex-end', gap: Spacing.sm, marginBottom: Spacing.sm },
  langPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
  },
  langPillText: { fontSize: FontSize.sm },

  hero: { alignItems: 'center', marginBottom: Spacing.xl, paddingVertical: Spacing.md },
  logoRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  logo: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  appName: { fontSize: FontSize.xxxl, fontWeight: '800', color: '#fff', letterSpacing: -0.8, marginBottom: 4 },
  tagline: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },

  card: { borderRadius: Radius.xxl, padding: Spacing.lg },

  // Auth method toggle
  methodToggle: {
    flexDirection: 'row', borderRadius: Radius.md, padding: 4,
    marginBottom: Spacing.lg, gap: 4,
  },
  methodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: Radius.sm,
  },
  methodBtnActive: {},
  methodBtnText: { fontSize: FontSize.sm, fontWeight: '500' },

  // Email auth
  tabs: { flexDirection: 'row', borderRadius: Radius.md, padding: 4, marginBottom: Spacing.lg, gap: 4 },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: Radius.sm },
  tabActive: {},
  tabText: { fontSize: FontSize.md, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  formHeader: { marginBottom: Spacing.lg },
  formTitle: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  formSub: { fontSize: FontSize.sm },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, letterSpacing: 0.1 },
  submitBtn: { marginTop: Spacing.sm },

  // Phone input
  phoneRow: { gap: Spacing.sm, alignItems: 'flex-start', marginBottom: 6 },
  prefixScroll: {
    borderWidth: 1.5, borderRadius: Radius.md, maxWidth: 130, height: 50,
  },
  prefixContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  prefixBtn: {
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: Radius.sm, margin: 2,
  },
  prefixText: { fontSize: FontSize.sm, fontWeight: '700' },
  phoneInputWrap: { flex: 1 },
  noMargin: { marginBottom: 0 },
  phoneHint: { fontSize: FontSize.xs, fontStyle: 'italic', marginBottom: Spacing.md, color: 'transparent' },

  // OTP
  otpHeader: { alignItems: 'center', marginBottom: Spacing.lg, gap: 6 },
  otpIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  otpTitle: { fontSize: FontSize.xl, fontWeight: '800', letterSpacing: -0.3 },
  otpSub: { fontSize: FontSize.sm },
  otpEmail: { fontSize: FontSize.md, fontWeight: '600' },
  link: { alignItems: 'center', marginTop: Spacing.md },
  linkText: { fontSize: FontSize.sm, fontWeight: '600' },

  footerHint: { textAlign: 'center', fontSize: FontSize.sm, color: 'rgba(255,255,255,0.4)', marginTop: Spacing.md },
  footerLink: { color: 'rgba(255,255,255,0.9)', fontWeight: '700' },

  // SMS note
  smsNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: Radius.lg, borderWidth: 1,
    padding: Spacing.md, marginTop: Spacing.md,
  },
  smsNoteText: {
    flex: 1, fontSize: FontSize.xs, color: 'rgba(255,255,255,0.65)', lineHeight: 18,
  },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: FontSize.xs, fontWeight: '600' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderRadius: Radius.xl,
    paddingVertical: 14, marginTop: Spacing.sm,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  googleIconWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center',
  },
  googleG: { color: '#fff', fontSize: 13, fontWeight: '900', lineHeight: 17 },
  googleBtnText: { color: '#1a1a1a', fontSize: FontSize.md, fontWeight: '700' },
});
