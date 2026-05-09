import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  X,
  Send,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Flag,
  Sparkles,
  Globe2,
  MapPin,
  Shuffle,
} from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";

type Search = {
  mode: "chat" | "webcam";
  kind: "global" | "local";
  lang?: string;
  event?: string;
  radius?: number;
};

export const Route = createFileRoute("/room")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "webcam" ? "webcam" : "chat",
    kind: s.kind === "local" ? "local" : "global",
    lang: typeof s.lang === "string" ? s.lang : "Italiano",
    event: typeof s.event === "string" ? s.event : undefined,
    radius: typeof s.radius === "number" ? s.radius : Number(s.radius) || undefined,
  }),
  component: Room,
});

const PARTNERS = [
  {
    name: "Mia",
    age: 26,
    bio: "Architect, rooftop chaser, oat-flat-white loyalist.",
    interests: ["Design", "Hiking", "Vinyl"],
    color: "from-rose-500 to-pink-500",
  },
  {
    name: "Noah",
    age: 28,
    bio: "Climber turned indoor plant dad. Espresso > sleep.",
    interests: ["Climbing", "Coffee", "Books"],
    color: "from-cyan-400 to-blue-500",
  },
  {
    name: "Léa",
    age: 24,
    bio: "Plays bass in a band you haven't heard of.",
    interests: ["Music", "Film", "Ramen"],
    color: "from-fuchsia-500 to-purple-500",
  },
  {
    name: "Ethan",
    age: 30,
    bio: "Founder, runner, terrible at cooking.",
    interests: ["Startups", "Running", "Travel"],
    color: "from-amber-400 to-rose-500",
  },
];

const SCRIPTS = [
  "hey 👋 first round?",
  "wait you climb? what's your favorite spot?",
  "okay best espresso in town, go",
  "ha I'd lose that bet",
  "what brought you to viberound tonight?",
];

