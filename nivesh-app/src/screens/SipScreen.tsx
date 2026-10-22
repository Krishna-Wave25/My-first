import React, { useState } from "react";
import { ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { sipFutureValue } from "../sip";
import { colors, inr0, radius } from "../theme";
import { Card, Disclaimer, H } from "../components/ui";

const num = (t: string) => parseFloat(t.replace(/[^0-9.]/g, "")) || 0;
export default function SipScreen() {
  const [m, setM] = useState("5000");
  const [r, setR] = useState("12");
  const [y, setY] = useState("10");
  const out = sipFutureValue(num(m), Math.min(num(r), 40), Math.min(num(y), 50));
  const Field = ({ label, v, set, suffix }: { label: string; v: string; set: (t: string) => void; suffix: string }) => (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.muted}>{label}</Text>
      <View style={s.inputRow}><TextInput value={v} onChangeText={set} keyboardType="decimal-pad" style={s.input} /><Text style={s.muted}>{suffix}</Text></View>
    </View>
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <H>SIP calculator</H>
      <Card>
        <Field label="Monthly investment" v={m} set={setM} suffix="₹ / month" />
        <Field label="Assumed yearly return (you choose; not a prediction)" v={r} set={setR} suffix="% / year" />
        <Field label="Time period" v={y} set={setY} suffix="years" />
      </Card>
      <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
        <Text style={s.muted}>Estimated value (illustration)</Text>
        <Text style={s.big}>{inr0(out.value)}</Text>
        <Text style={s.muted}>You invest {inr0(out.invested)} · assumed gain {inr0(out.gain)}</Text>
      </Card>
      <Text style={s.muted}>Real returns vary and can be negative. Past performance does not guarantee future results. This only shows how compounding works at the rate you type in.</Text>
      <Disclaimer />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  muted: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  big: { color: colors.accent, fontSize: 30, fontWeight: "800", marginVertical: 4 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: 10, fontSize: 18, color: colors.text },
});
