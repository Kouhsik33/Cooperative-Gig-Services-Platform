import { useNavigation } from "@react-navigation/native";

// Switch the active bottom tab from a screen nested inside one tab's
// stack (e.g. Home's "Book Emergency Service" CTA). Now that the tab bar
// is a real @react-navigation/bottom-tabs navigator, this is just a
// normal navigate() up the tree to the sibling tab route — no custom
// context needed.
export function useTabSwitch() {
  const navigation = useNavigation();
  return (tabRouteName: string) => navigation.navigate(tabRouteName as never);
}
