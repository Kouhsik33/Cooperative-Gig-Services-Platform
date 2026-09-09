import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors, type } from "../theme/tokens";

export interface TabDef {
  /** Route name — also what useTabSwitch(name) / navigation.navigate(name) target. */
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  Screen: React.ComponentType;
}

// A real bottom-tab navigator (was a hand-rolled shell that wasn't a
// navigator — which broke touch handling on pushed screens, popToTop,
// and cross-tab navigation). @react-navigation/bottom-tabs owns the
// tab-bar layout + safe-area + touch handling, and keeps the bar
// working over any screen pushed onto a tab's stack.
//
// One module-level navigator instance is fine: the customer and worker
// tab sets are role-routed and never mounted at the same time.
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
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { ...type.caption },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={def?.icon ?? "ellipse"} size={size ?? 22} color={color} />
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
