import React, { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { UNIVERSE } from "../data/stocks";
import { colors, radius } from "../theme";

export default function SearchScreen() {
  const nav = useNavigation<any>();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? UNIVERSE.filter((d) => d.name.toLowerCase().includes(t) || d.symbol.toLowerCase().includes(t) || d.sector.toLowerCase().includes(t)) : UNIVERSE;
  }, [q]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Search by name, symbol or sector" placeholderTextColor={colors.muted} style={s.input} />
      <FlatList
        data={list} keyExtractor={(d) => d.symbol} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={{ color: colors.muted, marginTop: 20 }}>No match. Only large NSE companies are listed for now.</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.row} onPress={() => nav.replace("Stock", { symbol: item.symbol })}>
            <Text style={{ color: colors.text, fontWeight: "600" }}>{item.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{item.symbol} · {item.sector}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
const s = StyleSheet.create({
  input: { backgroundColor: colors.surface, borderRadius: radius, padding: 14, color: colors.text, marginBottom: 8 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
});
