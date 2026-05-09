import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Heart, Send, Sparkles } from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { useLanguage } from "@/lib/language";

const ALL = [
  { name: "Mia", age: 26, color: "from-rose-500 to-pink-500", last: "okay best espresso in town, go" },
  { name: "Noah", age: 28, color: "from-cyan-400 to-blue-500", last: "rooftop next round? 😄" },
  { name: "Léa", age: 24, color: "from-fuchsia-500 to-purple-500", last: "send me that playlist" },
];

type Search = { v?: string };

export const Route = createFileRoute("/matches")({
  validateSearch: (s: Record<string, unknown>): Search => ({ v: typeof s.v === "string" ? s.v : "" }),
  component: Matches,
});

function Matches() {
  const { v } = Route.useSearch();
  const yes = (v ?? "").split(",").filter(Boolean);
  // mock mutuals: anyone you said yes to has a 70% chance of mutual
  const mutuals = ALL.filter(p => yes.includes(p.name)).slice(0, Math.max(1, Math.ceil(yes.length * 0.7)));
  const [active, setActive] = useState<string | null>(mutuals[0]?.name ?? null);
  const current = mutuals.find(m => m.name === active);

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="glass mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Round complete
          </div>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
            You have <span className="text-gradient">{mutuals.length} mutual {mutuals.length === 1 ? "match" : "matches"}</span>.
          </h1>
          <p className="mt-3 text-muted-foreground">Their chats are unlocked. Don't ghost.</p>
        </motion.div>

        {mutuals.length === 0 ? (
          <div className="glass-strong mx-auto mt-12 max-w-md rounded-3xl p-10 text-center">
            <p className="text-muted-foreground">No mutuals this time. The next round starts in seconds.</p>
            <Link to="/dashboard" className="mt-6 inline-flex rounded-full gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow">
              Try another round
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {mutuals.map((m, i) => (
                <motion.button
                  key={m.name}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                  onClick={() => setActive(m.name)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${active === m.name ? "glass-strong ring-1 ring-primary" : "glass hover:bg-white/[0.07]"}`}
                >
                  <div className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${m.color} font-semibold text-white`}>{m.name[0]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{m.name}</span>
                      <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{m.last}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            {current && <PrivateChat name={current.name} color={current.color} />}
          </div>
        )}
      </main>
    </div>
  );
}

function PrivateChat({ name, color }: { name: string; color: string }) {
  const [msgs, setMsgs] = useState<Array<{ from: "me" | "them"; text: string }>>([
    { from: "them", text: `hey! glad we matched 🔥` },
  ]);
  const [draft, setDraft] = useState("");

  function send() {
    if (!draft.trim()) return;
    setMsgs((m) => [...m, { from: "me", text: draft.trim() }]);
    setDraft("");
    setTimeout(() => setMsgs((m) => [...m, { from: "them", text: "haha okay you've got my attention 😄" }]), 1200);
  }

  return (
    <motion.div key={name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-strong flex h-[560px] flex-col rounded-3xl">
      <div className="flex items-center gap-3 border-b border-white/5 p-4">
        <div className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${color} font-semibold text-white`}>{name[0]}</div>
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-secondary">● online now</div>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.from === "me" ? "gradient-primary text-primary-foreground" : "glass"}`}>{m.text}</div>
          </motion.div>
        ))}
      </div>
      <div className="border-t border-white/5 p-3">
        <div className="glass flex items-center gap-2 rounded-full p-1.5 pl-4">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Message ${name}...`}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={send} className="grid h-9 w-9 place-items-center rounded-full gradient-primary text-primary-foreground">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
