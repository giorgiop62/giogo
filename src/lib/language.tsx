import i18n from "i18next";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nextProvider, initReactI18next, useTranslation } from "react-i18next";

export type Language = "it" | "en" | "es" | "fr";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const resources: Record<Language, { translation: Record<string, string> }> = {
  it: {
    translation: {
      "app.name": "Giogo",
      "app.title": "Giogo - Dating locale con chat e voce",
      "app.footer": "© {year} Giogo. Connessioni reali, senza rumore.",
      change_language: "Cambia lingua",
      "nav.home": "Home",
      "nav.play": "Play",
      "nav.events": "Eventi",
      "nav.profile": "Profilo",
      "nav.matches": "Matches",
      "nav.settings": "Impostazioni",
      "nav.logout": "Esci",
      "nav.login": "Accedi",
      "nav.register": "Registrati",
      "root.404": "Questa pagina non esiste.",
      "root.back_home": "Torna alla home",
      "root.error": "Qualcosa è andato storto",
      "root.try_again": "Riprova",
      "landing.badge": "Match locali, eventi e round rapidi",
      "landing.title": "Incontri reali, prima con voce e chat.",
      "landing.subtitle":
        "Giogo combina matchmaking vicino a te, eventi entro 50 km e conversazioni brevi pensate per capire subito se c'è feeling.",
      "landing.register": "Registrati",
      "landing.login": "Accedi",
      "landing.how_title": "Come funziona",
      "landing.how_1": "Crea un profilo essenziale con una sola foto e prompt personali.",
      "landing.how_2": "Attiva la posizione per scoprire persone ed eventi vicini.",
      "landing.how_3": "Entra in round chat da 5 minuti o vocali da 3 minuti.",
      "landing.events": "Eventi vicini",
      "landing.people": "Profili reali",
      "landing.preview_city": "Persone nella tua zona",
      "landing.preview_voice": "Round vocale",
      "landing.preview_chat": "Chat rapida",
      "auth.login_title": "Accedi",
      "auth.signup_title": "Registrati",
      "auth.email_label": "Email",
      "auth.password_label": "Password",
      "auth.confirm_password_label": "Conferma password",
      "auth.login_button": "Accedi",
      "auth.signup_button": "Crea account",
      "auth.have_account": "Hai già un account?",
      "auth.no_account": "Non hai un account?",
      "auth.login_error": "Accesso non riuscito",
      "auth.login_success": "Accesso effettuato",
      "auth.signup_success": "Account creato",
      "auth.password_mismatch": "Le password non corrispondono",
      "auth.check_email_confirmation": "Controlla la tua email per confermare l'account.",
      "auth.forgot": "Hai dimenticato la password?",
      "auth.reset_sent": "Email di recupero inviata",
      "common.loading": "Caricamento...",
      "common.save": "Salva",
      "common.cancel": "Annulla",
      "common.edit": "Modifica",
      "common.update": "Aggiorna",
      "common.delete": "Elimina",
      "common.km": "{value} km",
      "geo.enable": "Usa posizione attuale",
      "geo.saved": "Posizione salvata",
      "geo.denied": "Posizione non disponibile",
      "dashboard.title": "Scegli come incontrare qualcuno adesso.",
      "dashboard.subtitle":
        "Locale o globale, poi chat veloce o voce live. Tutto ruota attorno a parole e audio.",
      "dashboard.local": "Locale",
      "dashboard.global": "Globale",
      "dashboard.chat": "Chat",
      "dashboard.voice": "Vocale",
      "dashboard.local_desc": "Persone reali vicino alla tua posizione.",
      "dashboard.global_desc": "Match casuale internazionale.",
      "dashboard.chat_desc": "Conversazione testuale da 5 minuti.",
      "dashboard.voice_desc": "Audio live da 3 minuti.",
      "dashboard.start": "Entra nel round",
      "dashboard.nearby": "Utenti vicini",
      "dashboard.no_nearby": "Nessun profilo reale trovato vicino a te.",
      "events.title": "Eventi",
      "events.subtitle": "Crea eventi liberamente. Solo chi è entro 50 km può partecipare.",
      "events.create": "Crea evento",
      "events.join": "Partecipa",
      "events.too_far": "Troppo lontano",
      "events.created": "Evento creato",
      "events.needs_location": "Attiva la posizione per partecipare agli eventi vicini.",
      "matches.title": "I tuoi match",
      "matches.empty": "Nessun match ancora. Entra in un round per iniziare.",
      "matches.message": "Scrivi un messaggio...",
      "settings.title": "Impostazioni",
      "settings.subtitle": "Gestisci sessione, profilo e account.",
      "settings.delete_profile": "Elimina profilo",
      "settings.delete_account": "Elimina account",
      "profile.create": "Crea profilo",
      "profile.edit": "Modifica profilo",
      "profile.update": "Aggiorna profilo",
      "profile.saved": "Profilo salvato",
      "profile.photo": "Foto profilo",
      "profile.name": "Nome",
      "profile.age": "Età",
      "profile.city": "Città",
      "profile.bio": "Bio",
      "profile.interests": "Interessi",
      "profile.looking_for": "Cosa cerchi",
      "profile.hobbies": "Hobby",
      "profile.preferred_mode": "Modalità preferita",
      "profile.prompts": "Prompt personali",
      "profile.prompt_1": "Una cosa che amo fare...",
      "profile.prompt_2": "Andiamo d'accordo se...",
      "profile.prompt_3": "La mia green flag...",
      "profile.prompt_4": "La cosa più spontanea che ho fatto...",
    },
  },
  en: { translation: {} },
  es: { translation: {} },
  fr: { translation: {} },
};

