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
import { requireAuth } from "@/lib/auth";

type Search = {
  mode: "chat" | "webcam";
  kind: "global" | "local";
  lang?: string;
  event?: string;
  radius?: number;
};

export const Route = createFileRoute("/room")({
  beforeLoad: requireAuth,
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "webcam" ? "webcam" : "chat",
    kind: s.kind === "local" ? "local" : "global",
    lang: typeof s.lang === "string" ? s.lang : "Italiano",
    event: typeof s.event === "string" ? s.event : undefined,
    radius: typeof s.radius === "number" ? s.radius : Number(s.radius) || undefined,
  }),
  component: Room,
});

type ParticipantStatus = "active" | "pending" | "removed";

type Participant = {
  id: string;
  name: string;
  age: number;
  bio: string;
  interests: string[];
  color: string;
  status: ParticipantStatus;
};

type RoundPlan = {
  pairs: [string, string][];
  waitingId?: string | null;
};

const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: "u0",
    name: "Tu",
    age: 27,
    bio: "Sempre pronto per la prossima chiacchierata.",
    interests: ["Viaggi", "Musica", "Sport"],
    color: "from-slate-500 to-slate-700",
    status: "active",
  },
  {
    id: "u1",
    name: "Mia",
    age: 26,
    bio: "Architect, rooftop chaser, oat-flat-white loyalist.",
    interests: ["Design", "Hiking", "Vinyl"],
    color: "from-rose-500 to-pink-500",
    status: "active",
  },
  {
    id: "u2",
    name: "Noah",
    age: 28,
    bio: "Climber turned indoor plant dad. Espresso > sleep.",
    interests: ["Climbing", "Coffee", "Books"],
    color: "from-cyan-400 to-blue-500",
    status: "active",
  },
  {
    id: "u3",
    name: "Léa",
    age: 24,
    bio: "Plays bass in a band you haven't heard of.",
    interests: ["Music", "Film", "Ramen"],
    color: "from-fuchsia-500 to-purple-500",
    status: "active",
  },
  {
    id: "u4",
    name: "Ethan",
    age: 30,
    bio: "Founder, runner, terrible at cooking.",
    interests: ["Startups", "Running", "Travel"],
    color: "from-amber-400 to-rose-500",
    status: "active",
  },
  {
    id: "u5",
    name: "Zoe",
    age: 29,
    bio: "Digital nomad with a love for street food.",
    interests: ["Food", "Photo", "Yoga"],
    color: "from-emerald-500 to-teal-500",
    status: "active",
  },
  {
    id: "u6",
    name: "Luca",
    age: 31,
    bio: "Gamer e cinefilo, sempre pronto a consigli seri.",
    interests: ["Gaming", "Cinema", "Coding"],
    color: "from-violet-500 to-indigo-500",
    status: "active",
  },
];

const SCRIPTS = [
  "hey 👋 first round?",
  "wait you climb? what's your favorite spot?",
  "okay best espresso in town, go",
  "ha I'd lose that bet",
  "what brought you to viberound tonight?",
];

const TOTAL_ROUNDS = 4;
const DISCONNECT_DELAY = 12;
const RECONNECT_TIMEOUT = 8;
const PAUSE_DURATION = 4;

function normalizePair(a: string, b: string) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function pairRound(remaining: string[], usedPairs: Set<string>): [string, string][] | null {
  if (remaining.length === 0) return [];
  const [first, ...rest] = remaining;

  for (let i = 0; i < rest.length; i += 1) {
    const second = rest[i];
    const pairKey = normalizePair(first, second);
    if (usedPairs.has(pairKey)) continue;
    const nextRemaining = rest.filter((_, index) => index !== i);
    const nextPairs = pairRound(nextRemaining, usedPairs);
    if (nextPairs) {
      return [[first, second], ...nextPairs];
    }
  }

  return null;
}

function buildRound(
  participantIds: string[],
  usedPairs: Set<string>,
  byeCounts: Record<string, number>,
): RoundPlan | null {
  if (participantIds.length === 0) return { pairs: [] };
  const isOdd = participantIds.length % 2 === 1;

  function tryBuildRound(pool: string[], waitingId?: string | null) {
    const pairs = pairRound(pool, usedPairs);
    return pairs ? { pairs, waitingId } : null;
  }

  if (!isOdd) {
    return tryBuildRound(participantIds, null);
  }

  const byeCandidates = [...participantIds].sort((a, b) => {
    const countA = byeCounts[a] ?? 0;
    const countB = byeCounts[b] ?? 0;
    if (countA !== countB) return countA - countB;
    return a.localeCompare(b);
  });

  for (const waitingId of byeCandidates) {
    const pool = participantIds.filter((id) => id !== waitingId);
    const round = tryBuildRound(pool, waitingId);
    if (round) return round;
  }

  return null;
}

