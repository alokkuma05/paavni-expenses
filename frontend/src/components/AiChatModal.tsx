import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PaperPlaneRight, Sparkle, X } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";
import { useAiChat, AiChatMessage } from "@/src/api";

const SUGGESTIONS = [
  "Who do I owe the most money?",
  "Which category did I spend most on?",
  "Did any category go over budget?",
  "Summarise my expenses this month",
];

export function AiChatModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const chat = useAiChat();
  const listRef = useRef<FlatList>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    const msg = text.trim();
    if (!msg || chat.isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    chat.mutate(
      { session_id: sessionId, message: msg },
      {
        onSuccess: (res) => {
          setSessionId(res.session_id);
          setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
        },
        onError: () => {
          setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't answer that right now. Please try again." }]);
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingTop: insets.top + 8, paddingBottom: 0 }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Sparkle size={20} color={colors.brandPrimary} weight="fill" />
              <Text style={styles.title}>Ask Paavni AI</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} testID="ai-chat-close">
              <X size={22} color={colors.onSurface} weight="bold" />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={insets.top + 8}
          >
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <Sparkle size={40} color={colors.brandSecondary} weight="fill" />
                <Text style={styles.emptyTitle}>Ask about your money</Text>
                <Text style={styles.emptySub}>Get answers from your expenses, dues and budgets.</Text>
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable key={s} style={styles.chip} onPress={() => send(s)} testID={`ai-suggestion-${s.slice(0, 10)}`}>
                      <Text style={styles.chipText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(_m, i) => String(i)}
                contentContainerStyle={styles.messages}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <View style={[styles.bubbleRow, item.role === "user" ? styles.rowRight : styles.rowLeft]}>
                    <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
                      <Text style={[styles.bubbleText, item.role === "user" && styles.userText]}>{item.content}</Text>
                    </View>
                  </View>
                )}
                ListFooterComponent={
                  chat.isPending ? (
                    <View style={[styles.bubbleRow, styles.rowLeft]}>
                      <View style={[styles.bubble, styles.aiBubble]}>
                        <ActivityIndicator color={colors.brandPrimary} size="small" />
                      </View>
                    </View>
                  ) : null
                }
              />
            )}

            <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask a question…"
                placeholderTextColor={colors.muted}
                onSubmitEditing={() => send(input)}
                returnKeyType="send"
                testID="ai-chat-input"
              />
              <Pressable
                style={[styles.sendBtn, (!input.trim() || chat.isPending) && styles.sendBtnDisabled]}
                onPress={() => send(input)}
                disabled={!input.trim() || chat.isPending}
                testID="ai-chat-send"
              >
                <PaperPlaneRight size={20} color={colors.onBrandPrimary} weight="fill" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { flex: 1, backgroundColor: colors.surface, marginTop: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface, marginTop: 12 },
  emptySub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6 },
  suggestions: { marginTop: 20, gap: 10, width: "100%" },
  chip: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.onSurface },
  messages: { padding: 16, gap: 10 },
  bubbleRow: { flexDirection: "row" },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  bubble: { maxWidth: "85%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: colors.brandPrimary, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: colors.surfaceSecondary, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.onSurface, lineHeight: 21 },
  userText: { color: colors.onBrandPrimary },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surfaceSecondary,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.onSurface,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
}));
