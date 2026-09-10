import { ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api/client";
import { SUPPORTED_LANGUAGES } from "../i18n";
import { Chip } from "./ui";
import { spacing } from "../theme/tokens";

const LANGUAGES = SUPPORTED_LANGUAGES;

interface Props {
  // Persists the choice server-side via PATCH /auth/language — only valid
  // once the user is authenticated. LoginScreen (pre-auth) omits this.
  persist?: boolean;
  center?: boolean;
}

// Part G — "Language switcher visible on first launch and in settings."
// There's no dedicated Settings screen yet (out of scope for this phase),
// so this is placed on LoginScreen (first launch) and each role's home
// screen as a stand-in.
export default function LanguageSwitcher({ persist = false, center = false }: Props) {
  const { t, i18n } = useTranslation();

  async function select(code: string) {
    await i18n.changeLanguage(code);
    if (persist) {
      try {
        await apiClient.patch("/auth/language", { language: code });
      } catch {
        // Non-fatal — the UI has already switched language locally.
      }
    }
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        { flexDirection: "row", alignItems: "center", paddingRight: spacing.sm },
        center && { justifyContent: "center", minWidth: "100%" },
      ]}
      style={{ flexGrow: 0 }}
    >
      {LANGUAGES.map((code) => (
        <Chip
          key={code}
          label={t(`language.${code}`)}
          selected={i18n.language === code}
          onPress={() => select(code)}
        />
      ))}
    </ScrollView>
  );
}
