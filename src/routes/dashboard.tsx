import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  MessageCircle,
  Video,
  Users,
  Loader2,
  X,
  Sparkles,
  Plus,
  Globe2,
  MapPin,
  Languages,
} from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

type Mode = "chat" | "webcam";
type SessionKind = "global" | "local";
type Language = "Italiano" | "English" | "Español";

const FAKE_QUEUE = [
  { name: "Mia", age: 26, color: "from-rose-500 to-pink-500" },
  { name: "Noah", age: 28, color: "from-cyan-400 to-blue-500" },
  { name: "Léa", age: 24, color: "from-fuchsia-500 to-purple-500" },
  { name: "Ethan", age: 30, color: "from-amber-400 to-rose-500" },
  { name: "Sofia", age: 27, color: "from-emerald-400 to-cyan-500" },
  { name: "Aman", age: 31, color: "from-indigo-400 to-fuchsia-500" },
];

function Dashboard() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [sessionKind, setSessionKind] = useState<SessionKind>("global");
  const [language, setLanguage] = useState<Language>("Italiano");
  const [localEvent, setLocalEvent] = useState("Napoletani ad Arezzo");
  const [radiusKm, setRadiusKm] = useState(25);
  const [queueing, setQueueing] = useState(false);
  const [count, setCount] = useState(2);
  const navigate = useNavigate();

  useEffect(() => {
    if (!queueing) return;
    const grow = setInterval(() => {
      setCount((c) => {
        const next = Math.min(8, c + 1);
        return next >= 4 && next % 2 === 1 ? next + 1 : next;
      });
    }, 1400);
    return () => clearInterval(grow);
  }, [queueing]);

  useEffect(() => {
    if (queueing && count >= 4 && count % 2 === 0) {
      const t = setTimeout(
        () =>
          navigate({
            to: "/room",
            search: {
              mode: mode!,
              kind: sessionKind,
              lang: language,
              event: sessionKind === "local" ? localEvent : undefined,
              radius: sessionKind === "local" ? radiusKm : undefined,
            },
          }),
        1600,
      );
      return () => clearTimeout(t);
    }
  }, [count, queueing, mode, sessionKind, language, localEvent, radiusKm, navigate]);

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-widest text-primary">Lobby live</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">
            Scegli la stanza, poi entra nel round.
          </h1>
          <p className="mt-3 text-muted-foreground">
            La sessione parte solo con almeno 4 persone e un numero pari di partecipanti
            compatibili.
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate({ to: "/create-event" })}
          className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.07]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full gradient-primary text-primary-foreground shadow-glow">
            <Plus className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Crea il tuo evento</span>
            <span className="block text-xs text-muted-foreground">
              Tema, filtri, invita persone vicine
            </span>
          </span>
          <span className="text-xs text-primary">Nuovo →</span>
        </motion.button>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <SessionButton
            active={sessionKind === "global"}
            onClick={() => setSessionKind("global")}
            icon={<Globe2 className="h-5 w-5" />}
            title="Globale"
            desc="Match nel mondo con persone che parlano la stessa lingua."
          />
          <SessionButton
            active={sessionKind === "local"}
            onClick={() => setSessionKind("local")}
            icon={<MapPin className="h-5 w-5" />}
            title="Evento locale"
            desc="Stanza con raggio geografico, interessi e tema personalizzato."
          />
        </div>

        <div className="mt-4 glass rounded-3xl p-5">
          {sessionKind === "global" ? (
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Languages className="h-4 w-4 text-secondary" />
                Lingua della sessione
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["Italiano", "English", "Español"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setLanguage(item)}
                    className={`rounded-2xl border px-4 py-3 text-sm transition ${
                      language === item
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <input
                value={localEvent}
                onChange={(e) => setLocalEvent(e.target.value)}
                placeholder="Nome evento"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
              />
              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
                  <span>Raggio massimo</span>
                  <span>{radiusKm} km</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ModeButton
            active={mode === "chat"}
            onClick={() => setMode("chat")}
            icon={<MessageCircle className="h-5 w-5" />}
            title="Chat Mode"
            time="5 min · round obbligatorio"
            desc="Conversazioni testuali a tempo, voto privato solo alla fine."
            tone="primary"
          />
          <ModeButton
            active={mode === "webcam"}
            onClick={() => setMode("webcam")}
            icon={<Video className="h-5 w-5" />}
            title="Webcam Mode"
            time="3 min · round obbligatorio"
            desc="Incontri faccia a faccia, microfono e videocamera controllabili."
            tone="cool"
          />
        </div>

        <motion.button
          disabled={!mode}
          onClick={() => setQueueing(true)}
          whileTap={{ scale: 0.98 }}
          className="mt-8 w-full rounded-full gradient-primary py-4 font-semibold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none"
        >
          {mode ? `Entra in coda ${mode === "chat" ? "Chat" : "Webcam"}` : "Scegli chat o webcam"}
        </motion.button>

        <div className="mt-12 glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium">Partecipanti compatibili</span>
            </div>
            <span className="text-xs text-muted-foreground">min 4 · max 20 · pari</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {FAKE_QUEUE.slice(0, queueing ? count : 2).map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass flex items-center gap-2 rounded-full py-1 pl-1 pr-3"
              >
                <div
                  className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br ${p.color} text-xs font-semibold text-white`}
                >
                  {p.name[0]}
                </div>
                <span className="text-xs">
                  {p.name}, {p.age}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {queueing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-xl px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-strong relative w-full max-w-md rounded-3xl p-8 text-center"
            >
              <button
                onClick={() => {
                  setQueueing(false);
                  setCount(2);
                }}
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full gradient-primary shadow-glow animate-pulse-glow">
                {count >= 4 && count % 2 === 0 ? (
                  <Sparkles className="h-8 w-8 text-white" />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                )}
              </div>
              <h2 className="mt-6 text-2xl font-semibold">
                {count >= 4 && count % 2 === 0 ? "Stanza pronta" : "Bilanciamento in corso"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {count >= 4 && count % 2 === 0
                  ? "Partenza tra un momento"
                  : `${count}/4 pronti · serve un numero pari`}
              </p>
              <div className="mt-6 flex justify-center -space-x-2">
                {FAKE_QUEUE.slice(0, count).map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, x: -10 }}
                    animate={{ scale: 1, x: 0 }}
                    className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${p.color} text-xs font-semibold text-white ring-2 ring-background`}
                  >
                    {p.name[0]}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SessionButton({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={`rounded-3xl p-5 text-left transition ${
        active ? "glass-strong ring-2 ring-secondary" : "glass hover:bg-white/[0.07]"
      }`}
    >
      <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-cool text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </motion.button>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  title,
  time,
  desc,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  time: string;
  desc: string;
  tone: "primary" | "cool";
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={`relative overflow-hidden rounded-3xl p-6 text-left transition-all ${active ? "glass-strong ring-2 ring-primary" : "glass hover:bg-white/[0.07]"}`}
    >
      {active && (
        <motion.div
          layoutId="mode-glow"
          className={`absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-60 blur-2xl ${tone === "primary" ? "gradient-primary" : "gradient-cool"}`}
        />
      )}
      <div
        className={`grid h-11 w-11 place-items-center rounded-2xl ${tone === "primary" ? "gradient-primary" : "gradient-cool"} text-primary-foreground`}
      >
        {icon}
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-xl font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </motion.button>
  );
}
