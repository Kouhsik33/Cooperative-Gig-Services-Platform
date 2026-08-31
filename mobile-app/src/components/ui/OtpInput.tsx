import { useRef } from "react";
import { StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from "react-native";
import { colors, radius, spacing, type } from "../../theme/tokens";

interface Props {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
}

// A 4-digit code entry rendered as boxes (product-flow update §37/§19/§25
// — login OTP, service-start OTP, completion OTP all share this one
// input). Implemented as a single hidden TextInput driving a visual box
// row, rather than N separate auto-advancing inputs — simpler and avoids
// a whole class of focus-management bugs.
export default function OtpInput({ value, onChange, length = 4, autoFocus }: Props) {
  const inputRef = useRef<TextInput>(null);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  return (
    <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
      <View>
        <View style={styles.row}>
          {digits.map((digit, i) => (
            <View
              key={i}
              style={[
                styles.box,
                i === value.length && styles.boxActive,
              ]}
            >
              <Text style={styles.digit}>{digit}</Text>
            </View>
          ))}
        </View>
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={value}
          onChangeText={(text) => onChange(text.replace(/[^0-9]/g, "").slice(0, length))}
          keyboardType="number-pad"
          maxLength={length}
          autoFocus={autoFocus}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const BOX_SIZE = 56;

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center" },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.sm,
  },
  boxActive: { borderColor: colors.primary },
  digit: { ...type.h1, color: colors.textPrimary },
  hiddenInput: { position: "absolute", opacity: 0, height: 1, width: 1 },
});
