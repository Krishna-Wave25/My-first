import React, { useState } from "react";
import { Pressable, ScrollView, Text, StyleSheet } from "react-native";
import { LESSONS } from "../data/learn";
import { colors } from "../theme";
import { Card, H, Disclaimer } from "../components/ui";

export default function LearnScreen() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16 }}>
      <H>Learn investing</H>
      {LESSONS.map((l, i) => (
        <Pressable key={l.t} onPress={() => setOpen(open === i ? null : i)}>
          <Card>
            <Text style={s.title}>{l.t}</Text>
            {open === i && <Text style={s.body}>{l.b}</Text>}
          </Card>
        </Pressable>
      ))}
      <Card>
        <Text style={s.title}>AI explainer (coming next)</Text>
        <Text style={s.body}>Ask "what is P/E?" and get a plain-language answer. It will run on a server so the API key stays secret, and it will explain concepts, not tell you what to buy.</Text>
      </Card>
      <Disclaimer />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontWeight: "700", fontSize: 15 },
  body: { color: colors.muted, marginTop: 6, lineHeight: 20, fontSize: 13 },
});