function Room() {
  const { mode, kind, lang, event, radius } = Route.useSearch();
  const navigate = useNavigate();
  const total = mode === "chat" ? 300 : 180;
  const [round, setRound] = useState(1);
  const [time, setTime] = useState(total);
  const [partner, setPartner] = useState(PARTNERS[0]);
  const [showVote, setShowVote] = useState(false);
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [votes, setVotes] = useState<Array<{ name: string; v: "yes" | "no" }>>([]);
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(true);

  // chat state
  const [messages, setMessages] = useState<Array<{ from: "me" | "them" | "system"; text: string }>>(
    [],
  );
  const [draft, setDraft] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  // timer
  useEffect(() => {
    if (showVote) return;
    if (time <= 0) {
      setShowVote(true);
      return;
    }
    const id = setTimeout(() => setTime((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [time, showVote]);

  // mock incoming chat
  useEffect(() => {
    if (mode !== "chat" || showVote) return;
    setMessages([{ from: "them", text: SCRIPTS[0] }]);
    let i = 1;
    const id = setInterval(() => {
      if (i >= SCRIPTS.length) return;
      setMessages((m) => [...m, { from: "them", text: SCRIPTS[i] }]);
      i++;
    }, 9000);
    return () => clearInterval(id);
  }, [mode, partner, showVote]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (showVote || round !== 2) return;
    const id = setTimeout(() => {
      setPartnerLeft(true);
      if (mode === "chat") {
        setMessages((m) => [
          ...m,
          {
            from: "system",
            text: "L'utente è uscito dalla sessione, attendi il prossimo abbinamento.",
          },
        ]);
      }
    }, 12000);
    const recover = setTimeout(() => {
      setPartnerLeft(false);
      setPartner(PARTNERS[round]);
      setMessages([]);
    }, 16000);
    return () => {
      clearTimeout(id);
      clearTimeout(recover);
    };
  }, [round, showVote, mode]);

  function vote(v: "yes" | "no") {
    const next = [...votes, { name: partner.name, v }];
    setVotes(next);
    if (round >= 4) {
      navigate({
        to: "/matches",
        search: {
          v: next
            .filter((x) => x.v === "yes")
            .map((x) => x.name)
            .join(","),
        },
      });
      return;
    }
    setRound(round + 1);
    setPartner(PARTNERS[round]); // next partner
    setTime(total);
    setMessages([]);
    setPartnerLeft(false);
    setShowVote(false);
  }

  function send() {
    if (!draft.trim()) return;
    setMessages((m) => [...m, { from: "me", text: draft.trim() }]);
    setDraft("");
  }

  const mm = String(Math.floor(time / 60)).padStart(2, "0");
  const ss = String(time % 60).padStart(2, "0");
  const pct = (time / total) * 100;

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-4xl px-4 pb-12 pt-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            {kind === "global" ? (
              <Globe2 className="h-3.5 w-3.5 text-secondary" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-secondary" />
            )}
            {kind === "global"
              ? `Globale · ${lang}`
              : `${event ?? "Evento locale"} · ${radius ?? 50} km`}
          </div>
          <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            <Shuffle className="h-3.5 w-3.5 text-primary" />
            4-20 partecipanti · rotazioni automatiche
          </div>
        </div>

        {/* timer + round */}
        <div className="glass flex items-center justify-between rounded-full p-2 pl-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Round {round} / 4
          </div>
          <div className="flex items-center gap-3">
            <div className="font-display text-2xl font-semibold tabular-nums">
              {mm}:{ss}
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground shadow-glow">
              {Math.ceil(time)}
            </div>
          </div>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full gradient-primary"
            animate={{ width: `${pct}%` }}
            transition={{ ease: "linear" }}
          />
        </div>

        <AnimatePresence>
          {partnerLeft && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-secondary"
            >
              L'utente è uscito dalla sessione, attendi il prossimo abbinamento.
            </motion.div>
          )}
        </AnimatePresence>

        {/* main area */}
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_320px]">
          {mode === "webcam" ? (
            <div className="glass-strong relative aspect-video w-full overflow-hidden rounded-3xl">
              <div className={`absolute inset-0 bg-gradient-to-br ${partner.color} opacity-80`} />
              <div className="absolute inset-0 grid place-items-center text-7xl font-display font-semibold text-white/90">
                {partner.name[0]}
              </div>
              <div className="absolute bottom-3 left-3 glass rounded-full px-3 py-1 text-xs">
                {partner.name}, {partner.age}
              </div>
              {/* self preview */}
              <div className="absolute bottom-3 right-3 h-24 w-32 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-700 to-slate-900">
                <div className="grid h-full place-items-center text-xs text-muted-foreground">
                  {camOn ? "you" : <VideoOff className="h-4 w-4" />}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-strong flex h-[520px] flex-col rounded-3xl">
              <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto p-5">
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                          m.from === "me"
                            ? "gradient-primary text-primary-foreground"
                            : m.from === "system"
                              ? "border border-secondary/20 bg-secondary/10 text-secondary"
                              : "glass"
                        }`}
                      >
                        {m.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="border-t border-white/5 p-3">
                <div className="glass flex items-center gap-2 rounded-full p-1.5 pl-4">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Say hi..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={send}
                    className="grid h-9 w-9 place-items-center rounded-full gradient-primary text-primary-foreground"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* partner card */}
          <div className="glass-strong rounded-3xl p-6">
            <div className={`mb-4 h-32 w-full rounded-2xl bg-gradient-to-br ${partner.color}`} />
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">
                {partner.name}, {partner.age}
              </h3>
              <span className="text-xs text-secondary">● online</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{partner.bio}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {partner.interests.map((t) => (
                <span key={t} className="rounded-full bg-white/5 px-3 py-1 text-xs">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-5 glass rounded-2xl p-3">
              <div className="flex items-center gap-2 text-xs text-secondary">
                <Sparkles className="h-3.5 w-3.5" /> Icebreaker
              </div>
              <p className="mt-1 text-sm">"What's the most spontaneous thing you did this year?"</p>
            </div>
          </div>
        </div>

        {/* controls */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {mode === "webcam" && (
            <>
              <Ctrl onClick={() => setMuted(!muted)} active={muted}>
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Ctrl>
              <Ctrl onClick={() => setCamOn(!camOn)} active={!camOn}>
                {camOn ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Ctrl>
            </>
          )}
          <Ctrl>
            <Flag className="h-4 w-4" />
          </Ctrl>
        </div>
      </main>

      <AnimatePresence>
        {showVote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-xl px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-strong w-full max-w-md rounded-3xl p-8 text-center"
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Round {round} ended
              </p>
              <h2 className="mt-2 text-2xl font-semibold">What about {partner.name}?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your answer stays secret until results.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => vote("no")}
                  className="grid h-20 w-20 place-items-center rounded-full glass hover:bg-white/10"
                >
                  <X className="h-7 w-7 text-muted-foreground" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => vote("yes")}
                  className="grid h-20 w-20 place-items-center rounded-full gradient-primary shadow-glow animate-pulse-glow"
                >
                  <Heart className="h-7 w-7 fill-white text-white" />
                </motion.button>
              </div>
              <div className="mt-6 flex justify-center gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-6 rounded-full ${i <= round ? "gradient-primary" : "bg-white/10"}`}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Ctrl({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`grid h-11 w-11 place-items-center rounded-full transition-colors ${active ? "bg-destructive/80 text-destructive-foreground" : "glass hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}
