import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import hi from "./hi.json";
import mr from "./mr.json";

// Part G — minimum viable: en + hi + one regional language (mr chosen
// as placeholder pilot state; swap for ta.json etc. per actual pilot
// federation). Language switcher wired on first launch + settings
// in Phase 3.

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
