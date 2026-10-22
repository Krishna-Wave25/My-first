import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Quote } from "../data/market";
import { colors, inr } from "../theme";
import { Spark } from "./ui";

export const StockRow = ({ q, starred, onToggle }: { q: Quote; starred?: boolean; onToggle?: () => void }) => {
  const up = q.changePct >= 0;
  return (
    <View style={s.row}>
      {onToggle && (
        <Pressable onPress={onToggle} hitSlop={10} accessibilityLabel={starred ? "Remove from watchlist" : "Add to watchlist"}>
          <Text style={[s.star, starred && { color: colors.warn }]}>{starred ? "★" : "☆"}</Text>
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.sym}>{q.symbol}</Text>
        <Text style={s.name} numberOfLines={1}>{q.name} · {q.sector}</Text>
      </View>
      <Spark data={q.history.slice(-14)} up={up} />
      <View style={{ alignItems: "flex-end", marginLeft: 12, minWidth: 80 }}>
        <Text style={s.price}>{inr(q.price)}</Text>
        <Text style={{ color: up ? colors.up : colors.down, fontSize: 12, fontWeight: "600" }}>
          {up ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}%
        </Text>
      </View>
    </View>
  );
};
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  star: { color: colors.muted, fontSize: 20, marginRight: 10 },
  sym: { color: colors.text, fontWeight: "700", fontSize: 14 },
  name: { color: colors.muted, fontSize: 11, marginTop: 2 },
  price: { color: colors.text, fontWeight: "600", fontSize: 14 },
});
