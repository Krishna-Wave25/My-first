import React from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, StyleSheet } from "react-native";
import { colors } from "../theme";
import { Button, Card, Disclaimer, H } from "../components/ui";
import { TRIAL_DAYS } from "../store";
import { ALLOW_TEST_UNLOCK, Plan } from "../billing";

type Props = {
  plans: Plan[]; connected: boolean; busy: boolean; message: string | null;
  onBuy: (offerToken: string) => void; onRestore: () => void; onTestUnlock: () => void;
};

export default function PaywallScreen({ plans, connected, busy, message, onBuy, onRestore, onTestUnlock }: Props) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <H>Your {TRIAL_DAYS}-day free trial has ended</H>
      <Text style={s.p}>Subscribe to keep using delayed market data, the screener, practice trading, the AI explainer and investing lessons.</Text>

      {!connected && <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />}
      {connected && plans.length === 0 && (
        <Card style={{ marginTop: 16 }}><Text style={s.p}>Subscription plans are not available right now. Check your internet, that Google Play is up to date, and that this app was installed from Google Play.</Text></Card>
      )}
      {plans.map((p) => (
        <Card key={p.basePlanId} style={{ marginTop: 14 }}>
          <Text style={s.label}>{p.label}</Text>
          <Text style={s.price}>{p.price}</Text>
          {p.hasTrial && <Text style={s.p}>Includes a free trial for new subscribers.</Text>}
          <Button label={busy ? "Please wait…" : `Subscribe ${p.label.toLowerCase()}`} disabled={busy} onPress={() => onBuy(p.offerToken)} style={{ marginTop: 10, flex: 0 }} />
        </Card>
      ))}
      {message && <Text style={[s.p, { marginTop: 12, color: colors.text }]}>{message}</Text>}

      <Pressable onPress={onRestore} style={{ marginTop: 16 }} accessibilityRole="button"><Text style={s.link}>Restore purchases</Text></Pressable>
      <Pressable onPress={() => Linking.openURL("https://play.google.com/store/account/subscriptions")} style={{ marginTop: 10 }} accessibilityRole="link">
        <Text style={s.link}>Manage or cancel in Google Play</Text>
      </Pressable>
      <Text style={[s.p, { marginTop: 12 }]}>Subscriptions renew automatically until cancelled. Payment is charged to your Google Play account. Cancel anytime in Google Play.</Text>

      {ALLOW_TEST_UNLOCK && (
        <Button kind="ghost" label="Test build: unlock without paying" onPress={onTestUnlock} style={{ marginTop: 20, flex: 0 }} />
      )}
      <Disclaimer />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  p: { color: colors.muted, lineHeight: 20, fontSize: 13 },
  label: { color: colors.text, fontWeight: "700", fontSize: 15 },
  price: { color: colors.accent, fontSize: 26, fontWeight: "800", marginVertical: 4 },
  link: { color: colors.accent, fontWeight: "700", textAlign: "center" },
});
