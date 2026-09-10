import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/store/AuthContext";
import "./src/i18n";

export default function App() {
  const [fontsLoaded] = useFonts({
    Kaltera: require("./src/theme/Kaltera-Regular.ttf"),
    "Kaltera-Regular": require("./src/theme/Kaltera-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFF6E8",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#C1121F" />
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