function createFallbackSchedule(participantIds: string[], rounds: number): RoundPlan[] {
  const ids = [...participantIds];
  const useBye = ids.length % 2 === 1;
  if (useBye) ids.push("bye");
  const schedule: RoundPlan[] = [];

  for (let round = 0; round < rounds; round += 1) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < ids.length / 2; i += 1) {
      const a = ids[i];
      const b = ids[ids.length - 1 - i];
      if (a !== "bye" && b !== "bye") {
        pairs.push([a, b]);
      }
    }
    schedule.push({
      pairs,
      waitingId: useBye ? ids[ids.length - 1] : null,
    });
    const rotated = [ids[0], ids[ids.length - 1], ...ids.slice(1, ids.length - 1)];
    ids.splice(0, ids.length, ...rotated);
  }

  return schedule;
}

function generateSchedule(
  participants: Participant[],
  rounds: number,
  usedPairs: Set<string>,
  byeCounts: Record<string, number>,
): RoundPlan[] {
  const activeIds = participants.filter((p) => p.status === "active").map((p) => p.id);
  if (activeIds.length < 2 || rounds <= 0) return [];

  const schedule: RoundPlan[] = [];
  const activeUsedPairs = new Set(usedPairs);
  const activeByeCounts = { ...byeCounts };

  for (let i = 0; i < rounds; i += 1) {
    const round = buildRound(activeIds, activeUsedPairs, activeByeCounts);
    if (!round) {
      return createFallbackSchedule(activeIds, rounds);
    }
    schedule.push(round);
    round.pairs.forEach(([a, b]) => activeUsedPairs.add(normalizePair(a, b)));
    if (round.waitingId) {
      activeByeCounts[round.waitingId] = (activeByeCounts[round.waitingId] ?? 0) + 1;
    }
  }

  return schedule;
}

