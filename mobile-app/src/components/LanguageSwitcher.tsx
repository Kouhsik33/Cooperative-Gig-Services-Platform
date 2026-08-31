import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api/client";
import { Chip } from "./ui";
import { spacing } from "../theme/tokens";

const LANGUAGES = ["en", "hi", "mr"] as const;

interface Props {
  // Persists the choice server-side via PATCH /auth/language — only valid
  // once the user is authenticated. LoginScreen (pre-auth) omits this.
  persist?: boolean;
}

// Part G — "Language switcher visible on first launch and in settings."
// There's no dedicated Settings screen yet (out of scope for this phase),
// so this is placed on LoginScreen (first launch) and each role's home
// screen as a stand-in.
export default function LanguageSwitcher({ persist = false }: Props) {
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
    <View style={{ flexDirection: "row", marginRight: -spacing.sm }}>
      {LANGUAGES.map((code) => (
        <Chip
          key={code}
          label={t(`language.${code}`)}
          selected={i18n.language === code}
          onPress={() => select(code)}
        />
      ))}
    </View>
  );
}
