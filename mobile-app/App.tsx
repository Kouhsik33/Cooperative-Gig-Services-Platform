import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/store/AuthContext";
import { PALETTE } from "./src/theme/tokens";
import "./src/i18n";

export default function App() {
  const [fontsLoaded] = useFonts({
    Kaltera: require("./src/theme/Kaltera-Regular.ttf"),
    "Kaltera-Regular": require("./src/theme/Kaltera-Regular.ttf"),
    JosefinSans: require("./src/theme/JosefinSans-Regular.ttf"),
    "JosefinSans-Regular": require("./src/theme/JosefinSans-Regular.ttf"),
    "JosefinSans-Medium": require("./src/theme/JosefinSans-Medium.ttf"),
    "JosefinSans-SemiBold": require("./src/theme/JosefinSans-SemiBold.ttf"),
    "JosefinSans-Bold": require("./src/theme/JosefinSans-Bold.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: PALETTE.canvas,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={PALETTE.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="dark" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
