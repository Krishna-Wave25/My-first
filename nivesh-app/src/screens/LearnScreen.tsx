import React, { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { LESSONS } from "../data/learn";
import { askExplainer, explainerConfigured, Turn } from "../api";
import { colors, radius } from "../theme";
import { Card, H, Disclaimer } from "../components/ui";

const SUGGESTIONS = ["What is a SIP?", "What does P/E ratio mean?", "Index fund vs mutual fund?", "What is diversification?"];

export default function LearnScreen() {
  const [open, setOpen] = useState<number | null>(null);
  const [chat, setChat] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setErr(null); setQ(""); setBusy(true);
    const history = chat;
    setChat([...history, { role: "user", content: question }]);
    try {
      const answer = await askExplainer(question, history);
      setChat((c) => [...c, { role: "assistant", content: answer }]);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong. Please try again.");
      setChat(history); setQ(question);
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.onAccent }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <H>Ask the AI explainer</H>
        <Text style={s.muted}>Plain-language answers about investing concepts. It explains; it does not tell you what to buy or predict returns.</Text>

        {!explainerConfigured && (
          <Card style={{ marginTop: 12 }}><Text style={s.muted}>The AI explainer is not connected yet (server address not set). The lessons below still work.</Text></Card>
        )}

        {chat.length === 0 && explainerConfigured && (
          <View style={s.wrap}>
            {SUGGESTIONS.map((x) => (
              <Pressable key={x} style={s.chip} onPress={() => ask(x)}><Text style={s.chipText}>{x}</Text></Pressable>
            ))}
          </View>
        )}

        {chat.map((t, i) => (
          <View key={i} style={[s.bubble, t.role === "user" ? s.user : s.bot]}>
            <Text style={{ color: t.role === "user" ? colors.bg : colors.text, lineHeight: 20 }}>{t.content}</Text>
          </View>
        ))}
        {busy && <ActivityIndicator color={colors.accent} style={{ marginVertical: 10 }} />}
        {err && <Text style={{ color: colors.down, marginVertical: 8 }}>{err}</Text>}

        <View style={s.inputRow}>
          <TextInput
            value={q} onChangeText={setQ} placeholder="Ask about SIP, P/E, risk…" placeholderTextColor={colors.muted}
            style={s.input} maxLength={500} editable={explainerConfigured && !busy}
            onSubmitEditing={() => ask(q)} returnKeyType="send"
          />
          <Pressable style={[s.send, (!q.trim() || busy || !explainerConfigured) && { opacity: 0.4 }]} onPress={() => ask(q)} disabled={!q.trim() || busy || !explainerConfigured} accessibilityLabel="Send question">
            <Text style={{ color: colors.onAccent, fontWeight: "800" }}>Ask</Text>
          </Pressable>
        </View>

        <H>Quick lessons</H>
        {LESSONS.map((l, i) => (
          <Pressable key={l.t} onPress={() => setOpen(open === i ? null : i)}>
            <Card>
              <Text style={s.title}>{l.t}</Text>
              {open === i && <Text style={[s.muted, { marginTop: 6 }]}>{l.b}</Text>}
            </Card>
          </Pressable>
        ))}
        <Disclaimer />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  title: { color: colors.text, fontWeight: "700", fontSize: 15 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipText: { color: colors.text, fontSize: 12 },
  bubble: { padding: 12, borderRadius: radius, marginTop: 10, maxWidth: "92%" },
  user: { alignSelf: "flex-end", backgroundColor: colors.accent },
  bot: { alignSelf: "flex-start", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 14, alignItems: "center" },
  input: { flex: 1, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius, paddingHorizontal: 12, paddingVertical: 10 },
  send: { backgroundColor: colors.accent, borderRadius: radius, paddingHorizontal: 16, paddingVertical: 12 },
});
