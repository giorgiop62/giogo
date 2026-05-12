import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Shuffle,
  Settings2,
  MapPin,
  Users,
  MessageCircle,
  Video,
  Check,
  Plus,
  ChevronRight,
  GraduationCap,
  Rainbow,
  Wine,
  Music2,
  Plane,
  Dumbbell,
  Loader2,
  LogIn,
  CalendarClock,
} from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, onAuthUserChange, requireAuth, type AuthUser } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/create-event")({
  beforeLoad: requireAuth,
  component: CreateEventPage,
});

const PRESET_THEMES = [
  { label: "Università di Firenze", icon: GraduationCap },
  { label: "LGBTQ+ Friendly", icon: Rainbow },
  { label: "After-work spritz", icon: Wine },
  { label: "Music lovers", icon: Music2 },
  { label: "Travelers", icon: Plane },
  { label: "Fitness & Wellness", icon: Dumbbell },
];

const GENDERS = ["Donna", "Uomo", "Non-binary", "Tutti"] as const;

type NearbyProfile = {
  id: string;
  display_name: string;
  age: number | null;
  gender: string | null;
  city: string | null;
  avatar_color: string;
  distance_km: number;
};

type EditableProfile = {
  display_name: string;
  age: string;
  gender: string;
  city: string;
  latitude: string;
  longitude: string;
  nationality: string;
  spoken_languages: string;
  preferred_language: string;
  interests: string;
  profile_photo_url: string;
  matching_preferences: string;
  avatar_color: string;
};