resources.en.translation = {
  ...resources.it.translation,
  "app.title": "Giogo - Local dating with chat and voice",
  "app.footer": "© {year} Giogo. Real connections, less noise.",
  "nav.events": "Events",
  "nav.profile": "Profile",
  "nav.settings": "Settings",
  "nav.logout": "Logout",
  "nav.login": "Login",
  "nav.register": "Register",
  "landing.badge": "Local matches, events and quick rounds",
  "landing.title": "Real dates, starting with voice and chat.",
  "landing.subtitle":
    "Giogo combines nearby matchmaking, events within 50 km and short conversations that quickly show whether there is chemistry.",
  "landing.register": "Register",
  "landing.login": "Login",
  "landing.how_title": "How it works",
  "landing.how_1": "Create a focused profile with one photo and personal prompts.",
  "landing.how_2": "Enable location to discover nearby people and events.",
  "landing.how_3": "Join 5-minute chat rounds or 3-minute voice rounds.",
  "landing.events": "Nearby events",
  "landing.people": "Real profiles",
  "dashboard.title": "Choose how to meet someone now.",
  "dashboard.subtitle":
    "Local or global, then quick chat or live voice. Everything is built around words and audio.",
  "dashboard.local": "Local",
  "dashboard.global": "Global",
  "dashboard.chat": "Chat",
  "dashboard.voice": "Voice",
  "dashboard.local_desc": "Real people near your position.",
  "dashboard.global_desc": "Random international matching.",
  "dashboard.chat_desc": "5-minute text conversation.",
  "dashboard.voice_desc": "3-minute live audio.",
  "dashboard.start": "Enter round",
  "dashboard.nearby": "Nearby users",
  "dashboard.no_nearby": "No real profiles found near you.",
  "events.title": "Events",
  "events.subtitle": "Create events freely. Only users within 50 km can join.",
  "events.create": "Create event",
  "events.join": "Join",
  "events.too_far": "Too far",
  "matches.title": "Your matches",
  "matches.empty": "No matches yet. Join a round to get started.",
  "settings.title": "Settings",
  "settings.subtitle": "Manage session, profile and account.",
  "profile.create": "Create profile",
  "profile.edit": "Edit profile",
  "profile.update": "Update profile",
  "profile.saved": "Profile saved",
};
resources.es.translation = {
  ...resources.en.translation,
  "nav.events": "Eventos",
  "nav.profile": "Perfil",
  "nav.settings": "Ajustes",
  "nav.logout": "Salir",
  "nav.login": "Iniciar sesión",
  "nav.register": "Registrarse",
  "landing.title": "Citas reales, primero con voz y chat.",
  "dashboard.local": "Local",
  "dashboard.global": "Global",
  "dashboard.voice": "Voz",
  "events.title": "Eventos",
  "matches.title": "Tus matches",
  "settings.title": "Ajustes",
  "profile.edit": "Editar perfil",
};
resources.fr.translation = {
  ...resources.en.translation,
  "nav.events": "Événements",
  "nav.profile": "Profil",
  "nav.settings": "Réglages",
  "nav.logout": "Déconnexion",
  "nav.login": "Connexion",
  "nav.register": "Inscription",
  "landing.title": "De vraies rencontres, d'abord par voix et chat.",
  "dashboard.local": "Local",
  "dashboard.global": "Global",
  "dashboard.voice": "Vocal",
  "events.title": "Événements",
  "matches.title": "Vos matches",
  "settings.title": "Réglages",
  "profile.edit": "Modifier le profil",
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "it",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "it";
    return (window.localStorage.getItem("giogo-language") as Language | null) ?? "it";
  });

  useEffect(() => {
    i18n.changeLanguage(language);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("giogo-language", language);
    }
  }, [language]);

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key, values) =>
        i18n.t(key, values).replace(/\{(\w+)\}/g, (_, name) => `${values?.[name] ?? ""}`),
    }),
    [language],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
    </I18nextProvider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  const { t } = useTranslation();
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return { ...context, t: context.t ?? t };
}
