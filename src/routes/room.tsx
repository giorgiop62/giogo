import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Flag, Globe2, Heart, Loader2, MapPin, Mic, MicOff, Send, Sparkles, X } from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { getCurrentUser, requireAuth, type AuthUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Search = {
  mode: "chat" | "voice";
  kind: "global" | "local";
  lang?: string;
  participants?: number;
  radius?: number;
};

export const Route = createFileRoute("/room")({
  beforeLoad: requireAuth,
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "voice" ? "voice" : "chat",
    kind: s.kind === "local" ? "local" : "global",
    lang: typeof s.lang === "string" ? s.lang : undefined,
    participants:
      typeof s.participants === "number" ? s.participants : Number(s.participants) || undefined,
    radius: typeof s.radius === "number" ? s.radius : Number(s.radius) || undefined,
  }),
  component: Room,
});

type Profile = Tables<"profiles"> & { distance_km?: number };

function Room() {
  const { mode, kind, lang, participants: requiredParticipants, radius } = Route.useSearch();
  const navigate = useNavigate();
  const total = mode === "chat" ? 300 : 180;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [sessionProfiles, setSessionProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(total);
  const [showVote, setShowVote] = useState(false);
  const [muted, setMuted] = useState(false);
  const [messages, setMessages] = useState<Array<{ from: "me" | "system"; text: string }>>([]);
  const [draft, setDraft] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const currentUser = await getCurrentUser();
      if (!alive) return;
      setUser(currentUser);
      if (!currentUser) return;

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();
      if (!currentProfile) {
        setLoading(false);
        return;
      }
      setMe(currentProfile);

      if (kind === "local" && currentProfile.latitude && currentProfile.longitude) {
        const { data } = await supabase.rpc("nearby_profiles", {
          origin_lat: currentProfile.latitude,
          origin_lng: currentProfile.longitude,
          radius_km: radius ?? 50,
        });
        const pool = (data ?? []) as Profile[];
        if (alive) {
          setSessionProfiles([currentProfile, ...pool].slice(0, 20));
          setPartner(pool[0] ?? null);
        }
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .neq("id", currentUser.id)
          .contains("spoken_languages", lang ? [lang] : [])
          .limit(requiredParticipants ?? 10);
        const pool = data ?? [];
        if (alive) {
          setSessionProfiles([currentProfile, ...pool].slice(0, requiredParticipants ?? 10));
          setPartner(pool.length + 1 >= (requiredParticipants ?? 10) ? (pool[0] ?? null) : null);
        }
      }
      if (alive) setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
  }, [kind, lang, radius, requiredParticipants]);

  useEffect(() => {
    if (loading || !partner || showVote) return;
    if (time <= 0) {
      setShowVote(true);
      return;
    }
    const id = setTimeout(() => setTime((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [loading, partner, showVote, time]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function voteYes() {
    if (!user || !partner) return;
    const { error } = await supabase.from("match_requests").upsert({
      requester_id: user.id,
      requested_id: partner.id,
      source: "round",
    });
    if (error) {
      toast.error("Match non salvato", { description: error.message });
      return;
    }
    toast.success("Interesse salvato. Se è reciproco comparirà nei Matches.");
    navigate({ to: "/matches" });
  }

  function voteNo() {
    navigate({ to: "/dashboard" });
  }

  function send() {
    if (!draft.trim()) return;
    setMessages((current) => [...current, { from: "me", text: draft.trim() }]);
    setDraft("");
  }

  const mm = String(Math.floor(time / 60)).padStart(2, "0");
  const ss = String(time % 60).padStart(2, "0");
  const pct = (time / total) * 100;

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            {kind === "global" ? (
              <Globe2 className="h-3.5 w-3.5 text-secondary" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-secondary" />
            )}
            {kind === "global" ? `Globale · ${lang ?? "Italiano"}` : `Locale · ${radius ?? 50} km`}
          </div>
          <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            {mode === "voice" ? (
              <Mic className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Send className="h-3.5 w-3.5 text-primary" />
            )}
            {mode === "voice" ? "Vocale · 3 min" : "Chat · 5 min"}
          </div>
        </div>

        <div className="glass flex items-center justify-between rounded-full p-2 pl-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Round live</div>
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

        {loading ? (
          <div className="mt-8 flex items-center gap-2 rounded-3xl glass p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cerco un profilo reale...
          </div>
        ) : !partner ? (
          <div className="glass-strong mt-8 rounded-3xl p-10 text-center">
            <h1 className="text-3xl font-semibold">
              {kind === "global"
                ? "Sessione non ancora completa."
                : "Nessun profilo disponibile ora."}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {kind === "global"
                ? `Servono ${requiredParticipants ?? 10} partecipanti reali per partire. Ora: ${sessionProfiles.length}/${requiredParticipants ?? 10}.`
                : "Attiva la posizione o prova la modalità globale."}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_320px]">
            {mode === "voice" ? (
              <div className="glass-strong flex h-[520px] flex-col items-center justify-center rounded-3xl p-8 text-center">
                <div className="grid h-28 w-28 place-items-center rounded-full gradient-primary shadow-glow">
                  {muted ? (
                    <MicOff className="h-10 w-10 text-primary-foreground" />
                  ) : (
                    <Mic className="h-10 w-10 text-primary-foreground" />
                  )}
                </div>
                <h2 className="mt-6 text-3xl font-semibold">
                  Audio live con {partner.display_name}
                </h2>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  Sessione vocale simulata lato UI: la struttura persistente `voice_sessions` è
                  pronta per collegare il provider realtime/audio.
                </p>
                <button
                  onClick={() => setMuted((value) => !value)}
                  className="mt-8 rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold"
                >
                  {muted ? "Riattiva microfono" : "Disattiva microfono"}
                </button>
              </div>
            ) : (
              <div className="glass-strong flex h-[520px] flex-col rounded-3xl">
                <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto p-5">
                  <div className="rounded-2xl border border-secondary/20 bg-secondary/10 px-4 py-3 text-sm text-secondary">
                    Rompi il ghiaccio con {partner.display_name}. La chat del round dura 5 minuti.
                  </div>
                  {messages.map((message, index) => (
                    <div key={index} className="flex justify-end">
                      <div className="max-w-[75%] rounded-2xl gradient-primary px-4 py-2 text-sm text-primary-foreground">
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/5 p-3">
                  <div className="glass flex items-center gap-2 rounded-full p-1.5 pl-4">
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && send()}
                      placeholder="Scrivi qualcosa..."
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

            <aside className="glass-strong rounded-3xl p-6">
              {partner.profile_photo_url ? (
                <img
                  src={partner.profile_photo_url}
                  alt={partner.display_name}
                  className="mb-4 aspect-square w-full rounded-2xl object-cover"
                />
              ) : (
                <div
                  className={`mb-4 grid aspect-square w-full place-items-center rounded-2xl bg-gradient-to-br ${partner.avatar_color} text-6xl font-semibold`}
                >
                  {partner.display_name[0]}
                </div>
              )}
              <h3 className="text-2xl font-semibold">
                {partner.display_name}
                {partner.age ? `, ${partner.age}` : ""}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{partner.city ?? "Giogo"}</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {partner.bio ?? "Profilo essenziale in aggiornamento."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(partner.interests ?? []).slice(0, 5).map((interest) => (
                  <span key={interest} className="rounded-full bg-white/5 px-3 py-1 text-xs">
                    {interest}
                  </span>
                ))}
              </div>
              <div className="mt-5 glass rounded-2xl p-3">
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <Sparkles className="h-3.5 w-3.5" /> Prompt
                </div>
                <p className="mt-1 text-sm">
                  {partner.prompt_spontaneous ||
                    partner.prompt_love ||
                    "Qual è una cosa che ami fare?"}
                </p>
              </div>
            </aside>
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2">
          <button className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.05]">
            <Flag className="h-4 w-4" />
          </button>
          {partner ? (
            <button
              onClick={() => setShowVote(true)}
              className="rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Termina e vota
            </button>
          ) : null}
        </div>
      </main>

      <AnimatePresence>
        {showVote && partner ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-strong w-full max-w-md rounded-3xl p-8 text-center"
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Round ended</p>
              <h2 className="mt-2 text-2xl font-semibold">Ti interessa {partner.display_name}?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Il match permanente appare solo se l'interesse è reciproco.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <button
                  onClick={voteNo}
                  className="grid h-20 w-20 place-items-center rounded-full glass hover:bg-white/10"
                >
                  <X className="h-7 w-7 text-muted-foreground" />
                </button>
                <button
                  onClick={voteYes}
                  className="grid h-20 w-20 place-items-center rounded-full gradient-primary shadow-glow"
                >
                  <Heart className="h-7 w-7 fill-white text-white" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
