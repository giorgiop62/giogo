import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Flag,
  Globe2,
  Heart,
  MapPin,
  MessageCircle,
  Mic,
  MicOff,
  Radio,
  Send,
  Sparkles,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { FloatingBackground } from "@/components/viberound/Background";
import { Nav } from "@/components/viberound/Nav";
import { requireAuth, toAuthUser, type AuthUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Search = {
  mode: "chat" | "voice";
  kind: "global" | "local";
  lang?: string;
  participants?: number;
  radius?: number;
  eventRoomId?: string;
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
    eventRoomId: typeof s.eventRoomId === "string" ? s.eventRoomId : undefined,
  }),
  component: Room,
});

type Profile = Tables<"profiles"> & { distance_km?: number };
type GameRoom = Tables<"game_rooms">;
type RoomParticipant = Tables<"room_participants">;
type MatchmakingQueue = Tables<"matchmaking_queue">;
type RoomMessage = Tables<"messages">;

type ParticipantWithProfile = RoomParticipant & {
  profile?: Profile;
};

function Room() {
  const { mode, kind, lang, radius, eventRoomId } = Route.useSearch();
  const navigate = useNavigate();
  const total = mode === "chat" ? 300 : 180;
  const isEventRoom = Boolean(eventRoomId);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [queue, setQueue] = useState<MatchmakingQueue | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<"connecting" | "online" | "offline">(
    "connecting",
  );
  const [time, setTime] = useState(total);
  const [showVote, setShowVote] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [muted, setMuted] = useState(false);
  const [draft, setDraft] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const roomIdRef = useRef<string | null>(null);
  const queueIdRef = useRef<string | null>(null);
  const joinedRef = useRef(false);
  const finishingRef = useRef(false);
  const expiredRef = useRef<string | null>(null);
  const serverOffsetMsRef = useRef(0);
  const votingRef = useRef(false);

  const partner = useMemo(
    () =>
      participants.find(
        (participant) =>
          participant.user_id !== user?.id &&
          ["active", "disconnected", "left"].includes(participant.status),
      )?.profile ?? null,
    [participants, user?.id],
  );

  const myParticipant = useMemo(
    () => participants.find((participant) => participant.user_id === user?.id) ?? null,
    [participants, user?.id],
  );

  const activeParticipants = participants.filter((participant) => participant.status === "active");

  const loadRoomState = useCallback(
    async (roomId: string, currentUserId?: string) => {
      const [
        { data: roomData, error: roomError },
        { data: participantRows, error: participantError },
      ] = await Promise.all([
        supabase.from("game_rooms").select("*").eq("id", roomId).maybeSingle(),
        supabase
          .from("room_participants")
          .select("*")
          .eq("room_id", roomId)
          .order("joined_at", { ascending: true }),
      ]);

      if (roomError || participantError) {
        toast.error("Room non caricata", {
          description: roomError?.message ?? participantError?.message,
        });
        return;
      }

      setRoom(roomData);
      const rows = participantRows ?? [];
      const profileIds = rows.map((participant) => participant.user_id);
      const { data: profileRows } = profileIds.length
        ? await supabase.from("profiles").select("*").in("id", profileIds)
        : { data: [] };
      const profileById = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));

      setParticipants(
        rows.map((participant) => ({
          ...participant,
          profile: profileById.get(participant.user_id),
        })),
      );

      const { data: messageRows } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      setMessages(messageRows ?? []);

      if (roomData?.status === "finished") {
        if (roomData.finish_reason === "user_disconnected") {
          toast.info("Utente disconnesso");
        }
        if (roomData.finish_reason === "timer_expired" && !eventRoomId) {
          openVote();
        }
      }

      if (currentUserId && rows.some((participant) => participant.user_id === currentUserId)) {
        joinedRef.current = true;
      }
    },
    [eventRoomId],
  );

  useEffect(() => {
    let alive = true;

    async function joinQueue() {
      setLoading(true);
      setConnectionState("connecting");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const currentUser = toAuthUser(userData.user ?? null);
      console.log("USER", currentUser);
      console.log("SESSION", session);
      console.log("AUTH USER ERROR", userError);
      if (!alive) return;
      setUser(currentUser);

      if (!session?.access_token || !currentUser || userError) {
        toast.error("Sessione scaduta", {
          description: "Errore autenticazione matchmaking",
        });
        setLoading(false);
        setConnectionState("offline");
        navigate({ to: "/login" });
        return;
      }

      console.log("RPC AUTH", {
        hasAccessToken: Boolean(session.access_token),
        tokenType: session.token_type,
        expiresAt: session.expires_at,
      });

      if (eventRoomId) {
        roomIdRef.current = eventRoomId;
        queueIdRef.current = null;
        setQueue(null);
        setMe(null);
        await loadRoomState(eventRoomId, currentUser.id);
        if (!alive) return;
        setLoading(false);
        setConnectionState("online");
        return;
      }

      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileError || !currentProfile) {
        toast.error("Profilo non disponibile", { description: profileError?.message });
        setLoading(false);
        return;
      }

      setMe(currentProfile);

      if (kind === "local" && (!currentProfile.latitude || !currentProfile.longitude)) {
        toast.error("Posizione richiesta", {
          description: "Attiva la posizione dalla dashboard per usare il matchmaking locale.",
        });
        navigate({ to: "/dashboard" });
        return;
      }

      const { data, error } = await supabase.rpc("join_matchmaking", {
        p_mode: mode,
        p_room_type: kind,
        p_language:
          kind === "global" ? (lang ?? currentProfile.preferred_language ?? "Italiano") : null,
        p_radius_km: kind === "local" ? (radius ?? currentProfile.search_radius_km ?? 50) : null,
        p_latitude: kind === "local" ? currentProfile.latitude : null,
        p_longitude: kind === "local" ? currentProfile.longitude : null,
        p_theme: kind === "global" ? "Global quick match" : "Local quick match",
      });
      console.log("RPC DATA", data);
      console.log("RPC ERROR", error);

      if (error || !data?.[0]) {
        toast.error("Errore autenticazione matchmaking", { description: error?.message });
        setLoading(false);
        setConnectionState("offline");
        return;
      }

      const nextQueueId = data[0].queue_id;
      const nextRoomId = data[0].room_id;
      queueIdRef.current = nextQueueId;
      setQueue({
        id: nextQueueId,
        user_id: currentUser.id,
        room_id: nextRoomId,
        mode,
        room_type: kind,
        language:
          kind === "global" ? (lang ?? currentProfile.preferred_language ?? "Italiano") : null,
        latitude: kind === "local" ? currentProfile.latitude : null,
        longitude: kind === "local" ? currentProfile.longitude : null,
        radius_km: kind === "local" ? (radius ?? currentProfile.search_radius_km ?? 50) : null,
        status: data[0].matched ? "matched" : "queued",
        created_at: new Date().toISOString(),
        matched_at: data[0].matched ? new Date().toISOString() : null,
      });

      if (nextRoomId) {
        roomIdRef.current = nextRoomId;
        await loadRoomState(nextRoomId, currentUser.id);
      } else {
        roomIdRef.current = null;
        setRoom(null);
        setParticipants([]);
        setMessages([]);
      }
      if (!alive) return;
      setLoading(false);
      setConnectionState("online");
    }

    joinQueue();

    return () => {
      alive = false;
    };
  }, [eventRoomId, kind, lang, loadRoomState, mode, navigate, radius]);

  useEffect(() => {
    if (!queue?.id || queue.status !== "queued") return;

    const channel = supabase
      .channel(`matchmaking-queue-${queue.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matchmaking_queue",
          filter: `id=eq.${queue.id}`,
        },
        async (payload) => {
          const nextQueue = payload.new as MatchmakingQueue;
          setQueue(nextQueue);
          if (nextQueue.status === "matched" && nextQueue.room_id) {
            roomIdRef.current = nextQueue.room_id;
            await loadRoomState(nextQueue.room_id, user?.id);
          }
        },
      )
      .subscribe((status) => {
        setConnectionState(status === "SUBSCRIBED" ? "online" : "connecting");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRoomState, queue?.id, queue?.status, user?.id]);

  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`game-room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rooms", filter: `id=eq.${room.id}` },
        () => loadRoomState(room.id, user?.id),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_participants",
          filter: `room_id=eq.${room.id}`,
        },
        () => loadRoomState(room.id, user?.id),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => setMessages((current) => [...current, payload.new as RoomMessage]),
      )
      .subscribe((status) => {
        setConnectionState(status === "SUBSCRIBED" ? "online" : "connecting");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRoomState, room?.id, user?.id]);

  useEffect(() => {
    votingRef.current = showVote;
  }, [showVote]);

  function openVote() {
    votingRef.current = true;
    setShowVote(true);
  }

  useEffect(() => {
    if (!room) return;
    if (room.status !== "active" || !room.ends_at) {
      setTime(total);
      return;
    }

    let alive = true;

    async function syncServerClock() {
      const { data } = await supabase.rpc("server_now");
      if (!alive || !data) return;
      serverOffsetMsRef.current = new Date(data).getTime() - Date.now();
    }

    function tick() {
      const now = Date.now() + serverOffsetMsRef.current;
      const remaining = Math.max(
        0,
        Math.ceil((new Date(room.ends_at ?? "").getTime() - now) / 1000),
      );
      setTime(remaining);
      if (remaining <= 0) {
        if (!eventRoomId) {
          openVote();
        }
        if (room.id && expiredRef.current !== room.id) {
          expiredRef.current = room.id;
          void supabase.rpc("finish_expired_room", { p_room_id: room.id });
        }
      }
    }

    void syncServerClock();
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [eventRoomId, room, total]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const markOffline = () => setConnectionState("offline");
    const markOnline = () => setConnectionState("online");
    window.addEventListener("offline", markOffline);
    window.addEventListener("online", markOnline);
    return () => {
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", markOnline);
    };
  }, []);

  useEffect(() => {
    const leaveOnUnload = () => {
      const roomId = roomIdRef.current;
      if (finishingRef.current) return;
      if (eventRoomId) return;
      if (roomId && joinedRef.current) {
        if (votingRef.current) {
          void supabase.rpc("finish_round_without_disconnect", { p_room_id: roomId });
          return;
        }
        void supabase.rpc("leave_matchmaking", { p_room_id: roomId });
        return;
      }
      if (queueIdRef.current) {
        void supabase.rpc("cancel_matchmaking");
      }
    };

    window.addEventListener("pagehide", leaveOnUnload);
    return () => {
      window.removeEventListener("pagehide", leaveOnUnload);
      leaveOnUnload();
    };
  }, [eventRoomId]);

  async function leaveRoom(destination: "/dashboard" | "/matches" = "/dashboard") {
    finishingRef.current = true;
    if (room?.id) {
      await supabase.rpc("leave_matchmaking", { p_room_id: room.id });
    } else if (queue?.status === "queued") {
      await supabase.rpc("cancel_matchmaking");
    }
    navigate({ to: destination });
  }

  async function leaveAfterVote(destination: "/dashboard" | "/matches" = "/dashboard") {
    finishingRef.current = true;
    if (room?.id) {
      await supabase.rpc("finish_round_without_disconnect", { p_room_id: room.id });
    } else if (queue?.status === "queued") {
      await supabase.rpc("cancel_matchmaking");
    }
    navigate({ to: destination });
  }

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

    const a = user.id < partner.id ? user.id : partner.id;
    const b = user.id < partner.id ? partner.id : user.id;
    const { data: match } = await supabase
      .from("matches")
      .select("id")
      .eq("user_a", a)
      .eq("user_b", b)
      .maybeSingle();

    toast.success(
      match
        ? "Congratulazioni, hai fatto match!"
        : "Interesse salvato. Se è reciproco comparirà nei Matches.",
    );
    await leaveAfterVote("/matches");
  }

  async function send() {
    if (!draft.trim() || !room?.id || !user || room.status !== "active") return;
    const body = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      room_id: room.id,
      sender_id: user.id,
      content: body,
    });
    if (error) {
      toast.error("Messaggio non inviato", { description: error.message });
      setDraft(body);
    }
  }

  const mm = String(Math.floor(time / 60)).padStart(2, "0");
  const ss = String(time % 60).padStart(2, "0");
  const pct = Math.max(0, Math.min(100, (time / total) * 100));
  const isWaiting = loading || !room || queue?.status === "queued";
  const isActive = room?.status === "active";
  const isFinished = room?.status === "finished";
  const disconnected = room?.finish_reason === "user_disconnected";
  const participantCount = isActive ? activeParticipants.length : me ? 1 : 0;

  if (isEventRoom) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <FloatingBackground />

        <main className="flex min-h-screen flex-col px-4 py-4 sm:px-6">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {isWaiting
                  ? "Connessione stanza..."
                  : isFinished
                    ? "Partita terminata"
                    : "Partita live"}
              </div>
              <div className="mt-1 truncate text-sm font-medium text-muted-foreground">
                {room?.theme ?? "Evento 1 vs 1"} · {mode === "voice" ? "Vocale" : "Chat"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-display text-3xl font-semibold tabular-nums">
                {isActive ? `${mm}:${ss}` : "--:--"}
              </div>
              <button
                onClick={() => setShowExitConfirm(true)}
                className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold hover:bg-white/[0.1]"
              >
                Esci dalla partita
              </button>
            </div>
          </header>

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full gradient-primary"
              animate={{ width: `${isActive ? pct : 0}%` }}
              transition={{ ease: "linear" }}
            />
          </div>

          {isWaiting ? (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Apertura stanza...
              </div>
            </div>
          ) : isFinished ? (
            <div className="grid flex-1 place-items-center text-center">
              <div>
                <Flag className="mx-auto h-8 w-8 text-secondary" />
                <h1 className="mt-4 text-3xl font-semibold">Partita terminata</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Il timer è arrivato a zero. Puoi uscire dalla partita.
                </p>
              </div>
            </div>
          ) : mode === "voice" ? (
            <div className="grid flex-1 place-items-center text-center">
              <div>
                <div className="mx-auto grid h-28 w-28 place-items-center rounded-full gradient-primary shadow-glow">
                  {muted ? (
                    <MicOff className="h-10 w-10 text-primary-foreground" />
                  ) : (
                    <Mic className="h-10 w-10 text-primary-foreground" />
                  )}
                </div>
                <h1 className="mt-6 text-3xl font-semibold">
                  Vocale con {partner?.display_name ?? "partner"}
                </h1>
                <button
                  onClick={() => setMuted((value) => !value)}
                  className="mt-6 rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold"
                >
                  {muted ? "Riattiva microfono" : "Disattiva microfono"}
                </button>
              </div>
            </div>
          ) : (
            <section className="flex min-h-0 flex-1 flex-col py-4">
              <div ref={chatRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                {messages.map((message) => {
                  const mine = message.sender_id === user?.id;
                  const sender = participants.find(
                    (participant) => participant.user_id === message.sender_id,
                  );
                  return (
                    <div
                      key={message.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                          mine
                            ? "gradient-primary text-primary-foreground"
                            : "border border-white/10 bg-white/[0.06]"
                        }`}
                      >
                        {!mine ? (
                          <p className="mb-1 text-[11px] text-muted-foreground">
                            {sender?.profile?.display_name ?? "Partner"}
                          </p>
                        ) : null}
                        {message.content}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1.5 pl-4">
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
            </section>
          )}
        </main>

        <AnimatePresence>
          {showExitConfirm ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-xl"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="w-full max-w-sm rounded-3xl border border-white/10 bg-background p-6 text-center shadow-glow"
              >
                <h2 className="text-xl font-semibold">Sei sicuro di voler uscire?</h2>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => leaveRoom("/events")}
                    className="rounded-full gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                  >
                    Esci
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusPill
            icon={
              kind === "global" ? (
                <Globe2 className="h-3.5 w-3.5" />
              ) : (
                <MapPin className="h-3.5 w-3.5" />
              )
            }
            text={
              kind === "global" ? `Globale · ${lang ?? "Italiano"}` : `Locale · ${radius ?? 50} km`
            }
          />
          <StatusPill
            icon={
              mode === "voice" ? (
                <Mic className="h-3.5 w-3.5" />
              ) : (
                <MessageCircle className="h-3.5 w-3.5" />
              )
            }
            text={mode === "voice" ? "Vocale · 3 min" : "Chat · 5 min"}
          />
          <StatusPill
            icon={
              connectionState === "offline" ? (
                <WifiOff className="h-3.5 w-3.5" />
              ) : (
                <Wifi className="h-3.5 w-3.5" />
              )
            }
            text={
              connectionState === "online"
                ? "Realtime online"
                : connectionState === "offline"
                  ? "Offline"
                  : "Connessione..."
            }
          />
        </div>

        <div className="glass flex items-center justify-between rounded-full p-2 pl-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {isWaiting ? "Ricerca giocatore online..." : isFinished ? "Round chiuso" : "Round live"}
          </div>
          <div className="flex items-center gap-3">
            <div className="font-display text-2xl font-semibold tabular-nums">
              {isActive ? `${mm}:${ss}` : "--:--"}
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground shadow-glow">
              {participantCount}/2
            </div>
          </div>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full gradient-primary"
            animate={{ width: `${isActive ? pct : isWaiting ? 48 : 0}%` }}
            transition={{ ease: "linear" }}
          />
        </div>

        {isWaiting ? (
          <MatchmakingPanel me={me} />
        ) : isFinished ? (
          <div className="glass-strong mt-8 rounded-3xl p-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10">
              {disconnected ? (
                <WifiOff className="h-7 w-7 text-destructive" />
              ) : (
                <Flag className="h-7 w-7" />
              )}
            </div>
            <h1 className="mt-5 text-3xl font-semibold">
              {disconnected ? "Utente disconnesso" : "Sessione terminata"}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              La room è stata chiusa e non può accettare altri utenti.
            </p>
            <button
              onClick={() => leaveRoom("/dashboard")}
              className="mt-7 rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Torna alla dashboard
            </button>
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
                  Audio live con {partner?.display_name ?? "partner"}
                </h2>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  Room vocale realtime pronta. Per il provider audio/WebRTC la stanza e la presenza
                  sono già sincronizzate via Supabase.
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
                    Room attiva con {partner?.display_name ?? "un nuovo utente"}. La chat live dura
                    5 minuti.
                  </div>
                  {messages.map((message) => {
                    const mine = message.sender_id === user?.id;
                    const sender = participants.find(
                      (participant) => participant.user_id === message.sender_id,
                    );
                    return (
                      <div
                        key={message.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            mine
                              ? "gradient-primary text-primary-foreground"
                              : "border border-white/10 bg-white/[0.06]"
                          }`}
                        >
                          {!mine ? (
                            <p className="mb-1 text-[11px] text-muted-foreground">
                              {sender?.profile?.display_name ?? "Partner"}
                            </p>
                          ) : null}
                          {message.content}
                        </div>
                      </div>
                    );
                  })}
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
              <ParticipantCard profile={partner} fallback="Partner" />
              <div className="mt-5 grid gap-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                  >
                    <span>{participant.profile?.display_name ?? "Utente"}</span>
                    <span className="text-xs text-muted-foreground">{participant.status}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2">
          <button className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.05]">
            <Flag className="h-4 w-4" />
          </button>
          {(myParticipant || queue?.status === "queued") && !isFinished ? (
            <button
              onClick={() => (isActive ? openVote() : leaveRoom("/dashboard"))}
              className="rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              {isActive ? "Termina e vota" : "Esci dalla queue"}
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
                  onClick={() => leaveAfterVote("/dashboard")}
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

function StatusPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
      <span className="text-secondary">{icon}</span>
      {text}
    </div>
  );
}

function MatchmakingPanel({ me }: { me: Profile | null }) {
  return (
    <div className="glass-strong mt-8 overflow-hidden rounded-3xl p-8 text-center">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-primary/30 bg-primary/10">
        <motion.div
          animate={{ scale: [1, 1.22, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Radio className="h-10 w-10 text-primary" />
        </motion.div>
      </div>
      <h1 className="mt-6 text-3xl font-semibold">Ricerca giocatore online...</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Sei nella queue realtime. La room viene creata solo quando entra un secondo utente reale;
        prima non parte nessun timer e non si apre nessuna chat.
      </p>
      <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-3">
        <ParticipantSlot profile={me} label="Tu" active />
        <ParticipantSlot profile={null} label="In attesa" />
      </div>
    </div>
  );
}

function ParticipantSlot({
  profile,
  label,
  active = false,
}: {
  profile?: Profile | null;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div
        className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
          profile?.avatar_color ? `bg-gradient-to-br ${profile.avatar_color}` : "bg-white/10"
        }`}
      >
        {profile ? (
          profile.display_name[0]
        ) : (
          <UserRound className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <p className="mt-3 text-sm font-semibold">{profile?.display_name ?? label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{active ? "connesso" : "in attesa"}</p>
    </div>
  );
}

function ParticipantCard({ profile, fallback }: { profile: Profile | null; fallback: string }) {
  if (!profile) {
    return (
      <div className="text-center">
        <div className="mb-4 grid aspect-square w-full place-items-center rounded-2xl bg-white/10">
          <Sparkles className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-semibold">{fallback}</h3>
        <p className="mt-2 text-sm text-muted-foreground">Profilo in sincronizzazione realtime.</p>
      </div>
    );
  }

  return (
    <>
      {profile.profile_photo_url ? (
        <img
          src={profile.profile_photo_url}
          alt={profile.display_name}
          className="mb-4 aspect-square w-full rounded-2xl object-cover"
        />
      ) : (
        <div
          className={`mb-4 grid aspect-square w-full place-items-center rounded-2xl bg-gradient-to-br ${profile.avatar_color} text-6xl font-semibold`}
        >
          {profile.display_name[0]}
        </div>
      )}
      <h3 className="text-2xl font-semibold">
        {profile.display_name}
        {profile.age ? `, ${profile.age}` : ""}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{profile.city ?? "Giogo"}</p>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {profile.bio ?? "Profilo essenziale in aggiornamento."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(profile.interests ?? []).slice(0, 5).map((interest) => (
          <span key={interest} className="rounded-full bg-white/5 px-3 py-1 text-xs">
            {interest}
          </span>
        ))}
      </div>
    </>
  );
}
