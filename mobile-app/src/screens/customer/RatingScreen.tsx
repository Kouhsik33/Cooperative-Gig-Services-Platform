import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { apiClient } from "../../api/client";
import { Button, FormScreen } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<HomeStackParamList, "Rating">;

// Stable identifiers, not display text: the chosen tags are persisted into
// the rating comment, so they must not change meaning when the customer
// switches language.
const HIGHLIGHTS = [
  "Professionalism",
  "Punctuality",
  "Skill",
  "Cleanliness",
  "Communication",
] as const;

// Customer journey step 5 (Part B) — Requirement 6. Post-job star rating +
// comment, with micro-copy on how rating affects worker visibility.
export default function RatingScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { bookingId } = route.params;
  const [stars, setStars] = useState(5);
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleHighlight(h: string) {
    setSelectedHighlights((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );
  }

  async function submit() {
    setSubmitting(true);
    try {
      const fullComment = [selectedHighlights.join(", "), comment].filter(Boolean).join(" — ");
      await apiClient.post(`/bookings/${bookingId}/rating`, {
        stars,
        comment: fullComment || undefined,
      });
      navigation.popToTop();
    } catch {
      Alert.alert(t("rating.submitError"), t("rating.submitErrorMessage"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreen contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("rating.title")}</Text>
      <Text style={styles.subtitle}>{t("rating.howWasIt")}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => setStars(n)}
            accessibilityRole="radio"
            accessibilityState={{ selected: n <= stars }}
            accessibilityLabel={`${n}`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={n <= stars ? "star" : "star-outline"}
              size={38}
              color={n <= stars ? colors.gold : colors.borderStrong}
            />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t("rating.whatWentWell")}</Text>
      <View style={styles.highlightRow}>
        {HIGHLIGHTS.map((h) => {
          const selected = selectedHighlights.includes(h);
          return (
            <TouchableOpacity
              key={h}
              style={[styles.highlightChip, selected && styles.highlightChipActive]}
              onPress={() => toggleHighlight(h)}
            >
              <Text style={[styles.highlightText, selected && styles.highlightTextActive]}>
                {t(`rating.tag${h}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={styles.input}
        placeholder={t("rating.commentPlaceholder")}
        placeholderTextColor={colors.textMuted}
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <Text style={styles.microcopy}>{t("rating.microcopy")}</Text>
      <Button label={t("rating.submit")} onPress={submit} loading={submitting} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  stars: { flexDirection: "row", marginBottom: spacing.xl },
  starFilled: { fontSize: 36, color: colors.gold, marginRight: spacing.sm },
  starEmpty: { fontSize: 36, color: colors.border, marginRight: spacing.sm },
  sectionLabel: { ...type.smallMedium, color: colors.textPrimary, marginBottom: spacing.sm },
  highlightRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg },
  highlightChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  highlightChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  highlightText: { ...type.small, color: colors.textSecondary },
  highlightTextActive: { color: colors.primaryDark, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  microcopy: { ...type.caption, color: colors.textMuted, marginBottom: spacing.xl },
});
