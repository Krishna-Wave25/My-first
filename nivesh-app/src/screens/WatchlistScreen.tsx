import React from "react";
import { ScrollView, Text } from "react-native";
import { useApp } from "../state";
import { colors } from "../theme";
import { Card, DataBadge, Disclaimer, H } from "../components/ui";
import { StockRow } from "../components/StockRow";

export default function WatchlistScreen() {
  const { stocks, watch, sample } = useApp();
  const mine = stocks.filter((s) => watch.includes(s.symbol));
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <DataBadge sample={sample} />
      <H>My watchlist</H>
      <Card>
        {mine.length === 0 && <Text style={{ color: colors.muted }}>Nothing here yet. Open any stock and tap ☆ to add it.</Text>}
        {mine.map((q) => <StockRow key={q.symbol} q={q} />)}
      </Card>
      <Disclaimer />
    </ScrollView>
  );
}
