import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../store/AuthContext";
import { listMessages, sendMessage } from "../../api/chat";
import type { ChatMessage } from "../../api/chat";
import { getSocket } from "../../lib/socket";
import { ErrorState, LoadingState } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { useTranslation } from "react-i18next";

interface Props {
  route: { params: { bookingId: string; otherPartyName: string } };
}

// Worker <-> customer chat (product-flow update §22/§23), shared between
// the customer and worker navigators — same screen, same component,
// registered under each stack (matching how the app already re-registers
// leaf screens like Invoice/Rating across the customer's Home/Bookings/
// Emergency stacks). Real-time via the existing Socket.io connection,
// with an initial REST fetch for history.
const WORKER_QUICK_REPLIES = ["qrOnMyWay", "qrFiveMinutes", "qrAtLocation"];
const CUSTOMER_QUICK_REPLIES = ["qrShareEntrance", "qrAtLocation", "qrThanks"];

/** Same-sender messages within this window render as one visual group. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export default function ChatScreen({ route }: Props) {
  const { t } = useTranslation();
  const { bookingId, otherPartyName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await listMessages(bookingId));
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onMessage(message: ChatMessage) {
      if (message.bookingId === bookingId) {
        setMessages((prev) => [...prev, message]);
      }
    }
    socket.on("chat:message", onMessage);
    return () => {
      socket.off("chat:message", onMessage);
    };
  }, [bookingId]);

  async function sendText(body: string) {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await sendMessage(bookingId, trimmed);
    } catch {
      // Restore the draft so a failed send doesn't silently lose what the
      // user typed.
      setText((current) => current || trimmed);
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    const draft = text;
    setText("");
    await sendText(draft);
  }

  if (loading) return <LoadingState />;
  if (loadFailed) {
    return <ErrorState message={t("common.chatLoadFailed")} onRetry={load} retryLabel={t("common.retry")} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Text style={styles.headerName}>{otherPartyName}</Text>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => {
          const isMine = item.senderId === user?.id;
          const prev = messages[index - 1];
          const grouped =
            !!prev &&
            prev.senderId === item.senderId &&
            new Date(item.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
          return (
            <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine, grouped && styles.bubbleRowGrouped]}>
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.text}</Text>
                <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                  {new Date(item.createdAt).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          );
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRow}
        keyboardShouldPersistTaps="handled"
      >
        {(user?.role === "WORKER" ? WORKER_QUICK_REPLIES : CUSTOMER_QUICK_REPLIES).map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.quickChip}
            onPress={() => sendText(t(`chat.${key}`))}
            disabled={sending}
            accessibilityRole="button"
          >
            <Text style={styles.quickChipText}>{t(`chat.${key}`)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={t("chat.placeholder")}
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={sending}>
          <Text style={styles.sendButtonText}>{t("chat.send")}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerName: { ...type.h3, color: colors.textPrimary },
  list: { padding: spacing.lg },
  quickRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  quickChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  quickChipText: { ...type.small, color: colors.primaryDark },
  bubbleTime: { ...type.caption, color: colors.textMuted, marginTop: 2, alignSelf: "flex-end" },
  bubbleTimeMine: { color: colors.primaryLight },
  bubbleRowGrouped: { marginTop: 2 },
  bubbleRow: { flexDirection: "row", marginBottom: spacing.sm },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "78%", borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleText: { ...type.body, color: colors.textPrimary },
  bubbleTextMine: { color: colors.textInverse },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
    color: colors.textPrimary,
    ...type.body,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  sendButtonText: { ...type.smallMedium, color: colors.textInverse },
});
