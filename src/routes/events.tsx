import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, Loader2, MapPin, Plus, Users } from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getCurrentUser, requireAuth, type AuthUser } from "@/lib/auth";
import { distanceKm, type Coordinates } from "@/lib/geo";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/events")({
  beforeLoad: requireAuth,
  component: EventsPage,
});

type EventRow = Tables<"events">;
type EventWithDistance = EventRow & { distance_km: number | null; joined: boolean };

function EventsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventWithDistance[]>([]);
  const openingRoomRef = useRef(false);

  const openEventRoomIfReady = useCallback(
    async (event: EventWithDistance) => {
      if (!event.joined || openingRoomRef.current) return;
      if (!event.scheduled_at || new Date(event.scheduled_at).getTime() > Date.now()) return;
      if ((event.participant_count ?? 0) < 2) return;

      const { data, error } = await supabase.rpc("maybe_start_event_room", {
        p_event_id: event.id,
      });

      if (error) {
        toast.error("Stanza evento non avviata", { description: error.message });
        return;
      }

      const result = data?.[0];
      if (!result?.started || !result.room_id) return;

      openingRoomRef.current = true;
      navigate({
        to: "/room",
        search: {
          mode: event.play_mode === "voice" ? "voice" : "chat",
          kind: "local",
          eventRoomId: result.room_id,
        },
      });
    },
    [navigate],
  );

  const loadEvents = useCallback(async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    if (!currentUser) return;

    const [{ data: profile }, { data: allEvents }, { data: bookings }] = await Promise.all([
      supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", currentUser.id)
        .maybeSingle(),
      supabase.from("events").select("*").order("scheduled_at", { ascending: true }),
      supabase.from("event_participants").select("event_id").eq("profile_id", currentUser.id),
    ]);

    const coords =
      profile?.latitude && profile?.longitude
        ? { latitude: profile.latitude, longitude: profile.longitude }
        : null;
    const joined = new Set((bookings ?? []).map((booking) => booking.event_id));

    const nextEvents = (allEvents ?? []).map((event) => {
      const eventCoords =
        typeof event.latitude === "number" && typeof event.longitude === "number"
          ? { latitude: event.latitude, longitude: event.longitude }
          : null;
      return {
        ...event,
        distance_km: coords && eventCoords ? distanceKm(coords, eventCoords) : null,
        joined: joined.has(event.id) || event.host_id === currentUser.id,
      };
    });

    setUserCoords(coords);
    setEvents(nextEvents);
    setLoading(false);

    for (const event of nextEvents) {
      await openEventRoomIfReady(event);
    }
  }, [openEventRoomIfReady]);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!alive) return;
      await loadEvents();
    }
    load();
    const id = window.setInterval(() => {
      void loadEvents();
    }, 5000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [loadEvents]);

  async function joinEvent(event: EventWithDistance) {
    if (!user) return;
    if (!userCoords) {
      toast.error(t("events.needs_location"));
      return;
    }
    if (event.distance_km == null || event.distance_km > 50) {
      toast.error(t("events.too_far"));
      return;
    }

    const { error } = await supabase.from("event_participants").upsert({
      event_id: event.id,
      profile_id: user.id,
      status: "booked",
    });
    if (error) {
      toast.error("Prenotazione non riuscita", { description: error.message });
      return;
    }
    setEvents((current) =>
      current.map((item) =>
        item.id === event.id
          ? { ...item, joined: true, participant_count: Math.max(item.participant_count, 2) }
          : item,
      ),
    );
    toast.success("Prenotazione salvata");
    await openEventRoomIfReady({ ...event, joined: true, participant_count: 2 });
  }

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">{t("events.title")}</p>
            <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{t("events.title")}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{t("events.subtitle")}</p>
          </div>
          <Link
            to="/create-event"
            className="inline-flex items-center justify-center gap-2 rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" />
            {t("events.create")}
          </Link>
        </motion.div>

        {loading ? (
          <div className="mt-10 flex items-center gap-2 rounded-3xl glass p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : events.length === 0 ? (
          <div className="glass-strong mx-auto mt-10 max-w-lg rounded-3xl p-8 text-center">
            <CalendarClock className="mx-auto h-6 w-6 text-secondary" />
            <h2 className="mt-4 text-2xl font-semibold">Nessun evento ancora</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crea il primo evento: sarà visibile anche senza coordinate.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onJoin={() => joinEvent(event)} t={t} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EventCard({
  event,
  onJoin,
  t,
}: {
  event: EventWithDistance;
  onJoin: () => void;
  t: (key: string) => string;
}) {
  const canJoin = event.joined || (event.distance_km != null && event.distance_km <= 50);
  return (
    <div className="glass-strong rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold">{event.theme}</h3>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              {event.play_mode === "voice" ? t("dashboard.voice") : t("dashboard.chat")}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              {event.scheduled_at
                ? new Date(event.scheduled_at).toLocaleString()
                : "Da programmare"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-secondary" />
              {event.participant_count}/2
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-secondary" />
              max 50 km
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onJoin}
        disabled={!canJoin || event.joined}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none"
      >
        {event.joined ? "In attesa dello start" : canJoin ? t("events.join") : t("events.too_far")}
      </button>
    </div>
  );
}
