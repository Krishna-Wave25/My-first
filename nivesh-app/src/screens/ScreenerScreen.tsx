import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { market, Quote } from "../data/market";
import { colors } from "../theme";
import { Card, H, Disclaimer, DataBadge } from "../components/ui";
import { StockRow } from "../components/StockRow";

export default function ScreenerScreen() {
  const [stocks, setStocks] = useState<Quote[]>([]);
  const [sector, setSector] = useState<string>("All");
  const [dir, setDir] = useState<"any" | "up" | "down">("any");
  useEffect(() => { market.getStocks().then(setStocks); }, []);
  const sectors = useMemo(() => ["All", ...new Set(stocks.map((s) => s.sector))], [stocks]);
  const out = stocks.filter(
    (s) => (sector === "All" || s.sector === sector) &&
      (dir === "any" || (dir === "up" ? s.changePct >= 0 : s.changePct < 0)),
  );
  const Chip = ({ label, on, press }: { label: string; on: boolean; press: () => void }) => (
    <Pressable onPress={press} style={[s.chip, on && s.chipOn]}>
      <Text style={{ color: on ? colors.bg : colors.text, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16 }}>
      <DataBadge sample={market.isSample} />
      <H>Stock screener</H>
      <View style={s.wrap}>{sectors.map((x) => <Chip key={x} label={x} on={sector === x} press={() => setSector(x)} />)}</View>
      <View style={s.wrap}>
        <Chip label="Any move" on={dir === "any"} press={() => setDir("any")} />
        <Chip label="Rising today" on={dir === "up"} press={() => setDir("up")} />
        <Chip label="Falling today" on={dir === "down"} press={() => setDir("down")} />
      </View>
      <Card>
        {out.length === 0 && <Text style={{ color: colors.muted }}>No stocks match these filters.</Text>}
        {out.map((q) => <StockRow key={q.symbol} q={q} />)}
      </Card>
      <Text style={{ color: colors.muted, fontSize: 12 }}>More filters (P/E, market cap, growth) arrive once a fundamentals data source is connected.</Text>
      <Disclaimer />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
