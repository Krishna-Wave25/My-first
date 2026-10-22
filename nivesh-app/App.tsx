import React, { useCallback, useEffect, useState } from "react";
import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "./src/theme";
import { getAccess, getWatchlist, setWatchlist, unlockForTesting } from "./src/store";
import MarketScreen from "./src/screens/MarketScreen";
import WatchlistScreen from "./src/screens/WatchlistScreen";
import InvestScreen from "./src/screens/InvestScreen";
import ScreenerScreen from "./src/screens/ScreenerScreen";
import LearnScreen from "./src/screens/LearnScreen";
import PaywallScreen from "./src/screens/PaywallScreen";

const Tab = createBottomTabNavigator();
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.card, border: colors.border, primary: colors.accent } };
const icon = (g: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{g}</Text>;

export default function App() {
  const [access, setAccess] = useState<{ paid: boolean; trialDaysLeft: number } | null>(null);
  const [watch, setWatch] = useState<string[]>([]);

  useEffect(() => {
    getAccess().then(setAccess);
    getWatchlist().then(setWatch);
  }, []);

  const toggle = useCallback((sym: string) => {
    setWatch((w) => {
      const next = w.includes(sym) ? w.filter((x) => x !== sym) : [...w, sym];
      setWatchlist(next);
      return next;
    });
  }, []);

  if (!access) return null;
  if (!access.paid && access.trialDaysLeft <= 0) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <PaywallScreen onUnlock={async () => { await unlockForTesting(); setAccess(await getAccess()); }} />
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={theme}>
        <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted, headerTitle: access.paid ? "Nivesh" : `Nivesh · trial: ${access.trialDaysLeft}d left` }}>
          <Tab.Screen name="Market" options={{ tabBarIcon: icon("📈") }}>{() => <MarketScreen watch={watch} toggle={toggle} />}</Tab.Screen>
          <Tab.Screen name="Watchlist" options={{ tabBarIcon: icon("★") }}>{() => <WatchlistScreen watch={watch} toggle={toggle} />}</Tab.Screen>
          <Tab.Screen name="Screener" component={ScreenerScreen} options={{ tabBarIcon: icon("🔎") }} />
          <Tab.Screen name="Invest" component={InvestScreen} options={{ tabBarIcon: icon("₹") }} />
          <Tab.Screen name="Learn" component={LearnScreen} options={{ tabBarIcon: icon("📘") }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
