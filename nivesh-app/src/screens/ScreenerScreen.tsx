import React, { useMemo, useState } from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useApp } from "../state";
import { colors } from "../theme";
import { Card, Chip, DataBadge, Disclaimer, H } from "../components/ui";
import { StockRow } from "../components/StockRow";

export default function ScreenerScreen() {
  const { stocks, sample } = useApp();
  const [sector, setSector] = useState<string>("All");
  const [dir, setDir] = useState<"any" | "up" | "down">("any");
  const sectors = useMemo(() => ["All", ...new Set(stocks.map((s) => s.sector))], [stocks]);
  const out = stocks.filter(
    (s) => (sector === "All" || s.sector === sector) &&
      (dir === "any" || (dir === "up" ? s.changePct >= 0 : s.changePct < 0)),
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <DataBadge sample={sample} />
      <H>Filter</H>
      <View style={s.wrap}>{sectors.map((x) => <Chip key={x} label={x} on={sector === x} onPress={() => setSector(x)} />)}</View>
      <View style={s.wrap}>
        <Chip label="Any move" on={dir === "any"} onPress={() => setDir("any")} />
        <Chip label="Rising today" on={dir === "up"} onPress={() => setDir("up")} />
        <Chip label="Falling today" on={dir === "down"} onPress={() => setDir("down")} />
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
const s = StyleSheet.create({ wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 } });
