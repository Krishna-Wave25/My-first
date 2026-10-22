import React from "react";
import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "./src/theme";
import { useSubscription } from "./src/useSubscription";
import { AppProvider } from "./src/state";
import HomeScreen from "./src/screens/HomeScreen";
import WatchlistScreen from "./src/screens/WatchlistScreen";
import PracticeScreen from "./src/screens/PracticeScreen";
import InvestScreen from "./src/screens/InvestScreen";
import LearnScreen from "./src/screens/LearnScreen";
import StockScreen from "./src/screens/StockScreen";
import SearchScreen from "./src/screens/SearchScreen";
import ScreenerScreen from "./src/screens/ScreenerScreen";
import SipScreen from "./src/screens/SipScreen";
import PaywallScreen from "./src/screens/PaywallScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, border: colors.border, primary: colors.accent, text: colors.text } };
const icon = (g: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{g}</Text>;

function Tabs({ trialLabel }: { trialLabel: string }) {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted, headerTitleStyle: { fontWeight: "800" }, headerShadowVisible: false }}>
      <Tab.Screen name="Stocks" component={HomeScreen} options={{ tabBarIcon: icon("📈"), headerTitle: trialLabel }} />
      <Tab.Screen name="Watchlist" component={WatchlistScreen} options={{ tabBarIcon: icon("★") }} />
      <Tab.Screen name="Practice" component={PracticeScreen} options={{ tabBarIcon: icon("🎯") }} />
      <Tab.Screen name="Invest" component={InvestScreen} options={{ tabBarIcon: icon("₹"), title: "Investing basics" }} />
      <Tab.Screen name="Learn" component={LearnScreen} options={{ tabBarIcon: icon("📘") }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const sub = useSubscription();
  const access = sub.access;
  if (!access) return null;

  if (!access.paid && access.trialDaysLeft <= 0) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <PaywallScreen plans={sub.plans} connected={sub.connected} busy={sub.busy} message={sub.message} onBuy={sub.buy} onRestore={sub.restore} onTestUnlock={sub.testUnlock} />
      </SafeAreaProvider>
    );
  }
  const trialLabel = access.paid ? "Nivesh" : `Nivesh · trial ${access.trialDaysLeft}d left`;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppProvider>
        <NavigationContainer theme={theme}>
          <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerTitleStyle: { fontWeight: "700" } }}>
            <Stack.Screen name="Tabs" options={{ headerShown: false }}>{() => <Tabs trialLabel={trialLabel} />}</Stack.Screen>
            <Stack.Screen name="Stock" component={StockScreen} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ title: "Search" }} />
            <Stack.Screen name="Screener" component={ScreenerScreen} options={{ title: "Stock screener" }} />
            <Stack.Screen name="Sip" component={SipScreen} options={{ title: "SIP calculator" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
