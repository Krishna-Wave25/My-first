import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { colors, radius } from "../theme";
import { DISCLAIMER } from "../data/learn";

export const Card = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <View style={[s.card, style]}>{children}</View>
);
export const H = ({ children }: { children: React.ReactNode }) => <Text style={s.h}>{children}</Text>;
export const Disclaimer = () => <Text style={s.disc}>{DISCLAIMER}</Text>;

export const Spark = ({ data, up }: { data: number[]; up: boolean }) => {
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  return (
    <View style={s.spark}>
      {data.map((v, i) => (
        <View
          key={i}
          style={{
            width: 3, marginRight: 1, borderRadius: 1.5,
            height: 4 + ((v - min) / span) * 28,
            backgroundColor: up ? colors.up : colors.down,
          }}
        />
      ))}
    </View>
  );
};

export const DataBadge = ({ sample }: { sample: boolean }) => (
  <Text style={[s.badge, !sample && { color: colors.muted }]}>
    {sample ? "SAMPLE DATA – live feed unavailable, showing demo numbers" : "Delayed data (about 15 min). For information only."}
  </Text>
);

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  h: { color: colors.text, fontSize: 20, fontWeight: "700", marginVertical: 10 },
  disc: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 8, marginBottom: 24 },
  spark: { flexDirection: "row", alignItems: "flex-end", height: 32 },
  badge: { color: colors.warn, fontSize: 10, letterSpacing: 0.5, marginBottom: 6 },
});
