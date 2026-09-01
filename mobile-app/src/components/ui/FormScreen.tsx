import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { colors } from "../../theme/tokens";

// A scrollable screen that stays usable once the keyboard is open.
//
// Five form screens previously rendered a bare ScrollView. On a small
// phone the keyboard covered the lower fields *and the submit button*,
// with no way to scroll to them — the address form was unfinishable.
//
// Wrapped once here rather than repeated per screen so the platform
// difference stays in one place: iOS needs "padding" (the keyboard
// overlays the view), Android resizes the window itself and only needs
// "height" — using padding on both double-compensates and leaves a gap.
export default function FormScreen({
  children,
  contentContainerStyle,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        // Lets a user tap a button while the keyboard is up, instead of
        // the first tap only dismissing the keyboard.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
});
