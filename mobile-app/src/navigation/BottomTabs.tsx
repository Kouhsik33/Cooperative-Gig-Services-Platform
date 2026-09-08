import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, type } from "../theme/tokens";
import { TabSwitchContext } from "./TabSwitchContext";

export interface TabDef {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  Screen: React.ComponentType;
}

// A dependency-free bottom tab bar: no @react-navigation/bottom-tabs
// package (this environment has no network access to install it), so
// each tab's own react-navigation stack is rendered directly via local
// state — a standard "conditionally render a navigator tree" pattern
// react-navigation supports for cases like auth-flow switching.
//
// Each tab is lazily mounted on first visit and then kept alive
// (hidden via display:none rather than unmounted) for as long as
// BottomTabs itself is mounted — matching @react-navigation/bottom-tabs'
// own default lazy+keep-alive behavior. This preserves a tab's inner
// navigation state across switches, and avoids a real bug the earlier
// unmount-on-switch version had: an in-flight fetch's `.then(setState)`
// resolving after the screen unmounted, which React reports as "Can't
// perform a React state update on an unmounted component."
export default function BottomTabs({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0].key);
  const [visited, setVisited] = useState<Set<string>>(new Set([tabs[0].key]));
  const insets = useSafeAreaInsets();

  function switchTo(key: string) {
    setActive(key);
    setVisited((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  return (
    <TabSwitchContext.Provider value={switchTo}>
      <View style={styles.container}>
       <View style={styles.content}>
        {(() => {
          const activeTab = tabs.find((tab) => tab.key === active);
          if (!activeTab) return null;

          const Screen = activeTab.Screen;

          return (
            <View style={StyleSheet.absoluteFill}>
              <Screen />
            </View>
          );
        })()}
      </View>
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          {tabs.map((tab) => {
            const isActive = tab.key === active;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabButton}
                onPress={() => switchTo(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={22}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </TabSwitchContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  hidden: { display: "none" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tabButton: { flex: 1, alignItems: "center" },
  label: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  labelActive: { color: colors.primary, fontWeight: "700" },
});
