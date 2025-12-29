"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

const languages = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ar", name: "العربية", flag: "🇸🇦" }
];

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("locale") || "fr";
    }
    return "fr";
  });
  const [translations, setTranslations] = useState({});

  const loadTranslations = async (lang) => {
    try {
      const response = await fetch(`/locales/${lang}.json`);
      const data = await response.json();
      setTranslations(data);
    } catch (error) {
      console.error("Error loading translations:", error);
    }
  };

  useEffect(() => {
    // Load translations asynchronously
    const initTranslations = async () => {
      await loadTranslations(locale);
    };
    initTranslations();
    
    // Apply RTL for Arabic
    if (locale === "ar") {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const changeLanguage = (newLocale) => {
    setLocale(newLocale);
    localStorage.setItem("locale", newLocale);
    loadTranslations(newLocale);
    
    // Apply RTL for Arabic
    if (newLocale === "ar") {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = newLocale;
    }
    
    // Reload page to apply changes
    window.location.reload();
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t, languages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
