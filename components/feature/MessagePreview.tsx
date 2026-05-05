import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Conversation } from '@/services/chatService';
import { Radius, FontSize, Spacing, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface MessagePreviewProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: (id: string) => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const AVATAR_COLORS = ['#0A6E5C', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#10B981'];
function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export const MessagePreview = memo(function MessagePreview({
  conversation, currentUserId, onPress,
}: MessagePreviewProps) {
  const { colors } = useTheme();
  const isBuyer = conversation.buyer_id === currentUserId;
  const otherUser = isBuyer ? conversation.seller : conversation.buyer;
  const otherName = otherUser?.username || otherUser?.email?.split('@')[0] || 'User';
  const avatarColor = getAvatarColor(otherName);
  const avatarUrl = (otherUser as any)?.avatar_url;

  const adTitle = (conversation as any).ads?.title ?? 'Listing';
  const adThumb = (conversation as any).ads?.ad_images?.[0]?.url;

  const hasUnread = !!(conversation as any).unread_count && (conversation as any).unread_count > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfaceTint : colors.surface,
          borderLeftWidth: 3,
          borderLeftColor: hasUnread ? colors.primary : 'transparent',
        },
      ]}
      onPress={() => onPress(conversation.id)}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{otherName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {/* Online dot (decorative) */}
        <View style={[styles.onlineDot, { backgroundColor: '#22C55E', borderColor: colors.surface }]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Name + time */}
        <View style={styles.top}>
          <Text style={[styles.name, { color: colors.textPrimary, fontWeight: hasUnread ? '700' : '600' }]} numberOfLines={1}>
            {otherName}
          </Text>
          <Text style={[styles.time, { color: hasUnread ? colors.primary : colors.textMuted, fontWeight: hasUnread ? '700' : '400' }]}>
            {timeAgo(conversation.last_message_at)}
          </Text>
        </View>

        {/* Ad reference pill */}
        <View style={styles.adRef}>
          {adThumb ? (
            <Image source={{ uri: adThumb }} style={styles.adThumb} contentFit="cover" />
          ) : (
            <View style={[styles.adThumbPlaceholder, { backgroundColor: colors.primaryGhost }]}>
              <MaterialIcons name="storefront" size={9} color={colors.primary} />
            </View>
          )}
          <Text style={[styles.adRefText, { color: colors.primary }]} numberOfLines={1}>{adTitle}</Text>
        </View>

        {/* Last message */}
        <Text
          style={[
            styles.lastMessage,
            {
              color: hasUnread ? colors.textPrimary : colors.textSecondary,
              fontWeight: hasUnread ? '600' : '400',
            },
          ]}
          numberOfLines={1}
        >
          {conversation.last_message ?? 'Start a conversation'}
        </Text>
      </View>

      {/* Right: unread badge or chevron */}
      <View style={styles.right}>
        {hasUnread ? (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.unreadText}>
              {(conversation as any).unread_count > 9 ? '9+' : String((conversation as any).unread_count)}
            </Text>
          </View>
        ) : (
          <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7, borderWidth: 2,
  },
  content: { flex: 1, gap: 3 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: FontSize.md, flex: 1, marginRight: 6 },
  time: { fontSize: FontSize.xs },
  adRef: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  adThumb: { width: 18, height: 18, borderRadius: 4 },
  adThumbPlaceholder: { width: 18, height: 18, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  adRefText: { fontSize: FontSize.xs, fontWeight: '600', flex: 1 },
  lastMessage: { fontSize: FontSize.sm, lineHeight: 18 },
  right: { alignItems: 'center', justifyContent: 'center' },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
