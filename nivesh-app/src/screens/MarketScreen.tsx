import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { market, Quote, sectorTrends } from "../data/market";
import { colors } from "../theme";
import { Card, H, Disclaimer, SampleBadge } from "../components/ui";
import { StockRow } from "../components/StockRow";

export default function MarketScreen({ watch, toggle }: { watch: string[]; toggle: (s: string) => void }) {
  const [indices, setIndices] = useState<Quote[]>([]);
  const [stocks, setStocks] = useState<Quote[]>([]);
  useEffect(() => {
    market.getIndices().then(setIndices);
    market.getStocks().then(setStocks);
  }, []);
  const sorted = [...stocks].sort((a, b) => b.changePct - a.changePct);
  const gainers = sorted.slice(0, 3), losers = sorted.slice(-3).reverse();
  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16 }}>
      {market.isSample && <SampleBadge />}
      <H>Market overview</H>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
        {indices.map((i) => (
          <Card key={i.symbol} style={{ flex: 1, marginBottom: 0 }}>
            <Text style={s.small}>{i.name}</Text>
            <Text style={s.big}>{i.price.toLocaleString("en-IN")}</Text>
            <Text style={{ color: i.changePct >= 0 ? colors.up : colors.down, fontSize: 12 }}>
              {i.changePct >= 0 ? "▲" : "▼"} {Math.abs(i.changePct).toFixed(2)}%
            </Text>
          </Card>
        ))}
      </View>
      <H>Top gainers</H>
      <Card>{gainers.map((q) => <StockRow key={q.symbol} q={q} starred={watch.includes(q.symbol)} onToggle={() => toggle(q.symbol)} />)}</Card>
      <H>Top losers</H>
      <Card>{losers.map((q) => <StockRow key={q.symbol} q={q} starred={watch.includes(q.symbol)} onToggle={() => toggle(q.symbol)} />)}</Card>
      <H>Sector trends</H>
      <Card>
        {sectorTrends(stocks).map((t) => (
          <View key={t.sector} style={s.sector}>
            <Text style={s.small}>{t.sector}</Text>
            <View style={s.barWrap}>
              <View style={{ width: `${Math.min(100, Math.abs(t.avg) * 25)}%`, height: 8, borderRadius: 4, backgroundColor: t.avg >= 0 ? colors.up : colors.down }} />
            </View>
            <Text style={{ color: t.avg >= 0 ? colors.up : colors.down, width: 54, textAlign: "right", fontSize: 12 }}>
              {t.avg >= 0 ? "+" : ""}{t.avg.toFixed(2)}%
            </Text>
          </View>
        ))}
      </Card>
      <Disclaimer />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  small: { color: colors.muted, fontSize: 12 },
  big: { color: colors.text, fontSize: 15, fontWeight: "700", marginVertical: 2 },
  sector: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  barWrap: { flex: 1, marginHorizontal: 10, height: 8, backgroundColor: colors.border, borderRadius: 4 },
});
