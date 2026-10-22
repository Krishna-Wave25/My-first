import React, { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useApp } from "../state";
import { sectorTrends } from "../data/market";
import { colors, inr, pct, radius } from "../theme";
import { Card, Chip, DataBadge, Disclaimer, H } from "../components/ui";
import { StockRow } from "../components/StockRow";

const TOOLS = [
  { t: "Screener", i: "🔎", go: "Screener" },
  { t: "SIP calculator", i: "🧮", go: "Sip" },
  { t: "Practice trading", i: "🎯", go: "Practice" },
  { t: "Where to invest", i: "₹", go: "Invest" },
  { t: "Learn / AI", i: "📘", go: "Learn" },
];

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { stocks, indices, loading, sample, refresh } = useApp();
  const [tab, setTab] = useState<"Gainers" | "Losers">("Gainers");
  const sorted = [...stocks].sort((a, b) => b.changePct - a.changePct);
  const movers = tab === "Gainers" ? sorted.slice(0, 5) : sorted.slice(-5).reverse();
  const sectors = sectorTrends(stocks);

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />}>
      <Pressable style={s.search} onPress={() => nav.navigate("Search")} accessibilityRole="search">
        <Text style={{ color: colors.muted }}>🔍  Search stocks, e.g. Reliance, TCS</Text>
      </Pressable>
      <DataBadge sample={sample} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
        {indices.map((i) => (
          <Pressable key={i.symbol} style={s.idx} onPress={() => nav.navigate("Stock", { symbol: i.symbol })}>
            <Text style={s.small}>{i.name}</Text>
            <Text style={s.idxPrice}>{i.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</Text>
            <Text style={{ color: i.changePct >= 0 ? colors.up : colors.down, fontSize: 12, fontWeight: "600" }}>{pct(i.changePct)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <H>Products & tools</H>
      <View style={s.tools}>
        {TOOLS.map((x) => (
          <Pressable key={x.t} style={s.tool} onPress={() => nav.navigate(x.go)}>
            <Text style={{ fontSize: 22 }}>{x.i}</Text>
            <Text style={s.toolText}>{x.t}</Text>
          </Pressable>
        ))}
      </View>

      <H>Top movers today</H>
      <View style={s.chips}>
        <Chip label="Gainers" on={tab === "Gainers"} onPress={() => setTab("Gainers")} />
        <Chip label="Losers" on={tab === "Losers"} onPress={() => setTab("Losers")} />
      </View>
      <Card>{movers.map((q) => <StockRow key={q.symbol} q={q} />)}</Card>

      <H>Sector trends</H>
      <Card>
        {sectors.map((t) => (
          <View key={t.sector} style={s.sector}>
            <Text style={[s.small, { width: 80 }]}>{t.sector}</Text>
            <View style={s.barWrap}>
              <View style={{ width: `${Math.min(100, Math.abs(t.avg) * 25)}%`, height: 8, borderRadius: 4, backgroundColor: t.avg >= 0 ? colors.up : colors.down }} />
            </View>
            <Text style={{ color: t.avg >= 0 ? colors.up : colors.down, width: 58, textAlign: "right", fontSize: 12 }}>{pct(t.avg)}</Text>
          </View>
        ))}
      </Card>

      <H>All stocks</H>
      <Card>{stocks.map((q) => <StockRow key={q.symbol} q={q} sub={`${q.sector} · ${inr(q.price)}`} />)}</Card>
      <Disclaimer />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  search: { backgroundColor: colors.surface, borderRadius: radius, padding: 14, marginBottom: 8 },
  small: { color: colors.muted, fontSize: 12 },
  idx: { backgroundColor: colors.surface, borderRadius: radius, padding: 12, marginRight: 10, minWidth: 130 },
  idxPrice: { color: colors.text, fontSize: 16, fontWeight: "700", marginVertical: 2 },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tool: { width: "30%", flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius, padding: 12, alignItems: "center" },
  toolText: { color: colors.text, fontSize: 12, fontWeight: "600", marginTop: 6, textAlign: "center" },
  chips: { flexDirection: "row", gap: 8, marginBottom: 10 },
  sector: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  barWrap: { flex: 1, marginHorizontal: 8, height: 8, backgroundColor: colors.border, borderRadius: 4 },
});
