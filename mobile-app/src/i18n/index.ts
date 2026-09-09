import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import hi from "./hi.json";
import mr from "./mr.json";
import te from "./te.json";

// Part G — English + regional languages, all core flows: en / hi / mr / te
// (Telugu). Every locale is at full key parity (see the parity check in
// the risks/audit scripts). Language switcher lives on LoginScreen (first
// launch) + each role's home + profile screens.

export const SUPPORTED_LANGUAGES = ["en", "hi", "mr", "te"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
    te: { translation: te },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