function Room() {
  const { mode, kind, lang, event, radius } = Route.useSearch();
  const navigate = useNavigate();
  const total = mode === "chat" ? 300 : 180;
  const [round, setRound] = useState(1);
  const [time, setTime] = useState(total);
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [schedule, setSchedule] = useState<RoundPlan[]>(() =>
    generateSchedule(INITIAL_PARTICIPANTS, TOTAL_ROUNDS, new Set(), {}),
  );
  const [usedPairs, setUsedPairs] = useState<Set<string>>(new Set());
  const [byeCounts, setByeCounts] = useState<Record<string, number>>(
    Object.fromEntries(INITIAL_PARTICIPANTS.map((participant) => [participant.id, 0])),
  );
  const [showVote, setShowVote] = useState(false);
  const [pendingDisconnectId, setPendingDisconnectId] = useState<string | null>(null);
  const [hadDisconnect, setHadDisconnect] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  const [waitingMessage, setWaitingMessage] = useState<string | null>(null);
  const [votes, setVotes] = useState<Array<{ name: string; v: "yes" | "no" }>>([]);
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(true);

  // chat state
  const [messages, setMessages] = useState<Array<{ from: "me" | "them" | "system"; text: string }>>(
    [],
  );
  const [draft, setDraft] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const currentPlan = schedule[0];
  const currentUserId = "u0";
  const activeParticipants = participants.filter((p) => p.status !== "removed");
  const currentPartnerId =
    currentPlan?.pairs
      .find((pair) => pair.includes(currentUserId))
      ?.find((id) => id !== currentUserId) ?? null;
  const currentPartner = participants.find((p) => p.id === currentPartnerId) ?? null;
  const currentUserWaiting = currentPlan?.waitingId === currentUserId;
  const pendingParticipant = pendingDisconnectId
    ? participants.find((p) => p.id === pendingDisconnectId)
    : null;
  const isCurrentPartnerDisconnected = Boolean(
    currentPartnerId && pendingDisconnectId === currentPartnerId,
  );
  const effectiveWaitingMessage = waitingMessage
    ? waitingMessage
    : currentUserWaiting
      ? "Attendi il prossimo abbinamento..."
      : null;

  function recordRoundCompletion(roundPlan: RoundPlan) {
    setUsedPairs((prev) => {
      const next = new Set(prev);
      roundPlan.pairs.forEach(([a, b]) => next.add(normalizePair(a, b)));
      return next;
    });
    if (roundPlan.waitingId) {
      setByeCounts((prev) => ({
        ...prev,
        [roundPlan.waitingId!]: (prev[roundPlan.waitingId!] ?? 0) + 1,
      }));
    }
  }

  function rebuildSchedule(currentParticipants: Participant[]) {
    const active = currentParticipants.filter((p) => p.status === "active");
    const remainingRounds = TOTAL_ROUNDS - (round - 1);
    const nextByeCounts = Object.fromEntries(
      active.map((participant) => [participant.id, byeCounts[participant.id] ?? 0]),
    );
    setSchedule(generateSchedule(active, remainingRounds, usedPairs, nextByeCounts));
  }

  function advanceRound() {
    if (!currentPlan) return;
    recordRoundCompletion(currentPlan);
    if (round >= TOTAL_ROUNDS) {
      navigate({
        to: "/matches",
        search: {
          v: votes
            .filter((x) => x.v === "yes")
            .map((x) => x.name)
            .join(","),
        },
      });
      return;
    }
    setRound((r) => r + 1);
    setSchedule((prev) => prev.slice(1));
    setTime(total);
    setShowVote(false);
    setMessages([]);
    setWaitingMessage(null);
  }

  useEffect(() => {
    if (showVote) return;
    if (time <= 0) {
      if (currentUserWaiting) {
        setWaitingMessage("Rotazione completa. Preparati al prossimo abbinamento...");
        advanceRound();
        return;
      }
      if (!currentPartner || isCurrentPartnerDisconnected) return;
      setShowVote(true);
      return;
    }

    const id = setTimeout(() => setTime((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [time, showVote, currentPartner, currentUserWaiting, isCurrentPartnerDisconnected]);

  useEffect(() => {
    if (
      mode !== "chat" ||
      showVote ||
      !currentPartner ||
      isCurrentPartnerDisconnected ||
      currentUserWaiting
    )
      return;
    setMessages([{ from: "them", text: SCRIPTS[0] }]);
    let i = 1;
    const id = setInterval(() => {
      if (i >= SCRIPTS.length) return;
      setMessages((m) => [...m, { from: "them", text: SCRIPTS[i] }]);
      i += 1;
    }, 9000);
    return () => clearInterval(id);
  }, [mode, currentPartnerId, showVote, isCurrentPartnerDisconnected, currentUserWaiting]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (round !== 2 || hadDisconnect || pendingDisconnectId) return;
    const leaveTimeout = setTimeout(() => {
      const candidates = participants.filter(
        (p) => p.status === "active" && p.id !== currentUserId,
      );
      if (!candidates.length) return;
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      setParticipants((prev) =>
        prev.map((participant) =>
          participant.id === target.id ? { ...participant, status: "pending" } : participant,
        ),
      );
      setPendingDisconnectId(target.id);
      setReconnectCountdown(RECONNECT_TIMEOUT);
      setWaitingMessage(`${target.name} si è disconnesso, sto provando a riconnetterlo...`);
    }, DISCONNECT_DELAY * 1000);
    return () => clearTimeout(leaveTimeout);
  }, [round, hadDisconnect, pendingDisconnectId, participants]);

  useEffect(() => {
    if (reconnectCountdown === null || pendingDisconnectId === null) return;
    if (reconnectCountdown <= 0) {
      const currentRound = currentPlan;
      setParticipants((prev) =>
        prev.map((participant) =>
          participant.id === pendingDisconnectId
            ? { ...participant, status: "removed" }
            : participant,
        ),
      );
      setPendingDisconnectId(null);
      setHadDisconnect(true);
      setWaitingMessage("Il partecipante non si è riconnesso e verrà rimosso dalla sessione.");
      if (currentRound) {
        recordRoundCompletion(currentRound);
      }
      const updatedActive = participants.filter(
        (participant) => participant.status === "active" && participant.id !== pendingDisconnectId,
      );
      rebuildSchedule(updatedActive);
      setReconnectCountdown(null);
      return;
    }

    const tick = setTimeout(
      () => setReconnectCountdown((count) => (count !== null ? count - 1 : null)),
      1000,
    );
    return () => clearTimeout(tick);
  }, [reconnectCountdown, pendingDisconnectId, currentPlan, participants]);

  function vote(v: "yes" | "no") {
    const next = [...votes, { name: currentPartner?.name ?? "Unknown", v }];
    setVotes(next);
    advanceRound();
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
          {(effectiveWaitingMessage || isCurrentPartnerDisconnected) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-secondary"
            >
              <div className="font-medium">
                {effectiveWaitingMessage ?? "Attendi il prossimo abbinamento..."}
              </div>
              {reconnectCountdown !== null && (
                <div className="mt-2 text-xs text-secondary/80">
                  Riconnessione in corso: {reconnectCountdown}s
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* main area */}
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_320px]">
          {mode === "webcam" ? (
            currentPartner && !isCurrentPartnerDisconnected ? (
              <div className="glass-strong relative aspect-video w-full overflow-hidden rounded-3xl">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${currentPartner.color} opacity-80`}
                />
                <div className="absolute inset-0 grid place-items-center text-7xl font-display font-semibold text-white/90">
                  {currentPartner.name[0]}
                </div>
                <div className="absolute bottom-3 left-3 glass rounded-full px-3 py-1 text-xs">
                  {currentPartner.name}, {currentPartner.age}
                </div>
                <div className="absolute bottom-3 right-3 h-24 w-32 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-700 to-slate-900">
                  <div className="grid h-full place-items-center text-xs text-muted-foreground">
                    {camOn ? "you" : <VideoOff className="h-4 w-4" />}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-strong flex h-[520px] flex-col items-center justify-center rounded-3xl p-8 text-center">
                <div className="text-5xl">⏳</div>
                <h2 className="mt-5 text-2xl font-semibold">
                  {currentUserWaiting ? "Sei in attesa" : "Nessun abbinamento attivo"}
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {effectiveWaitingMessage ??
                    "Il sistema sta ricalcolando gli abbinamenti per il prossimo round."}
                </p>
              </div>
            )
          ) : currentPartner && !isCurrentPartnerDisconnected ? (
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
          ) : (
            <div className="glass-strong flex h-[520px] flex-col items-center justify-center rounded-3xl p-8 text-center">
              <div className="text-5xl">⏳</div>
              <h2 className="mt-5 text-2xl font-semibold">Attendi il prossimo abbinamento</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {effectiveWaitingMessage ?? "Ti ricolloco nel prossimo round non appena possibile."}
              </p>
            </div>
          )}

          <div className="glass-strong rounded-3xl p-6">
            {currentPartner ? (
              <>
                <div
                  className={`mb-4 h-32 w-full rounded-2xl bg-gradient-to-br ${currentPartner.color}`}
                />
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-semibold">
                    {currentPartner.name}, {currentPartner.age}
                  </h3>
                  <span className="text-xs text-secondary">
                    {currentPartner.status === "pending" ? "disconnesso" : "● online"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{currentPartner.bio}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {currentPartner.interests.map((t) => (
                    <span key={t} className="rounded-full bg-white/5 px-3 py-1 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-5 glass rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Sparkles className="h-3.5 w-3.5" /> Icebreaker
                  </div>
                  <p className="mt-1 text-sm">
                    "What's the most spontaneous thing you did this year?"
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-3xl p-4 text-center">
                <div className="text-4xl">🕒</div>
                <h3 className="mt-4 text-xl font-semibold">In attesa del prossimo abbinamento</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Il sistema sta gestendo una rotazione dinamica dei partecipanti.
                </p>
              </div>
            )}

            <div className="mt-6 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm uppercase tracking-wide text-muted-foreground">
                  Partecipanti
                </h4>
                <span className="text-xs text-secondary">{activeParticipants.length} attivi</span>
              </div>
              <div className="mt-3 grid gap-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${
                      participant.status === "removed"
                        ? "border-red-500/20 bg-red-500/5 text-red-300"
                        : participant.status === "pending"
                          ? "border-amber-500/20 bg-amber-500/5 text-amber-200"
                          : "border-white/10 bg-white/5 text-white"
                    }`}
                  >
                    <div>
                      <div className="font-medium">
                        {participant.id === currentUserId ? "Tu" : participant.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {participant.id === currentUserId
                          ? "sei tu"
                          : participant.status === "pending"
                            ? "riconnessione..."
                            : participant.status === "removed"
                              ? "rimosso"
                              : currentPlan?.waitingId === participant.id
                                ? "in attesa"
                                : "in gioco"}
                      </div>
                    </div>
                    {participant.status !== "removed" && (
                      <div className="text-[10px] uppercase tracking-[0.18em] text-secondary">
                        {participant.status === "pending" ? "offline" : "online"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
              <h2 className="mt-2 text-2xl font-semibold">
                What about {currentPartner?.name ?? "il partecipante"}?
              </h2>
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
