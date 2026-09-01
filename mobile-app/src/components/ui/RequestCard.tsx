import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Badge } from "./Badge";
import Button from "./Button";
import Card from "./Card";
import { formatCurrency, formatDateTime } from "../../lib/format";
import type { IncomingRequest } from "../../api/bookings";
import { colors, layout, radius, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

// One incoming dispatch request (master prompt §3). Previously duplicated
// between WorkerHomeScreen and JobFeedScreen, which had already drifted —
// the two showed different fields and only one was translated.
//
// Earnings lead the card deliberately: the cooperative's whole proposition
// is that a worker knows exactly what a job pays *before* accepting it, so
// that figure gets the most visual weight, not the service name.
export default function RequestCard({
  request,
  onAccept,
  onDecline,
  accepting = false,
  disabled = false,
}: {
  request: IncomingRequest;
  onAccept: () => void;
  onDecline?: () => void;
  accepting?: boolean;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const money = (n: number) => formatCurrency(n, i18n.language);

  const meta = [
    request.distanceKm != null ? t("workerHome.kmAway", { km: request.distanceKm }) : null,
    request.durationMinMinutes && request.durationMaxMinutes
      ? t("workerHome.estDuration", {
          min: request.durationMinMinutes,
          max: request.durationMaxMinutes,
        })
      : null,
  ].filter(Boolean) as string[];

  return (
    <Card style={[styles.card, request.isEmergency && styles.emergency]}>
      <View style={styles.headRow}>
        <Text style={styles.service} numberOfLines={2}>
          {request.serviceName}
        </Text>
        {request.isEmergency && <Badge label={t("workerHome.emergency")} tone="error" />}
      </View>

      <Text style={styles.earningsLabel}>{t("workerHome.expectedEarnings")}</Text>
      <Text style={styles.earnings}>{money(request.workerShare)}</Text>
      {request.isEmergency && request.emergencyBonus > 0 && (
        <Text style={styles.bonus}>
          {t("worker.emergencyBonusIncluded")}: {money(request.emergencyBonus)}
        </Text>
      )}

      <Text style={styles.when}>{formatDateTime(request.scheduledAt, i18n.language)}</Text>
      {meta.length > 0 && <Text style={styles.meta}>{meta.join(" · ")}</Text>}
      {request.inYourArea && (
        <View style={styles.areaRow}>
          <Ionicons name={icons.location} size={iconSize.xs} color={colors.primaryDark} />
          <Text style={styles.area}>{t("workerHome.inYourArea")}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {onDecline && (
          <TouchableOpacity
            onPress={onDecline}
            style={styles.decline}
            accessibilityRole="button"
            accessibilityLabel={t("workerHome.decline")}
          >
            <Text style={styles.declineText}>{t("workerHome.decline")}</Text>
          </TouchableOpacity>
        )}
        <Button
          label={t("workerHome.accept")}
          onPress={onAccept}
          loading={accepting}
          disabled={disabled}
          style={styles.accept}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  emergency: { borderColor: colors.error, borderWidth: 1.5 },
  headRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  service: { ...type.h3, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  earningsLabel: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },
  earnings: { ...type.h1, color: colors.success },
  bonus: { ...type.caption, color: colors.secondaryDark, marginTop: 2 },
  when: { ...type.smallMedium, color: colors.textPrimary, marginTop: spacing.md },
  meta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  areaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  area: { ...type.caption, color: colors.primaryDark },
  actions: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg, gap: spacing.md },
  decline: {
    paddingHorizontal: spacing.lg,
    minHeight: layout.minTouchTarget,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineText: { ...type.bodyMedium, color: colors.textSecondary },
  accept: { flex: 1 },
});
