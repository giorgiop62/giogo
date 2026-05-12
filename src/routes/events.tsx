import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Loader2, Plus, Users } from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getCurrentUser, requireAuth, type AuthUser } from "@/lib/auth";

export const Route = createFileRoute("/events")({
  beforeLoad: requireAuth,
  component: EventsPage,
});

type EventRow = Tables<"events">;

function EventsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [created, setCreated] = useState<EventRow[]>([]);
  const [booked, setBooked] = useState<EventRow[]>([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      const currentUser = await getCurrentUser();
      if (!alive) return;
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const [{ data: createdEvents }, { data: bookings }] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .eq("host_id", currentUser.id)
          .order("scheduled_at", { ascending: true }),
        supabase.from("event_participants").select("event_id").eq("profile_id", currentUser.id),
      ]);

      const bookedIds = [...new Set((bookings ?? []).map((booking) => booking.event_id))];
      const { data: bookedEvents } =
        bookedIds.length > 0
          ? await supabase
              .from("events")
              .select("*")
              .in("id", bookedIds)
              .order("scheduled_at", { ascending: true })
          : { data: [] };

      if (!alive) return;
      setCreated(createdEvents ?? []);
      setBooked((bookedEvents ?? []).filter((event) => event.host_id !== currentUser.id));
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const hasEvents = created.length > 0 || booked.length > 0;

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-widest text-primary">Eventi</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">I tuoi eventi</h1>
          <p className="mt-3 text-muted-foreground">
            Qui trovi eventi creati, prenotazioni, partecipanti e stato della lobby.
          </p>
        </motion.div>

        {!user ? (
          <EmptyState
            title="Accedi per vedere gli eventi"
            desc="Dopo il login potrai creare eventi locali e prenotarti a quelli compatibili."
          />
        ) : loading ? (
          <div className="mt-10 flex items-center gap-2 rounded-3xl glass p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carico eventi...
          </div>
        ) : !hasEvents ? (
          <EmptyState
            title="Nessun evento ancora"
            desc="Crea un evento locale con data e orario, poi invita persone compatibili."
          />
        ) : (
          <div className="mt-10 grid gap-8">
            <EventSection title="Eventi creati" events={created} />
            <EventSection title="Eventi prenotati" events={booked} />
          </div>
        )}

        <Link
          to="/create-event"
          className="mt-8 inline-flex items-center gap-2 rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          <Plus className="h-4 w-4" />
          Crea evento
        </Link>
      </main>
    </div>
  );

  function EventSection({ title, events }: { title: string; events: EventRow[] }) {
    if (events.length === 0) return null;

    return (
      <section>
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="mt-4 grid gap-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onEnter={() => enterEvent(event)} />
          ))}
        </div>
      </section>
    );
  }

  function enterEvent(event: EventRow) {
    navigate({
      to: "/room",
      search: {
        mode: event.play_mode === "webcam" ? "webcam" : "chat",
        kind: "local",
        event: event.theme,
        radius: event.radius_km ?? undefined,
      },
    });
  }
}

function EventCard({ event, onEnter }: { event: EventRow; onEnter: () => void }) {
  const status = useMemo(() => getLobbyStatus(event), [event]);

  return (
    <div className="glass-strong rounded-3xl p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{event.theme}</h3>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              {event.play_mode === "webcam" ? "Webcam" : "Chat"}
            </span>
            <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs text-secondary">
              {status.label}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              {event.scheduled_at
                ? new Date(event.scheduled_at).toLocaleString("it-IT")
                : "Da programmare"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-secondary" />
              {event.participant_count}/{event.max_players} partecipanti · min {event.min_players}
            </span>
          </div>
        </div>
        <button
          onClick={onEnter}
          disabled={!status.canEnter}
          className="inline-flex items-center justify-center gap-2 rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none"
        >
          <CheckCircle2 className="h-4 w-4" />
          Entra
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="glass-strong mx-auto mt-10 max-w-lg rounded-3xl p-8 text-center">
      <CalendarClock className="mx-auto h-6 w-6 text-secondary" />
      <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function getLobbyStatus(event: EventRow) {
  const startsAt = event.scheduled_at ? new Date(event.scheduled_at).getTime() : null;
  const now = Date.now();
  const participantReady =
    event.participant_count >= event.min_players && event.participant_count % 2 === 0;

  if (event.status !== "scheduled" && event.status !== "open") {
    return { label: event.status, canEnter: false };
  }

  if (!startsAt) return { label: "Da programmare", canEnter: false };
  if (startsAt > now) return { label: "Programmato", canEnter: false };
  if (!participantReady) return { label: "In attesa partecipanti", canEnter: false };
  return { label: "Lobby pronta", canEnter: true };
}
