import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'it' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    'nav.home': 'Home',
    'nav.play': 'Play',
    'nav.events': 'Events',
    'nav.profile': 'Profile',
    'nav.matches': 'Matches',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'landing.live': 'Live · {count} people online right now',
    'landing.title': 'Speed dating, reinvented in real time.',
    'landing.subtitle': 'Hop into a live round, chat or video with curated strangers, and reveal mutual matches when the timer hits zero.',
    'landing.enter_lobby': 'Enter the lobby',
    'landing.logout': 'Logout',
    'landing.how_it_works': 'How it works',
    'landing.online': 'Online',
    'landing.active_rooms': 'Active rooms',
    'landing.matches_today': 'Matches today',
    'landing.avg_rating': 'Avg. rating',
    'landing.how_title': 'How it works',
    'landing.round_beats': 'A round in three beats.',
    'landing.build_vibe': 'Build your vibe',
    'landing.build_desc': 'Photo, age, a couple of interests. Sixty seconds.',
    'landing.drop_room': 'Drop into a room',
    'landing.drop_desc': 'We balance the lobby and start the moment it\'s fair.',
    'landing.reveal_matches': 'Reveal your matches',
    'landing.reveal_desc': 'Tap interested in secret. Mutuals unlock private chat.',
    'landing.chat_mode': 'Chat Mode',
    'landing.chat_time': '5 min per round',
    'landing.chat_desc': 'Words first. Trade messages, emoji and AI icebreakers. Low pressure, high spark.',
    'landing.video_mode': 'Webcam Mode',
    'landing.video_time': '3 min per round',
    'landing.video_desc': 'Eyes on. Quick face-to-face video rounds with mute, report, and a smooth round-end overlay.',
    'landing.from_rounds': 'From the rounds',
    'landing.people_met': 'People who actually met.',
    'landing.cta_title': 'Your next round starts in seconds.',
    'landing.cta_desc': 'Verified profiles, instant exits, zero phone-number sharing. Just vibes.',
    'landing.enter_lobby_2': 'Enter the lobby',
    'matches.online_now': '● online now',
    'room.disconnected': 'disconnesso',
    'room.online': '● online',
    'room.offline': 'offline',
    'app.name': 'Giogo',
    'app.title': 'Giogo — Live Speed Dating Rooms',
    'app.footer': '© {year} Giogo. Made for real connections.',
    'root.404': 'This round doesn\'t exist.',
    'root.back_home': 'Back to home',
    'root.error': 'Something glitched',
    'root.try_again': 'Try again',
    'change_language': 'Change language',
  },
  it: {
    'nav.home': 'Inizio',
    'nav.play': 'Gioca',
    'nav.events': 'Eventi',
    'nav.profile': 'Profilo',
    'nav.matches': 'Matches',
    'nav.logout': 'Esci',
    'nav.login': 'Accedi',
    'landing.live': 'Live · {count} persone online ora',
    'landing.title': 'Speed dating, reinventato in tempo reale.',
    'landing.subtitle': 'Entra in un round live, chatta o videochiama con estranei selezionati, e scopri i match reciproci quando il timer arriva a zero.',
    'landing.enter_lobby': 'Entra nella lobby',
    'landing.logout': 'Esci',
    'landing.how_it_works': 'Come funziona',
    'landing.online': 'Online',
    'landing.active_rooms': 'Stanze attive',
    'landing.matches_today': 'Match oggi',
    'landing.avg_rating': 'Valutazione media',
    'landing.how_title': 'Come funziona',
    'landing.round_beats': 'Un round in tre battute.',
    'landing.build_vibe': 'Costruisci il tuo vibe',
    'landing.build_desc': 'Foto, età, un paio di interessi. Sessanta secondi.',
    'landing.drop_room': 'Entra in una stanza',
    'landing.drop_desc': 'Bilanciamo la lobby e iniziamo nel momento in cui è equo.',
    'landing.reveal_matches': 'Rivela i tuoi match',
    'landing.reveal_desc': 'Tocca interessato in segreto. I mutual sbloccano la chat privata.',
    'landing.chat_mode': 'Modalità Chat',
    'landing.chat_time': '5 min per round',
    'landing.chat_desc': 'Prima le parole. Scambia messaggi, emoji e rompighiaccio AI. Bassa pressione, alta scintilla.',
    'landing.video_mode': 'Modalità Webcam',
    'landing.video_time': '3 min per round',
    'landing.video_desc': 'Occhi su. Round video faccia a faccia rapidi con muto, segnala e un overlay di fine round fluido.',
    'landing.from_rounds': 'Dai round',
    'landing.people_met': 'Persone che si sono davvero incontrate.',
    'landing.cta_title': 'Il tuo prossimo round inizia in secondi.',
    'landing.cta_desc': 'Profili verificati, uscite istantanee, zero condivisione numeri di telefono. Solo vibes.',
    'landing.enter_lobby_2': 'Entra nella lobby',
    'matches.online_now': '● online ora',
    'room.disconnected': 'disconnesso',
    'room.online': '● online',
    'room.offline': 'offline',
    'app.name': 'Giogo',
    'app.title': 'Giogo — Stanze Live di Speed Dating',
    'app.footer': '© {year} Giogo. Fatto per connessioni reali.',
    'root.404': 'Questo round non esiste.',
    'root.back_home': 'Torna alla home',
    'root.error': 'Qualcosa è andato storto',
    'root.try_again': 'Riprova',
    'change_language': 'Cambia lingua',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('it');

  const t = (key: string) => {
    const translation = translations[language][key as keyof typeof translations[typeof language]];
    return translation || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}