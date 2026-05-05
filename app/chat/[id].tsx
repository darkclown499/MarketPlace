import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth, useAlert } from '@/template';
import { useMessages } from '@/hooks/useChat';
import { fetchConversationById, sendMessage, markMessagesRead, Conversation } from '@/services/chatService';
import { Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateGroup(dateStr: string, isAr: boolean) {
  const d = new Date(dateStr);
  const today = new Date();
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return isAr ? 'اليوم' : 'Today';
  if (diff === 1) return isAr ? 'أمس' : 'Yesterday';
  return d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const { messages, loading, reload } = useMessages(id);

  useEffect(() => {
    if (id) fetchConversationById(id).then(({ data }) => setConversation(data));
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      // Mark incoming messages as read
      if (user && id) markMessagesRead(id, user.id).catch(() => {});
    }
  }, [messages.length]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !id || sending) return;
    setSending(true);
    setText('');
    const { error } = await sendMessage(id, content);
    if (error) showAlert(isAr ? 'خطأ' : 'Error', error);
    setSending(false);
  };

  const isBuyer = conversation?.buyer_id === user?.id;
  const otherUser = isBuyer ? conversation?.seller : conversation?.buyer;
  const otherName = otherUser?.username || otherUser?.email?.split('@')[0] || 'User';
  const otherInitial = otherName.charAt(0).toUpperCase();

  // Build messages with date group headers
  type MsgItem = typeof messages[0] & { _type?: undefined } | { _type: 'date'; _date: string; id: string };
  const withDates: MsgItem[] = [];
  let lastDate = '';
  for (const msg of messages) {
    const d = new Date(msg.created_at).toDateString();
    if (d !== lastDate) {
      withDates.push({ _type: 'date', _date: msg.created_at, id: `date_${msg.id}` } as any);
      lastDate = d;
    }
    withDates.push(msg as any);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>

        {/* ── HEADER ── */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Pressable
            style={[styles.backBtn, { flexDirection: isAr ? 'row-reverse' : 'row' }]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <MaterialIcons name={isAr ? 'arrow-forward' : 'arrow-back'} size={22} color="#fff" />
          </Pressable>

          <View style={[styles.headerAvatar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={styles.headerAvatarText}>{otherInitial}</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { textAlign: isAr ? 'right' : 'left' }]} numberOfLines={1}>{otherName}</Text>
            <View style={[styles.onlineRow, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{isAr ? 'نشط' : 'Active'}</Text>
              {conversation?.ads?.title ? (
                <Text style={styles.headerAd} numberOfLines={1}>
                  {' · '}{conversation.ads.title}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── MESSAGES ── */}
        {loading && messages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={withDates}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={reload}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              // Date separator
              if ((item as any)._type === 'date') {
                return (
                  <View style={styles.dateSep}>
                    <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                    <View style={[styles.datePill, { backgroundColor: colors.surfaceTint }]}>
                      <Text style={[styles.datePillText, { color: colors.textMuted }]}>
                        {formatDateGroup((item as any)._date, isAr)}
                      </Text>
                    </View>
                    <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                  </View>
                );
              }

              const msg = item as typeof messages[0];
              const isMine = msg.sender_id === user?.id;
              const isRead = !!msg.read_at;

              return (
                <View style={[
                  styles.msgRow,
                  isMine
                    ? isAr ? styles.msgRowOther : styles.msgRowMine
                    : isAr ? styles.msgRowMine : styles.msgRowOther,
                ]}>
                  {!isMine ? (
                    <View style={[styles.bubbleAvatar, { backgroundColor: colors.primaryGhost }]}>
                      <Text style={[styles.bubbleAvatarText, { color: colors.primary }]}>{otherInitial}</Text>
                    </View>
                  ) : null}
                  <View style={styles.bubbleWrap}>
                    <View style={[
                      styles.bubble,
                      isMine
                        ? { backgroundColor: colors.primary, borderBottomRightRadius: isAr ? Radius.lg : 4, borderBottomLeftRadius: isAr ? 4 : Radius.lg }
                        : { backgroundColor: colors.surface, borderBottomLeftRadius: isAr ? Radius.lg : 4, borderBottomRightRadius: isAr ? 4 : Radius.lg, ...Shadow.sm },
                    ]}>
                      <Text style={[styles.msgText, { color: isMine ? '#fff' : colors.textPrimary, textAlign: isAr ? 'right' : 'left' }]}>
                        {msg.content}
                      </Text>
                    </View>
                    <View style={[styles.msgMeta, { flexDirection: isMine ? (isAr ? 'row' : 'row-reverse') : (isAr ? 'row-reverse' : 'row'), gap: 4 }]}>
                      <Text style={[styles.msgTime, { color: colors.textMuted }]}>
                        {formatTime(msg.created_at)}
                      </Text>
                      {isMine ? (
                        <MaterialIcons
                          name={isRead ? 'done-all' : 'done'}
                          size={14}
                          color={isRead ? colors.primary : colors.textMuted}
                        />
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.center}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceTint }]}>
                  <MaterialIcons name="chat-bubble-outline" size={36} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t.sayHello}</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {isAr ? 'ابدأ المحادثة مع البائع' : 'Start the conversation with the seller'}
                </Text>
              </View>
            }
          />
        )}

        {/* ── INPUT BAR ── */}
        <View style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + Spacing.sm,
            flexDirection: isAr ? 'row-reverse' : 'row',
          },
        ]}>
          <TextInput
            style={[styles.textInput, {
              borderColor: colors.border,
              backgroundColor: colors.background,
              color: colors.textPrimary,
              textAlign: isAr ? 'right' : 'left',
            }]}
            placeholder={t.typeMessage}
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: text.trim() && !sending ? colors.primary : colors.border },
            ]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <MaterialIcons
                  name={isAr ? 'send' : 'send'}
                  size={20}
                  color={text.trim() ? '#fff' : colors.textMuted}
                  style={isAr ? { transform: [{ scaleX: -1 }] } : undefined}
                />
            }
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
    paddingBottom: Spacing.md, gap: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  headerAvatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  headerInfo: { flex: 1, gap: 2 },
  headerName: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  onlineText: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)' },
  headerAd: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center' },
  msgList: { padding: Spacing.md, gap: Spacing.sm, flexGrow: 1, paddingBottom: Spacing.md },
  dateSep: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.md },
  dateLine: { flex: 1, height: 1 },
  datePill: { borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  datePillText: { fontSize: FontSize.xs, fontWeight: '600' },
  msgRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubbleAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  bubbleAvatarText: { fontSize: FontSize.xs, fontWeight: '700' },
  bubbleWrap: { maxWidth: '72%', gap: 3 },
  bubble: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  msgText: { fontSize: FontSize.md, lineHeight: 22 },
  msgMeta: { alignItems: 'center' },
  msgTime: { fontSize: 10, fontWeight: '500' },
  inputBar: {
    alignItems: 'flex-end',
    gap: Spacing.sm, padding: Spacing.sm, paddingHorizontal: Spacing.md, borderTopWidth: 1,
  },
  textInput: {
    flex: 1, minHeight: 46, maxHeight: 110,
    borderWidth: 1.5, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: 11,
    fontSize: FontSize.md, lineHeight: 20,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
});
