import React, { useEffect, useState } from "react";
import { ScrollView, Text, StyleSheet } from "react-native";
import { market, Quote } from "../data/market";
import { colors } from "../theme";
import { Card, H, Disclaimer, DataBadge } from "../components/ui";
import { StockRow } from "../components/StockRow";

export default function WatchlistScreen({ watch, toggle }: { watch: string[]; toggle: (s: string) => void }) {
  const [stocks, setStocks] = useState<Quote[]>([]);
  useEffect(() => { market.getStocks().then(setStocks); }, []);
  const mine = stocks.filter((s) => watch.includes(s.symbol));
  const rest = stocks.filter((s) => !watch.includes(s.symbol));
  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16 }}>
      <DataBadge sample={market.isSample} />
      <H>My watchlist</H>
      <Card>
        {mine.length === 0 && <Text style={{ color: colors.muted }}>Tap ☆ on any stock below to add it here.</Text>}
        {mine.map((q) => <StockRow key={q.symbol} q={q} starred onToggle={() => toggle(q.symbol)} />)}
      </Card>
      <H>All stocks</H>
      <Card>{rest.map((q) => <StockRow key={q.symbol} q={q} starred={false} onToggle={() => toggle(q.symbol)} />)}</Card>
      <Disclaimer />
    </ScrollView>
  );
}
const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.bg } });
