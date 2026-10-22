import React from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
import { colors, radius } from "../theme";
import { DISCLAIMER } from "../data/learn";

export const Card = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <View style={[s.card, style]}>{children}</View>
);
export const H = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <View style={s.hrow}><Text style={s.h}>{children}</Text>{right}</View>
);
export const Disclaimer = () => <Text style={s.disc}>{DISCLAIMER}</Text>;

export const DataBadge = ({ sample }: { sample: boolean }) => (
  <Text style={[s.badge, !sample && { color: colors.muted }]}>
    {sample ? "SAMPLE DATA – live feed unavailable, showing demo numbers" : "Delayed data (about 15 min). For information only."}
  </Text>
);

export const Button = ({ label, onPress, kind = "primary", disabled, style }: { label: string; onPress: () => void; kind?: "primary" | "danger" | "ghost"; disabled?: boolean; style?: object }) => (
  <Pressable
    onPress={onPress} disabled={disabled} accessibilityRole="button"
    style={[s.btn, kind === "danger" && { backgroundColor: colors.down }, kind === "ghost" && { backgroundColor: colors.accentSoft }, disabled && { opacity: 0.45 }, style]}
  >
    <Text style={[s.btnText, kind === "ghost" && { color: colors.accent }]}>{label}</Text>
  </Pressable>
);

export const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
    <Text style={{ color: on ? colors.onAccent : colors.text, fontSize: 12, fontWeight: "600" }}>{label}</Text>
  </Pressable>
);

export const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={{ width: "50%", paddingVertical: 8, paddingRight: 8 }}>
    <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
    <Text style={{ color: colors.text, fontWeight: "600", marginTop: 2 }}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  hrow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 8 },
  h: { color: colors.text, fontSize: 18, fontWeight: "700" },
  disc: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 8, marginBottom: 24 },
  badge: { color: colors.warn, fontSize: 10, letterSpacing: 0.3, marginBottom: 4 },
  btn: { backgroundColor: colors.accent, borderRadius: radius, paddingVertical: 14, alignItems: "center", justifyContent: "center", flex: 1 },
  btnText: { color: colors.onAccent, fontWeight: "800", fontSize: 15 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
