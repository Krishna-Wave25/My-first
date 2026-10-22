import React, { useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { UNIVERSE, INDEX_DEFS } from "../data/stocks";
import { market, Detail, Range, RANGES } from "../data/market";
import { useApp } from "../state";
import { colors, inr, inr0, pct, radius } from "../theme";
import { Button, Card, Chip, DataBadge, Disclaimer, Stat } from "../components/ui";
import { Chart } from "../components/Chart";

export default function StockScreen() {
  const nav = useNavigation<any>();
  const { params } = useRoute<any>();
  const def = [...UNIVERSE, ...INDEX_DEFS].find((d) => d.symbol === params.symbol)!;
  const { watch, toggleWatch, portfolio, trade, prices } = useApp();
  const [range, setRange] = useState<Range>("1M");
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState(false);
  const [order, setOrder] = useState<null | "BUY" | "SELL">(null);
  const [qty, setQty] = useState("1");
  const isIndex = def.sector === "Index";
  const starred = watch.includes(def.symbol);

  useLayoutEffect(() => {
    nav.setOptions({
      title: def.symbol,
      headerRight: () => (
        <Pressable onPress={() => toggleWatch(def.symbol)} hitSlop={10} accessibilityLabel={starred ? "Remove from watchlist" : "Add to watchlist"}>
          <Text style={{ fontSize: 24, color: starred ? colors.warn : colors.muted }}>{starred ? "★" : "☆"}</Text>
        </Pressable>
      ),
    });
  }, [nav, starred, def.symbol, toggleWatch]);

  useEffect(() => {
    let live = true;
    setErr(false);
    market.getDetail(def, range).then((r) => live && setD(r)).catch(() => live && setErr(true));
    return () => { live = false; };
  }, [def, range]);

  if (!d) return <View style={s.center}>{err ? <Text style={{ color: colors.muted }}>Could not load data.</Text> : <ActivityIndicator color={colors.accent} />}</View>;
  const q = d.quote, up = q.changePct >= 0, rUp = d.rangeChangePct >= 0;
  const held = portfolio.holdings[def.symbol];
  const price = prices[def.symbol] ?? q.price;
  const n = parseInt(qty || "0", 10) || 0;

  const place = () => {
    const err2 = trade(order!, def.symbol, n, q.price);
    if (err2) return Alert.alert("Order not placed", err2);
    setOrder(null); setQty("1");
    Alert.alert("Practice order done", `${order === "BUY" ? "Bought" : "Sold"} ${n} × ${def.symbol} at ${inr(q.price)} (virtual money).`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={s.name}>{def.name}</Text>
        <Text style={s.price}>{inr(q.price)}</Text>
        <Text style={{ color: up ? colors.up : colors.down, fontWeight: "600" }}>
          {q.prevClose ? `${up ? "+" : ""}${(q.price - q.prevClose).toFixed(2)}  ` : ""}({pct(q.changePct)}) today
        </Text>
        <DataBadge sample={market.isSample} />

        <View style={{ marginTop: 10 }}><Chart data={d.series} up={rUp} /></View>
        <Text style={{ color: rUp ? colors.up : colors.down, textAlign: "center", marginTop: 6, fontWeight: "600" }}>{pct(d.rangeChangePct)} over {range}</Text>
        <View style={s.ranges}>{RANGES.map((r) => <Chip key={r} label={r} on={r === range} onPress={() => setRange(r)} />)}</View>

        <Text style={s.section}>Stats</Text>
        <Card style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Stat label="Previous close" value={q.prevClose ? inr(q.prevClose) : "–"} />
          <Stat label="Sector" value={def.sector} />
          <Stat label="Day high" value={q.dayHigh ? inr(q.dayHigh) : "–"} />
          <Stat label="Day low" value={q.dayLow ? inr(q.dayLow) : "–"} />
          <Stat label="52-week high" value={q.high52 ? inr(q.high52) : "–"} />
          <Stat label="52-week low" value={q.low52 ? inr(q.low52) : "–"} />
        </Card>

        {held && !isIndex && (
          <>
            <Text style={s.section}>Your practice holding</Text>
            <Card>
              <Text style={{ color: colors.text }}>{held.qty} shares · avg {inr(held.avg)}</Text>
              <Text style={{ color: price >= held.avg ? colors.up : colors.down, marginTop: 4, fontWeight: "600" }}>
                P&L {inr((price - held.avg) * held.qty)} ({pct(((price - held.avg) / held.avg) * 100)})
              </Text>
            </Card>
          </>
        )}
        <Disclaimer />
      </ScrollView>

      {!isIndex && (
        <View style={s.bar}>
          <Button label="BUY (practice)" onPress={() => setOrder("BUY")} />
          <View style={{ width: 10 }} />
          <Button label="SELL" kind="danger" disabled={!held} onPress={() => setOrder("SELL")} />
        </View>
      )}

      <Modal visible={order !== null} transparent animationType="slide" onRequestClose={() => setOrder(null)}>
        <KeyboardAvoidingView style={s.modalWrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{order} {def.symbol} · practice</Text>
            <Text style={s.muted}>Virtual money only. No real trade is placed. Price {inr(q.price)} · Cash {inr0(portfolio.cash)}{held ? ` · You own ${held.qty}` : ""}</Text>
            <Text style={[s.muted, { marginTop: 12 }]}>Quantity</Text>
            <TextInput value={qty} onChangeText={(t) => setQty(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={s.input} />
            <Text style={{ color: colors.text, fontWeight: "700", marginVertical: 8 }}>Total {inr(n * q.price)}</Text>
            <View style={{ flexDirection: "row" }}>
              <Button label="Cancel" kind="ghost" onPress={() => setOrder(null)} />
              <View style={{ width: 10 }} />
              <Button label={`Confirm ${order}`} kind={order === "SELL" ? "danger" : "primary"} disabled={n <= 0} onPress={place} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  name: { color: colors.muted, fontSize: 14 },
  price: { color: colors.text, fontSize: 32, fontWeight: "800", marginVertical: 2 },
  ranges: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  section: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 18, marginBottom: 8 },
  bar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", padding: 12, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  modalWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: colors.bg, padding: 18, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 4 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: 12, fontSize: 20, color: colors.text, marginTop: 4 },
});
