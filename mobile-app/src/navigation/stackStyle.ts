import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { colors } from "../theme/tokens";

// Shared native-stack header styling so every pushed screen (worker
// search, booking slot, pricing, checkout, invoice, rating...) looks
// like one coherent product instead of each screen picking its own bar.
export const screenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: "700" },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};
