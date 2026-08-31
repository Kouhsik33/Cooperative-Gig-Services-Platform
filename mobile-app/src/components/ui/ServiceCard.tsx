import { StyleSheet, Text, View } from "react-native";
import Card from "./Card";
import { colors, spacing, type } from "../../theme/tokens";

interface Props {
  icon: string;
  name: string;
  category: string;
  priceLabel: string;
  onPress: () => void;
}

export default function ServiceCard({ icon, name, category, priceLabel, onPress }: Props) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.category}>{category}</Text>
      <Text style={styles.price}>{priceLabel}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  icon: { fontSize: 22 },
  name: { ...type.h3, color: colors.textPrimary },
  category: {
    ...type.small,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  price: { ...type.bodyMedium, color: colors.primaryDark, marginTop: spacing.md },
});
