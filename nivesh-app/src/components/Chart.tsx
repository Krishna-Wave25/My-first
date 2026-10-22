import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { colors } from "../theme";

// Dependency-free area chart made of thin bars (no native SVG module needed).
export function Chart({ data, up, height = 170 }: { data: number[]; up: boolean; height?: number }) {
  const [w, setW] = useState(0);
  const bars = useMemo(() => {
    if (!data.length || !w) return [] as number[];
    const n = Math.max(20, Math.min(data.length, Math.floor(w / 3)));
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(data[Math.round((i * (data.length - 1)) / (n - 1 || 1))]);
    return out;
  }, [data, w]);
  const min = Math.min(...bars), max = Math.max(...bars), span = max - min || 1;
  const col = up ? colors.up : colors.down;
  return (
    <View style={{ height, width: "100%" }} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end" }}>
        {bars.map((v, i) => {
          const h = 8 + ((v - min) / span) * (height - 14);
          return (
            <View key={i} style={{ flex: 1, height: "100%", justifyContent: "flex-end" }}>
              <View style={{ height: h, backgroundColor: col, opacity: 0.16 }} />
              <View style={{ position: "absolute", bottom: h - 2, left: 0, right: 0, height: 2.5, backgroundColor: col }} />
            </View>
          );
        })}
      </View>
    </View>
  );
}
