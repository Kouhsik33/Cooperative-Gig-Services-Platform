import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { borders, colors, radius, shadow, type } from "../theme/tokens";

export interface TabDef {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  Screen: React.ComponentType;
}

const Tab = createBottomTabNavigator();

export default function BottomTabs({ tabs }: { tabs: TabDef[] }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const def = tabs.find((t) => t.key === route.name);
        return {
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.label,
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconActiveWrap]}>
              <Ionicons
                name={def?.icon ?? "ellipse"}
                size={20}
                color={focused ? colors.textInverse : colors.textMuted}
              />
            </View>
          ),
        };
      }}
    >
      {tabs.map((t) => (
        <Tab.Screen
          key={t.key}
          name={t.key}
          component={t.Screen}
          options={{ tabBarLabel: t.label }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: borders.default,
    borderTopColor: borders.color,
    borderLeftWidth: borders.default,
    borderRightWidth: borders.default,
    borderLeftColor: borders.color,
    borderRightColor: borders.color,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: 68,
    paddingTop: 6,
    paddingBottom: 8,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    // Retro upward hard offset shadow
    shadowColor: borders.color,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  label: {
    ...type.caption,
    fontWeight: "800",
    fontSize: 10,
    marginTop: 2,
  },
  iconWrap: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  iconActiveWrap: {
    backgroundColor: colors.primary,
    borderWidth: borders.thin,
    borderColor: borders.color,
    shadowColor: borders.color,
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
});
