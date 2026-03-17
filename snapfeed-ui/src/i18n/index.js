import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import vi from "./locales/vi.json";
import en from "./locales/en.json";

const DEFAULT_LANG = import.meta.env.VITE_DEFAULT_LANG || "en";

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: DEFAULT_LANG,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;