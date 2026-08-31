import { StyleSheet, Text, View } from "react-native";
import Avatar from "./Avatar";
import Card from "./Card";
import Chip from "./Chip";
import Rating from "./Rating";
import { VerifiedBadge } from "./Badge";
import { colors, spacing, type } from "../../theme/tokens";

interface Props {
  name: string;
  verifiedLabel: string;
  ratingAvg: number;
  metaLine: string;
  skills: string[];
  onPress?: () => void;
}

// Trust-first worker card (master prompt §11): verification badge and
// skill chips sit at the point of decision, not behind a tap.
export default function WorkerCard({
  name,
  verifiedLabel,
  ratingAvg,
  metaLine,
  skills,
  onPress,
}: Props) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Avatar name={name} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            <Rating value={ratingAvg} />
          </View>
          <VerifiedBadge label={verifiedLabel} />
          <Text style={styles.meta}>{metaLine}</Text>
        </View>
      </View>
      {skills.length > 0 && (
        <View style={styles.skills}>
          {skills.map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: { flexDirection: "row" },
  headerText: { flex: 1, marginLeft: spacing.md },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { ...type.h3, color: colors.textPrimary, flexShrink: 1, marginRight: spacing.sm },
  meta: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
  skills: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.md },
});
