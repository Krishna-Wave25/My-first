import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Quote } from "../data/market";
import { colors, inr, pct } from "../theme";

export const StockRow = ({ q, sub }: { q: Quote; sub?: string }) => {
  const nav = useNavigation<any>();
  const up = q.changePct >= 0;
  return (
    <Pressable style={s.row} onPress={() => nav.navigate("Stock", { symbol: q.symbol })} accessibilityRole="button" accessibilityLabel={`${q.name} details`}>
      <View style={s.logo}><Text style={s.logoText}>{q.symbol.slice(0, 2)}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>{q.name}</Text>
        <Text style={s.sub} numberOfLines={1}>{sub ?? q.sector}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={s.price}>{inr(q.price)}</Text>
        <Text style={{ color: up ? colors.up : colors.down, fontSize: 12, fontWeight: "600" }}>{pct(q.changePct)}</Text>
      </View>
    </Pressable>
  );
};
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  logo: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center", marginRight: 12 },
  logoText: { color: colors.accent, fontWeight: "800", fontSize: 12 },
  name: { color: colors.text, fontWeight: "600", fontSize: 14 },
  sub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  price: { color: colors.text, fontWeight: "600", fontSize: 14 },
});
