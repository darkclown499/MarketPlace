import React, { useState, useCallback } from 'react'; 
 import { 
 View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator, Modal, 
 } from 'react-native'; 
 import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
 import { MaterialIcons } from '@expo/vector-icons'; 
 import { useAuth, useAlert, getSupabaseClient } from '@/template'; 
 import { FunctionsHttpError } from '@supabase/supabase-js'; 
 import * as WebBrowser from 'expo-web-browser'; 
 import * as AuthSession from 'expo-auth-session'; 
 import { useRouter } from 'expo-router'; 
 import { Button, Input } from '@/components'; 
 import { Spacing, FontSize, Radius, Shadow } from '@/constants/theme'; 
 import { useTheme } from '@/hooks/useTheme'; 
 import { useLanguage } from '@/hooks/useLanguage'; 
 import { APP_NAME, APP_NAME_AR } from '@/constants/config'; 
 import type { Language } from '@/constants/i18n'; 
 
 type Mode = 'login' | 'register' | 'otp'; 
 type AuthMethod = 'email' | 'sms'; 
 
 const PHONE_PREFIXES = ['+970', '+972']; 
 
 export default function LoginScreen() { 
 const insets = useSafeAreaInsets(); 
 const { signInWithPassword, sendOTP, verifyOTPAndLogin, operationLoading } = useAuth(); 
 
 // Warm up the browser for faster Google OAuth opening (Android) 
 React.useEffect(() => { 
 if (Platform.OS !== 'web') WebBrowser.warmUpAsync(); 
 return () => { if (Platform.OS !== 'web') WebBrowser.coolDownAsync(); }; 
 }, []); 
 const { showAlert } = useAlert(); 
 const { colors, isDark } = useTheme(); 
 const { t, language, setLanguage } = useLanguage(); 
 const isAr = language === 'ar'; 
 
 const [mode, setMode] = useState<Mode>('login'); 
 const [authMethod, setAuthMethod] = useState<AuthMethod>('email'); 
 const SMS_COMING_SOON = true; 
 
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
 const [verifying, setVerifying] = useState(false); 
 const router = useRouter(); 
 
 const togglePassword = useCallback(() => setShowPassword(v => !v), []); 
 const toggleConfirmPassword = useCallback(() => setShowConfirmPassword(v => !v), []); 
 
 const fullPhone = `${phonePrefix}${phoneLocal.trim()}`; 
 
 // ── Email Login ── 
 const handleLogin = async () => { 
 if (!email.trim() || !password) return showAlert(t.missingFields, t.fillAllFields); 
 if (operationLoading || verifying) return; 
 const { error, user } = await signInWithPassword(email.trim().toLowerCase(), password); 
 if (error) return showAlert(t.loginFailed, error); 
 if (user) router.replace('/(tabs)'); 
 }; 
 
 // ── Email Register: Send OTP ── 
 const handleSendOTP = async () => { 
 if (!email.trim() || !password) return showAlert(t.missingFields, t.fillAllFields); 
 if (password !== confirmPassword) return showAlert(t.passwordMismatch, t.passwordsDontMatch); 
 if (password.length < 6) return showAlert(t.weakPassword, t.passwordMin6); 
 if (operationLoading) return; 
 const { error } = await sendOTP(email.trim().toLowerCase()); 
 if (error) return showAlert('Error', error); 
 setMode('otp'); 
 }; 
 
 // ── Email Register: Verify OTP ── 
 const handleVerifyOTP = async () => { 
 if (!otp || otp.length < 4) return showAlert(t.enterCode, t.enterCodeMsg); 
 if (verifying) return; 
 setVerifying(true); 
 try { 
 const { error, user } = await verifyOTPAndLogin(email.trim(), otp.trim(), { password }); 
 if (error) { showAlert(t.verificationFailed, error); return; } 
 if (user) router.replace('/(tabs)'); 
 } finally { 
 setVerifying(false); 
 } 
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
 const supabase = getSupabaseClient(); 
 
 // Build redirect URI: hardcode scheme on mobile to avoid "no custom scheme" error, 
 // use makeRedirectUri on web where it resolves to the correct origin URL. 
 const redirectTo = Platform.OS === 'web' 
 ? AuthSession.makeRedirectUri({ path: 'auth/callback' }) 
 : 'onspaceapp://auth/callback'; 
 
 const { data, error } = await supabase.auth.signInWithOAuth({ 
 provider: 'google', 
 options: { 
 redirectTo, 
 skipBrowserRedirect: true, 
 // Force Google account picker; otherwise a single signed-in account can skip the UI entirely. 
 queryParams: { prompt: 'select_account', access_type: 'offline' }, 
 }, 
 }); 
 
 if (error || !data?.url) { 
 showAlert(isAr ? 'خطأ' : 'Error', error?.message ?? 'Failed to start Google sign-in'); 
 return; 
 } 
 
 // Open OAuth in system browser 
 const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo); 
 
 if (result.type === 'success' && result.url) { 
 const callbackUrl = result.url; 
 let params: URLSearchParams; 
 try { 
 const parsed = new URL(callbackUrl); 
 // Hash (#access_token=...) or query (?code=...) — merge for lookup 
 const hashParams = parsed.hash?.startsWith('#') 
 ? new URLSearchParams(parsed.hash.slice(1)) 
 : new URLSearchParams(); 
 params = new URLSearchParams(parsed.searchParams); 
 hashParams.forEach((v, k) => params.set(k, v)); 
 } catch { 
 showAlert(isAr ? 'خطأ' : 'Error', isAr ? 'رابط غير صالح' : 'Invalid callback URL'); 
 return; 
 } 
 
 const oauthErr = params.get('error_description') ?? params.get('error'); 
 if (oauthErr) { 
 showAlert(isAr ? 'خطأ' : 'Error', oauthErr); 
 return; 
 } 
 
 const code = params.get('code'); 
 if (code) { 
 const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code); 
 if (exchangeError) { 
 showAlert(isAr ? 'خطأ' : 'Error', exchangeError.message); 
 return; 
 } 
 router.replace('/(tabs)'); 
 return; 
 } 
 
 const accessToken = params.get('access_token'); 
 const refreshToken = params.get('refresh_token'); 
 if (accessToken && refreshToken) { 
 const { error: sessionError } = await supabase.auth.setSession({ 
 access_token: accessToken, 
 refresh_token: refreshToken, 
 }); 
 if (sessionError) { 
 showAlert(isAr ? 'خطأ' : 'Error', sessionError.message); 
 return; 
 } 
 router.replace('/(tabs)'); 
 return; 
 } 
 
 showAlert(isAr ? 'خطأ' : 'Error', isAr ? 'لم يتم استلام بيانات الجلسة' : 'No session data received'); 
 } else if (result.type === 'cancel' || result.type === 'dismiss') { 
 // User cancelled — do nothing 
 } 
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
 if (smsLoading) return; 
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
 await supabase.auth.setSession({ 
 access_token: data.session.access_token, 
 refresh_token: data.session.refresh_token, 
 }); 
 router.replace('/(tabs)'); 
 } 
 } catch (e: any) { 
 showAlert(isAr ? 'خطأ' : 'Error', e.message ?? 'Verification failed'); 
 } finally { 
 setSmsLoading(false); 
 } 
 }; 
 
 const resetSms = () => { setSmsSent(false); setSmsOtp(''); }; 
 
 const isBlocking = verifying || smsLoading; 
 
 return ( 
 <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}> 
 {/* Full-screen loading overlay prevents double-clicks during verification */} 
 <Modal visible={isBlocking} transparent animationType="none" statusBarTranslucent> 
 <View style={styles.loadingOverlay}> 
 <View style={styles.loadingBox}> 
 <ActivityIndicator size="large" color="#0A6E5C" /> 
 <Text style={styles.loadingText}> 
 {isAr ? 'جارٍ التحقق...' : 'Verifying...'} 
 </Text> 
 </View> 
 </View> 
 </Modal> 
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
 <View style={styles.appNameHeroRow}> 
 <Text style={styles.appName}>{isAr ? APP_NAME_AR : APP_NAME}</Text> 
 <View style={styles.heroBetaBadge}> 
 <Text style={styles.heroBetaBadgeText}>BETA</Text> 
 </View> 
 </View> 
 <Text style={styles.tagline}>{t.tagline}</Text> 
 </View> 
 
 {/* Card */} 
 <View style={[styles.card, { backgroundColor: colors.surface, ...Shadow.lg }]}> 
 
 {/* Auth Method Toggle (Email / SMS) */} 
 <View style={[styles.methodToggle, { backgroundColor: colors.background }]}> 
 {(['email', 'sms'] as AuthMethod[]).map(m => { 
 const isActive = authMethod === m; 
 const disabled = m === 'sms' && SMS_COMING_SOON; 
 return ( 
 <Pressable 
 key={m} 
 style={[ 
 styles.methodBtn, 
 isActive && !disabled && [styles.methodBtnActive, { backgroundColor: colors.primary, ...Shadow.colored }], 
 disabled && styles.methodBtnDisabled, 
 ]} 
 onPress={() => { 
 if (disabled) return; 
 setAuthMethod(m); 
 setMode('login'); 
 setSmsSent(false); 
 setSmsOtp(''); 
 setOtp(''); 
 }} 
 disabled={disabled} 
 > 
 <MaterialIcons 
 name={m === 'email' ? 'email' : 'sms'} 
 size={15} 
 color={disabled ? colors.textMuted : isActive ? '#fff' : colors.textMuted} 
 /> 
 <View style={{ alignItems: 'flex-start', gap: 1 }}> 
 <Text style={[styles.methodBtnText, { color: disabled ? colors.textMuted : isActive ? '#fff' : colors.textMuted }, isActive && !disabled && { fontWeight: '700' }]}> 
 {m === 'email' 
 ? (isAr ? 'البريد الإلكتروني' : 'Email') 
 : (isAr ? 'رسالة SMS' : 'SMS')} 
 </Text> 
 {disabled ? ( 
 <Text style={styles.comingSoonText}> 
 {isAr ? 'قريباً' : 'Coming Soon'} 
 </Text> 
 ) : null} 
 </View> 
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
 placeholder="0 0 0 0" 
 value={smsOtp} 
 onChangeText={setSmsOtp} 
 keyboardType="number-pad" 
 maxLength={4} 
 textAlign="center" 
 returnKeyType="done" 
 onSubmitEditing={handleVerifySmsOtp} 
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
 