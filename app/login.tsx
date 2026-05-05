import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth, useAlert } from '@/template';
import { Button, Input } from '@/components';
import { Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { APP_NAME, APP_NAME_AR } from '@/constants/config';
import type { Language } from '@/constants/i18n';

type Mode = 'login' | 'register' | 'otp';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithPassword, sendOTP, verifyOTPAndLogin, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const { colors } = useTheme();
  const { t, language, setLanguage } = useLanguage();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return showAlert(t.missingFields, t.fillAllFields);
    const { error } = await signInWithPassword(email.trim(), password);
    if (error) showAlert(t.loginFailed, error);
  };

  const handleSendOTP = async () => {
    if (!email || !password) return showAlert(t.missingFields, t.fillAllFields);
    if (password !== confirmPassword) return showAlert(t.passwordMismatch, t.passwordsDontMatch);
    if (password.length < 6) return showAlert(t.weakPassword, t.passwordMin6);
    const { error } = await sendOTP(email.trim());
    if (error) return showAlert('Error', error);
    setMode('otp');
  };

  const handleVerifyOTP = async () => {
    if (!otp) return showAlert(t.enterCode, t.enterCodeMsg);
    const { error } = await verifyOTPAndLogin(email.trim(), otp, { password });
    if (error) showAlert(t.verificationFailed, error);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.primary }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Language Selector */}
        <View style={styles.langRow}>
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
              <MaterialIcons
                name="language"
                size={13}
                color={language === lang ? colors.primary : 'rgba(255,255,255,0.8)'}
              />
              <Text style={[
                styles.langPillText,
                { color: language === lang ? colors.primary : 'rgba(255,255,255,0.85)' },
                language === lang && { fontWeight: '700' },
              ]}>
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
          <Text style={styles.appName}>{language === 'ar' ? APP_NAME_AR : APP_NAME}</Text>
          <Text style={styles.tagline}>{t.tagline}</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, ...Shadow.lg }]}>
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
              <Input label={t.password} placeholder={t.passwordPlaceholder} value={password} onChangeText={setPassword} secureTextEntry />
              <Button label={t.signIn} onPress={handleLogin} loading={operationLoading} size="lg" />
            </>
          ) : (
            <>
              <View style={styles.formHeader}>
                <Text style={[styles.formTitle, { color: colors.textPrimary }]}>{t.createAccount}</Text>
                <Text style={[styles.formSub, { color: colors.textMuted }]}>{t.joinToBuySell}</Text>
              </View>
              <Input label={t.emailAddress} placeholder={t.emailPlaceholder} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Input label={t.password} placeholder={t.minPassword} value={password} onChangeText={setPassword} secureTextEntry />
              <Input label={t.confirmPassword} placeholder={t.repeatPassword} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
              <Button label={t.continueCode} onPress={handleSendOTP} loading={operationLoading} size="lg" />
            </>
          )}
        </View>

        {mode !== 'otp' ? (
          <Text style={styles.footerHint}>
            {mode === 'login' ? t.noAccount : t.haveAccount}
            <Text style={styles.footerLink} onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? t.register : t.signIn}
            </Text>
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },

  // Language selector
  langRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  langPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
  },
  langPillText: { fontSize: FontSize.sm },

  // Hero
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

  // Card
  card: { borderRadius: Radius.xxl, padding: Spacing.lg },
  tabs: { flexDirection: 'row', borderRadius: Radius.md, padding: 4, marginBottom: Spacing.lg, gap: 4 },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: Radius.sm },
  tabActive: {},
  tabText: { fontSize: FontSize.md, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  formHeader: { marginBottom: Spacing.lg },
  formTitle: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  formSub: { fontSize: FontSize.sm },

  // OTP
  otpHeader: { alignItems: 'center', marginBottom: Spacing.lg, gap: 6 },
  otpIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  otpTitle: { fontSize: FontSize.xl, fontWeight: '800', letterSpacing: -0.3 },
  otpSub: { fontSize: FontSize.sm },
  otpEmail: { fontSize: FontSize.md, fontWeight: '600' },
  link: { alignItems: 'center', marginTop: Spacing.md },
  linkText: { fontSize: FontSize.sm, fontWeight: '600' },

  footerHint: { textAlign: 'center', fontSize: FontSize.sm, color: 'rgba(255,255,255,0.65)', marginTop: Spacing.lg },
  footerLink: { color: '#fff', fontWeight: '700' },
});