const DEFAULT_PROFILE: EditableProfile = {
  display_name: "",
  age: "",
  gender: "",
  city: "",
  latitude: "",
  longitude: "",
  nationality: "",
  spoken_languages: "",
  preferred_language: "",
  interests: "",
  profile_photo_url: "",
  matching_preferences: "",
  avatar_color: "from-rose-500 to-pink-500",
};

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function CreateEventPage() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState<string>("");
  const [customTheme, setCustomTheme] = useState("");
  const [mode, setMode] = useState<"random" | "custom">("random");
  const [playMode, setPlayMode] = useState<"chat" | "webcam">("chat");
  const [minPlayers, setMinPlayers] = useState(4);
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);
  const [ageMin, setAgeMin] = useState(21);
  const [ageMax, setAgeMax] = useState(35);
  const [genders, setGenders] = useState<string[]>(["Tutti"]);
  const [invited, setInvited] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<EditableProfile>(DEFAULT_PROFILE);
  const [nearby, setNearby] = useState<NearbyProfile[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const finalTheme = customTheme.trim() || theme;
  const hasLocation = !!profile.latitude && !!profile.longitude;
  const scheduledAt =
    scheduledDate && scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      : null;
  const profileComplete =
    !!profile.display_name.trim() &&
    !!profile.gender &&
    !!profile.age &&
    !!profile.nationality.trim() &&
    splitList(profile.spoken_languages).length > 0 &&
    !!profile.preferred_language.trim() &&
    splitList(profile.interests).length > 0 &&
    !!profile.profile_photo_url.trim() &&
    !!profile.matching_preferences.trim();
  const canSubmit =
    !!finalTheme && minPlayers >= 4 && maxPlayers >= minPlayers && !!user && !!scheduledAt;

  const filteredNearby = useMemo(() => {
    if (mode !== "custom") return nearby;
    const allowsAllGenders = genders.includes("Tutti") || genders.length === 0;
    return nearby.filter((p) => {
      const ageMatches = p.age == null || (p.age >= ageMin && p.age <= ageMax);
      const genderMatches = allowsAllGenders || (p.gender != null && genders.includes(p.gender));
      return ageMatches && genderMatches;
    });
  }, [mode, nearby, ageMin, ageMax, genders]);

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      const currentUser = await getCurrentUser();
      if (!alive) return;
      setUser(currentUser);
      setAuthReady(true);
    }

    loadSession();
    const subscription = onAuthUserChange((currentUser) => {
      setUser(currentUser);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authReady && !user) {
      navigate({ to: "/login" });
    }
  }, [authReady, navigate, user]);

  useEffect(() => {
    if (!user) {
      setProfile(DEFAULT_PROFILE);
      setNearby([]);
      setInvited([]);
      return;
    }

    const currentUser = user;
    let alive = true;

    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();
      if (!alive) return;

      if (error) {
        toast.error("Impossibile caricare il profilo", { description: error.message });
        return;
      }

      setProfile({
        display_name: data?.display_name ?? currentUser.email.split("@")[0] ?? "",
        age: data?.age?.toString() ?? "",
        gender: data?.gender ?? "",
        city: data?.city ?? "",
        latitude: data?.latitude?.toString() ?? "",
        longitude: data?.longitude?.toString() ?? "",
        nationality: data?.nationality ?? "",
        spoken_languages: data?.spoken_languages?.join(", ") ?? "",
        preferred_language: data?.preferred_language ?? "",
        interests: data?.interests?.join(", ") ?? "",
        profile_photo_url: data?.profile_photo_url ?? "",
        matching_preferences:
          typeof data?.matching_preferences === "string"
            ? data.matching_preferences
            : ((data?.matching_preferences as { summary?: string } | null)?.summary ?? ""),
        avatar_color: data?.avatar_color ?? DEFAULT_PROFILE.avatar_color,
      });
    }

    loadProfile();
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    if (!profile.latitude || !profile.longitude) return;

    const lat = Number(profile.latitude);
    const lng = Number(profile.longitude);
    if (!user || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    let alive = true;

    async function loadNearby() {
      setNearbyLoading(true);
      const { data, error } = await supabase.rpc("nearby_profiles", {
        origin_lat: lat,
        origin_lng: lng,
        radius_km: 50,
      });

      if (!alive) return;
      setNearbyLoading(false);

      if (error) {
        toast.error("Impossibile caricare le persone vicine", { description: error.message });
        return;
      }

      setNearby(data ?? []);
      setInvited((current) => current.filter((id) => (data ?? []).some((p) => p.id === id)));
    }

    loadNearby();
    return () => {
      alive = false;
    };
  }, [user, profile.latitude, profile.longitude]);

  function toggleGender(g: string) {
    setGenders((prev) => {
      if (g === "Tutti") return ["Tutti"];
      const next = prev.filter((x) => x !== "Tutti");
      return next.includes(g) ? next.filter((x) => x !== g) : [...next, g];
    });
  }

  function toggleInvite(id: string) {
    setInvited((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    if (!finalTheme) {
      toast.error("Scegli un tema per il round");
      return;
    }

    if (!scheduledAt) {
      toast.error("Imposta data e orario dell'evento");
      return;
    }

    if (maxPlayers < minPlayers) {
      toast.error("Il numero massimo di partecipanti deve essere maggiore del minimo");
      return;
    }

    setSubmitting(true);
    try {
      const invitedProfiles = nearby.filter((p) => invited.includes(p.id));
      const invitedNames = invitedProfiles.map((p) => p.display_name);
      const { data: event, error } = await supabase
        .from("events")
        .insert({
          event_kind: "local",
          host_id: user.id,
          host_name: profile.display_name.trim() || user.email,
          theme: finalTheme,
          mode,
          play_mode: playMode,
          min_players: minPlayers,
          max_players: maxPlayers,
          radius_km: radiusKm,
          scheduled_at: scheduledAt,
          status: "scheduled",
          age_min: mode === "custom" ? ageMin : null,
          age_max: mode === "custom" ? ageMax : null,
          gender_filter: mode === "custom" ? genders : [],
          invited_profile_ids: invitedProfiles.map((p) => p.id),
          invited_names: invitedNames,
          participant_count: 1,
        })
        .select("id")
        .single();

      if (error) {
        toast.error("Impossibile creare il round", { description: error.message });
        return;
      }

      if (event) {
        const { error: participantError } = await supabase.from("event_participants").upsert({
          event_id: event.id,
          profile_id: user.id,
          status: "booked",
        });

        if (participantError) {
          toast.error("Round creato, ma prenotazione host non salvata", {
            description: participantError.message,
          });
        }
      }

      toast.success("Round creato con successo");
      navigate({ to: "/events" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-widest text-primary">Nuovo evento</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Crea il tuo round</h1>
          <p className="mt-3 text-muted-foreground">
            Scegli un tema, decidi chi invitare e fai partire la magia.
          </p>
        </motion.div>

        <Section step={0} title="Sessione utente" icon={<LogIn className="h-4 w-4" />}>
          {!authReady ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Controllo sessione...
            </div>
          ) : !user ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
              <p className="mb-3 font-semibold">
                Effettua il login dalla home per creare un evento locale.
              </p>
              <Link
                to="/"
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold transition hover:bg-white/[0.07]"
              >
                Vai al login
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold">
                  {profile.display_name || user.email} ·{" "}
                  {profileComplete ? "profilo completo" : "profilo da completare"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Il profilo contiene sesso, età, nazionalità, lingue, interessi, foto e preferenze
                  di matching.
                </p>
              </div>
              <Link
                to="/profile"
                className="inline-flex justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold transition hover:bg-white/[0.07]"
              >
                {profileComplete ? "Modifica profilo" : "Completa profilo"}
              </Link>
            </div>
          )}
        </Section>

        <Section step={1} title="Data e orario" icon={<CalendarClock className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Data evento">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm focus:border-primary/60 focus:outline-none"
              />
            </Field>
            <Field label="Orario evento">
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm focus:border-primary/60 focus:outline-none"
              />
            </Field>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label={`Max partecipanti · ${maxPlayers}`}>
              <input
                type="range"
                min={Math.max(4, minPlayers)}
                max={20}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full accent-secondary"
              />
            </Field>
            <Field label={`Raggio evento · ${radiusKm} km`}>
              <input
                type="range"
                min={5}
                max={100}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </Field>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Gli invitati potranno prenotarsi e accedere alla lobby quando arriverà il momento della
            sessione.
          </p>
        </Section>

        {/* THEME */}
        <Section step={2} title="Tema dell'evento" icon={<Sparkles className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRESET_THEMES.map((t) => {
              const Icon = t.icon;
              const active = theme === t.label && !customTheme;
              return (
                <button
                  key={t.label}
                  onClick={() => {
                    setTheme(t.label);
                    setCustomTheme("");
                  }}
                  className={`group relative flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    active
                      ? "border-primary/60 bg-primary/10 text-foreground shadow-glow"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t.label}</span>
                  {active && <Check className="ml-auto h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">oppure</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <input
            value={customTheme}
            onChange={(e) => setCustomTheme(e.target.value)}
            maxLength={60}
            placeholder="Scrivi un tema personalizzato…"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
          />
        </Section>

        {/* MODE */}
        <Section step={3} title="Tipo di partita" icon={<Settings2 className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeCard
              active={mode === "random"}
              onClick={() => setMode("random")}
              icon={<Shuffle className="h-5 w-5" />}
              title="Random"
              desc="Tutti possono unirsi. Min 4 giocatori per partire."
            />
            <ModeCard
              active={mode === "custom"}
              onClick={() => setMode("custom")}
              icon={<Settings2 className="h-5 w-5" />}
              title="Custom"
              desc="Tu scegli età, gender e chi invitare."
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setPlayMode("chat")}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${playMode === "chat" ? "border-primary/60 bg-primary/10" : "border-white/10 bg-white/[0.03]"}`}
            >
              <MessageCircle className="h-4 w-4" /> Chat
            </button>
            <button
              onClick={() => setPlayMode("webcam")}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${playMode === "webcam" ? "border-primary/60 bg-primary/10" : "border-white/10 bg-white/[0.03]"}`}
            >
              <Video className="h-4 w-4" /> Webcam
            </button>
          </div>

          <Field label={`Min. giocatori · ${minPlayers}`}>
            <input
              type="range"
              min={4}
              max={12}
              value={minPlayers}
              onChange={(e) => {
                const next = Number(e.target.value);
                setMinPlayers(next);
                setMaxPlayers((current) => Math.max(current, next));
              }}
              className="w-full accent-primary"
            />
          </Field>

          <AnimatePresence initial={false}>
            {mode === "custom" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Field label={`Età · ${ageMin} – ${ageMax}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={18}
                      max={70}
                      value={ageMin}
                      onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax))}
                      className="w-full accent-primary"
                    />
                    <input
                      type="range"
                      min={18}
                      max={70}
                      value={ageMax}
                      onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin))}
                      className="w-full accent-secondary"
                    />
                  </div>
                </Field>

                <Field label="Gender ammessi">
                  <div className="flex flex-wrap gap-2">
                    {GENDERS.map((g) => {
                      const active = genders.includes(g);
                      return (
                        <button
                          key={g}
                          onClick={() => toggleGender(g)}
                          className={`rounded-full border px-4 py-1.5 text-xs transition ${
                            active
                              ? "border-primary/60 bg-primary/10 text-foreground"
                              : "border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07]"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        {/* NEARBY */}
        <Section
          step={4}
          title="Persone vicine"
          icon={<MapPin className="h-4 w-4" />}
          aside={
            <span className="text-xs text-muted-foreground">
              {invited.length} invitat{invited.length === 1 ? "o" : "i"} · raggio 50 km
            </span>
          }
        >
          {!user ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
              Effettua il login per caricare profili reali vicino a te.
            </div>
          ) : !hasLocation ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
              Aggiungi latitudine e longitudine, oppure usa la posizione del browser.
            </div>
          ) : nearbyLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carico persone nel raggio di 50 km...
            </div>
          ) : filteredNearby.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
              Nessun profilo trovato nel raggio o con questi filtri.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredNearby.map((p) => {
                const active = invited.includes(p.id);
                return (
                  <motion.button
                    key={p.id}
                    onClick={() => toggleInvite(p.id)}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-primary/60 bg-primary/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${p.avatar_color} text-sm font-semibold text-white`}
                    >
                      {p.display_name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {p.display_name}
                        {p.age ? `, ${p.age}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.distance_km.toFixed(1)} km{p.city ? ` · ${p.city}` : ""}
                      </div>
                    </div>
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full transition ${
                        active
                          ? "gradient-primary text-primary-foreground shadow-glow"
                          : "bg-white/5 text-muted-foreground"
                      }`}
                    >
                      {active ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </Section>

        {/* SUMMARY + CTA */}
        <div className="mt-10 glass-strong rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full gradient-primary shadow-glow">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{finalTheme || "Tema da scegliere"}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {mode === "random" ? "Random" : "Custom"} ·{" "}
                {playMode === "chat" ? "Chat" : "Webcam"} · min {minPlayers}
                {scheduledAt && ` · ${new Date(scheduledAt).toLocaleString("it-IT")}`}
                {mode === "custom" && ` · ${ageMin}-${ageMax} anni`}
                {invited.length > 0 && ` · ${invited.length} invitati`}
              </div>
            </div>
          </div>
          <button
            disabled={submitting}
            onClick={submit}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-4 font-semibold text-primary-foreground shadow-glow transition disabled:opacity-40 disabled:shadow-none"
          >
            {submitting ? "Creazione..." : "Crea Round"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}

function Section({
  step,
  title,
  icon,
  aside,
  children,
}: {
  step: number;
  title: string;
  icon: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: step * 0.05 }}
      className="mt-8 glass rounded-3xl p-5 sm:p-6"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-primary">
            {icon}
          </div>
          <h2 className="text-base font-semibold sm:text-lg">
            <span className="mr-2 text-muted-foreground">{step}.</span>
            {title}
          </h2>
        </div>
        {aside}
      </header>
      {children}
    </motion.section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function ModeCard({
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
      className={`relative overflow-hidden rounded-3xl border p-5 text-left transition ${
        active
          ? "border-primary/60 bg-primary/10 shadow-glow"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-primary text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      {active && (
        <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </motion.button>
  );
}
