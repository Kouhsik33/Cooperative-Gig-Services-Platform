import { createContext, useContext } from "react";

// Lets a screen nested inside one bottom-tab stack (e.g. the Home tab's
// "Book Emergency Service" CTA) switch the active tab, without needing
// react-navigation's cross-navigator typed actions. Set by BottomTabs.
export const TabSwitchContext = createContext<(key: string) => void>(() => {});

export function useTabSwitch() {
  return useContext(TabSwitchContext);
}
