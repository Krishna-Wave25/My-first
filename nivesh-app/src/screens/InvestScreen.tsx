import React, { useState } from "react";
import { ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { basicsForAmount } from "../data/learn";
import { colors, inr } from "../theme";
import { Card, H, Disclaimer } from "../components/ui";

const riskColor = { Low: colors.up, Medium: colors.warn, High: colors.down } as const;

export default function InvestScreen() {
  const [text, setText] = useState("5000");
  const amount = Math.max(0, parseInt(text.replace(/[^0-9]/g, "") || "0", 10));
  const { band, buckets } = basicsForAmount(amount);
  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <H>Investing basics</H>
      <Text style={s.muted}>Pick an amount to learn which kinds of options exist at that size and what the trade-offs are. This is general education, not a recommendation for you.</Text>
      <Card style={{ marginTop: 12 }}>
        <Text style={s.muted}>Amount (for learning)</Text>
        <TextInput
          value={text} onChangeText={setText} keyboardType="number-pad"
          style={s.input} placeholder="e.g. 5000" placeholderTextColor={colors.muted}
        />
        <Text style={{ color: colors.accent, fontWeight: "700" }}>{inr(amount)}</Text>
      </Card>
      <H>{band}</H>
      {buckets.map((b) => (
        <Card key={b.name}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={s.title}>{b.name}</Text>
            <Text style={{ color: riskColor[b.risk], fontSize: 12, fontWeight: "700" }}>{b.risk} risk</Text>
          </View>
          <Text style={[s.muted, { marginTop: 4 }]}>{b.why}</Text>
        </Card>
      ))}
      <Disclaimer />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  title: { color: colors.text, fontWeight: "700", flex: 1, marginRight: 8 },
  input: { color: colors.text, fontSize: 24, fontWeight: "700", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6, marginBottom: 6 },
});
