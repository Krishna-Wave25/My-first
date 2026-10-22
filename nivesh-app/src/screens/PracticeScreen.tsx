import React from "react";
import { Alert, ScrollView, Text, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useApp } from "../state";
import { valueOf, START_CASH } from "../portfolio";
import { UNIVERSE } from "../data/stocks";
import { colors, inr, inr0, pct } from "../theme";
import { Button, Card, DataBadge, Disclaimer, H } from "../components/ui";

export default function PracticeScreen() {
  const nav = useNavigation<any>();
  const { portfolio, prices, resetPortfolio, sample } = useApp();
  const v = valueOf(portfolio, prices);
  const rows = Object.entries(portfolio.holdings);
  const up = v.pnl >= 0;
  const nameOf = (sym: string) => UNIVERSE.find((u) => u.symbol === sym)?.name ?? sym;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.banner}>PRACTICE MODE · virtual {inr0(START_CASH)} · no real money, no real trades</Text>
      <DataBadge sample={sample} />
      <Card style={{ marginTop: 6 }}>
        <Text style={s.muted}>Total value</Text>
        <Text style={s.big}>{inr(v.total)}</Text>
        <View style={s.row}>
          <View><Text style={s.muted}>Cash</Text><Text style={s.val}>{inr(portfolio.cash)}</Text></View>
          <View><Text style={s.muted}>Invested</Text><Text style={s.val}>{inr(v.invested)}</Text></View>
          <View><Text style={s.muted}>P&L</Text><Text style={[s.val, { color: up ? colors.up : colors.down }]}>{inr(v.pnl)} ({pct(v.pnlPct)})</Text></View>
        </View>
      </Card>

      <H>Holdings</H>
      <Card>
        {rows.length === 0 && <Text style={s.muted}>No holdings yet. Open a stock and tap BUY (practice).</Text>}
        {rows.map(([sym, h]) => {
          const p = prices[sym] ?? h.avg, pnl = (p - h.avg) * h.qty;
          return (
            <View key={sym} style={s.hold}>
              <View style={{ flex: 1 }}>
                <Text style={s.val} onPress={() => nav.navigate("Stock", { symbol: sym })}>{nameOf(sym)}</Text>
                <Text style={s.muted}>{h.qty} shares · avg {inr(h.avg)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.val}>{inr(p * h.qty)}</Text>
                <Text style={{ color: pnl >= 0 ? colors.up : colors.down, fontSize: 12, fontWeight: "600" }}>{inr(pnl)}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      <H>Recent orders</H>
      <Card>
        {portfolio.orders.length === 0 && <Text style={s.muted}>No orders yet.</Text>}
        {portfolio.orders.slice(0, 10).map((o, i) => (
          <Text key={i} style={[s.muted, { paddingVertical: 4 }]}>
            {new Date(o.at).toLocaleDateString("en-IN")}  {o.side} {o.qty} × {o.symbol} @ {inr(o.price)}
          </Text>
        ))}
      </Card>
      <Button kind="ghost" label="Reset practice account" onPress={() => Alert.alert("Reset?", `Cash goes back to ${inr0(START_CASH)} and holdings are cleared.`, [{ text: "Cancel" }, { text: "Reset", style: "destructive", onPress: resetPortfolio }])} />
      <Disclaimer />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  banner: { color: colors.accent, backgroundColor: colors.accentSoft, padding: 10, borderRadius: 10, fontSize: 12, fontWeight: "700", marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 12 },
  big: { color: colors.text, fontSize: 28, fontWeight: "800", marginVertical: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  val: { color: colors.text, fontWeight: "600", fontSize: 14 },
  hold: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
});
