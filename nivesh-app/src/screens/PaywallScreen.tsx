import React from "react";
import { Pressable, ScrollView, Text, StyleSheet } from "react-native";
import { colors, radius } from "../theme";
import { Card, H, Disclaimer } from "../components/ui";
import { TRIAL_DAYS } from "../store";

export default function PaywallScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <H>Your {TRIAL_DAYS}-day free trial has ended</H>
      <Text style={s.p}>Subscribe to keep using live market views, the screener, the watchlist and investing lessons.</Text>
      <Card style={{ marginTop: 16 }}>
        <Text style={s.price}>₹149 / month</Text>
        <Text style={s.p}>Placeholder price. Final price is your decision. Cancel anytime in Google Play.</Text>
      </Card>
      <Pressable style={s.btn} onPress={onUnlock} accessibilityRole="button">
        <Text style={s.btnText}>Subscribe (test mode – unlocks without payment)</Text>
      </Pressable>
      <Text style={s.p}>Real payments use Google Play Billing and are added before launch.</Text>
      <Disclaimer />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  p: { color: colors.muted, lineHeight: 20, fontSize: 13 },
  price: { color: colors.accent, fontSize: 28, fontWeight: "800", marginBottom: 6 },
  btn: { backgroundColor: colors.accent, borderRadius: radius, padding: 16, marginVertical: 16 },
  btnText: { color: colors.bg, fontWeight: "800", textAlign: "center" },
});
