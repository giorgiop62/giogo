import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarClock,
  Check,
  Dumbbell,
  GraduationCap,
  Headphones,
  Loader2,
  MapPin,
  MessageCircle,
  Mic,
  Plus,
  Rainbow,
  Shuffle,
  Sparkles,
  Target,
  Users,
  Wine,
} from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, requireAuth, type AuthUser } from "@/lib/auth";
import { getBrowserPosition, saveUserLocation } from "@/lib/geo";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/create-event")({
  beforeLoad: requireAuth,
  component: CreateEventPage,
});

type PlayMode = "chat" | "voice";
type MatchMode = "random" | "custom";
type NearbyProfile = {
  id: string;
  display_name: string;
  age: number | null;
  gender: string | null;
  city: string | null;
  avatar_color: string;
  distance_km: number;
  profile_photo_url?: string | null;
};

const PRESET_THEMES = [
  { label: "Università di Firenze", icon: GraduationCap },
  { label: "LGBTQ+ Friendly", icon: Rainbow },
  { label: "After-work spritz", icon: Wine },
  { label: "Music lovers", icon: Headphones },
  { label: "Travelers", icon: MapPin },
  { label: "Fitness & Wellness", icon: Dumbbell },
];

const GENDERS = ["Donna", "Uomo", "Non-binary", "Tutti"] as const;

function CreateEventPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hostName, setHostName] = useState("");
  const [theme, setTheme] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [playMode, setPlayMode] = useState<PlayMode>("chat");
  const [matchMode, setMatchMode] = useState<MatchMode>("random");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const minPlayers = 2;
  const maxPlayers = 2;
  const [ageMin, setAgeMin] = useState(21);
  const [ageMax, setAgeMax] = useState(35);
  const [genders, setGenders] = useState<string[]>(["Tutti"]);
  const [invited, setInvited] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [nearby, setNearby] = useState<NearbyProfile[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const finalTheme = customTheme.trim() || theme;
  const scheduledAt =
    scheduledDate && scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      : null;

  const filteredNearby = useMemo(() => {
    if (matchMode !== "custom") return nearby;
    const allowsAllGenders = genders.includes("Tutti") || genders.length === 0;
    return nearby.filter((profile) => {
      const ageMatches = profile.age == null || (profile.age >= ageMin && profile.age <= ageMax);
      const genderMatches =
        allowsAllGenders || (profile.gender != null && genders.includes(profile.gender));
      return ageMatches && genderMatches;
    });
  }, [ageMax, ageMin, genders, matchMode, nearby]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const currentUser = await getCurrentUser();
      if (!alive) return;
      setUser(currentUser);
      if (!currentUser) return;

      const { data } = await supabase
        .from("profiles")
        .select("display_name, latitude, longitude")
        .eq("id", currentUser.id)
        .maybeSingle();
      if (!alive) return;
      setHostName(data?.display_name ?? currentUser.email);
      setLatitude(data?.latitude ?? null);
      setLongitude(data?.longitude ?? null);

      if (data?.latitude && data?.longitude) {
        await loadNearby(data.latitude, data.longitude);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  async function loadNearby(originLat: number, originLng: number) {
    setNearbyLoading(true);
    const { data, error } = await supabase.rpc("nearby_profiles", {
      origin_lat: originLat,
      origin_lng: originLng,
      radius_km: 50,
    });
    setNearbyLoading(false);
    if (error) {
      toast.error("Impossibile caricare le persone vicine", { description: error.message });
      return;
    }
    setNearby((data ?? []) as NearbyProfile[]);
  }

  async function enableLocation() {
    if (!user) return;
    setLocating(true);
    try {
      const coordinates = await getBrowserPosition();
      await saveUserLocation(user.id, coordinates);
      setLatitude(coordinates.latitude);
      setLongitude(coordinates.longitude);
      await loadNearby(coordinates.latitude, coordinates.longitude);
      toast.success(t("geo.saved"));
    } catch (error) {
      toast.error(t("geo.denied"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLocating(false);
    }
  }

  function toggleGender(gender: string) {
    setGenders((current) => {
      if (gender === "Tutti") return ["Tutti"];
      const next = current.filter((item) => item !== "Tutti");
      return next.includes(gender) ? next.filter((item) => item !== gender) : [...next, gender];
    });
  }

  function toggleInvite(id: string) {
    setInvited((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function submit() {
    if (!user) return;
    if (!finalTheme || !scheduledAt) {
      toast.error("Inserisci tema, data e orario");
      return;
    }
    const invitedProfiles = nearby.filter((profile) => invited.includes(profile.id));
    setSubmitting(true);
    const { data: event, error } = await supabase
      .from("events")
      .insert({
        event_kind: "local",
        host_id: user.id,
        host_name: hostName || user.email,
        theme: finalTheme,
        mode: matchMode,
        play_mode: playMode,
        min_players: minPlayers,
        max_players: maxPlayers,
        radius_km: 50,
        scheduled_at: scheduledAt,
        status: "scheduled",
        age_min: matchMode === "custom" ? ageMin : null,
        age_max: matchMode === "custom" ? ageMax : null,
        gender_filter: matchMode === "custom" ? genders : [],
        invited_profile_ids: invitedProfiles.map((profile) => profile.id),
        invited_names: invitedProfiles.map((profile) => profile.display_name),
        participant_count: 1,
        latitude,
        longitude,
      })
      .select("id")
      .single();

    if (error) {
      setSubmitting(false);
      toast.error("Impossibile creare evento", { description: error.message });
      return;
    }

    if (event) {
      await supabase.from("event_participants").upsert({
        event_id: event.id,
        profile_id: user.id,
        status: "booked",
      });
    }

    setSubmitting(false);
    toast.success("Round creato");
    navigate({ to: "/events" });
  }

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-widest text-primary">Modalità Locale</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Crea la tua stanza locale</h1>
          <p className="mt-3 text-muted-foreground">
            Modalità test: ogni evento parte solo con 2 persone reali e diventa una stanza 1 vs 1.
          </p>
        </motion.div>

        <Section step={1} title="Data e orario" icon={<CalendarClock className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Data evento">
              <input
                type="date"
                value={scheduledDate}
                onChange={(event) => setScheduledDate(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-primary/60"
              />
            </Field>
            <Field label="Orario evento">
              <input
                type="time"
                value={scheduledTime}
                onChange={(event) => setScheduledTime(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-primary/60"
              />
            </Field>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Field label="Raggio evento">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                50 km
              </div>
            </Field>
            <Field label={`Min partecipanti: ${minPlayers}`}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                2 persone
              </div>
            </Field>
            <Field label={`Max partecipanti: ${maxPlayers}`}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                2 persone
              </div>
            </Field>
          </div>
          <button
            onClick={enableLocation}
            disabled={locating}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold hover:bg-white/[0.08] disabled:opacity-50"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {latitude && longitude ? "Aggiorna coordinate stanza" : "Usa posizione per la stanza"}
          </button>
        </Section>

        <Section step={2} title="Tema dell'evento" icon={<Sparkles className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRESET_THEMES.map((preset) => {
              const Icon = preset.icon;
              const active = theme === preset.label && !customTheme;
              return (
                <button
                  key={preset.label}
                  onClick={() => {
                    setTheme(preset.label);
                    setCustomTheme("");
                  }}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    active
                      ? "border-primary/60 bg-primary/15"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{preset.label}</span>
                  {active ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
                </button>
              );
            })}
          </div>
          <input
            value={customTheme}
            onChange={(event) => setCustomTheme(event.target.value)}
            maxLength={80}
            placeholder="Oppure tema personalizzato..."
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
          />
        </Section>

        <Section step={3} title="Tipo di partita" icon={<Target className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeCard
              active={matchMode === "random"}
              onClick={() => setMatchMode("random")}
              icon={<Shuffle className="h-5 w-5" />}
              title="Random"
              desc="Chiunque può unirsi liberamente. In test la partita parte a 2 giocatori."
            />
            <ModeCard
              active={matchMode === "custom"}
              onClick={() => setMatchMode("custom")}
              icon={<Target className="h-5 w-5" />}
              title="Custom"
              desc="Selezioni età, gender e inviti specifici."
            />
          </div>

          <AnimatePresence initial={false}>
            {matchMode === "custom" ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label={`Età: ${ageMin}-${ageMax}`}>
                    <div className="flex gap-3">
                      <input
                        type="range"
                        min={18}
                        max={70}
                        value={ageMin}
                        onChange={(event) =>
                          setAgeMin(Math.min(Number(event.target.value), ageMax))
                        }
                        className="w-full accent-primary"
                      />
                      <input
                        type="range"
                        min={18}
                        max={70}
                        value={ageMax}
                        onChange={(event) =>
                          setAgeMax(Math.max(Number(event.target.value), ageMin))
                        }
                        className="w-full accent-secondary"
                      />
                    </div>
                  </Field>
                  <Field label="Gender">
                    <div className="flex flex-wrap gap-2">
                      {GENDERS.map((gender) => (
                        <button
                          key={gender}
                          onClick={() => toggleGender(gender)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            genders.includes(gender)
                              ? "border-primary/60 bg-primary/15"
                              : "border-white/10 bg-white/[0.04] text-muted-foreground"
                          }`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Section>

        <Section step={4} title="Modalità sessione" icon={<MessageCircle className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeCard
              active={playMode === "chat"}
              onClick={() => setPlayMode("chat")}
              icon={<MessageCircle className="h-5 w-5" />}
              title="Chat Mode"
              desc="Conversazione testuale da 5 minuti."
            />
            <ModeCard
              active={playMode === "voice"}
              onClick={() => setPlayMode("voice")}
              icon={<Mic className="h-5 w-5" />}
              title="Vocal Mode"
              desc="Conversazione audio live da 3 minuti."
            />
          </div>
        </Section>

        <Section
          step={5}
          title="Persone vicine"
          icon={<Users className="h-4 w-4" />}
          aside={
            <span className="text-xs text-muted-foreground">
              {invited.length} invitati · raggio 50 km
            </span>
          }
        >
          {nearbyLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carico profili vicini...
            </div>
          ) : filteredNearby.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
              Nessun profilo trovato con questi filtri.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredNearby.map((profile) => {
                const active = invited.includes(profile.id);
                return (
                  <button
                    key={profile.id}
                    onClick={() => toggleInvite(profile.id)}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                      active ? "border-primary/60 bg-primary/15" : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    {profile.profile_photo_url ? (
                      <img
                        src={profile.profile_photo_url}
                        alt={profile.display_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${profile.avatar_color} text-sm font-semibold`}
                      >
                        {profile.display_name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {profile.display_name}
                        {profile.age ? `, ${profile.age}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {profile.distance_km.toFixed(1)} km
                        {profile.city ? ` · ${profile.city}` : ""}
                      </div>
                    </div>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10">
                      {active ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        <div className="mt-8 glass-strong rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full gradient-primary shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold">{finalTheme || "Tema da scegliere"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {matchMode === "random" ? "Random" : "Custom"} ·{" "}
                {playMode === "chat" ? "Chat Mode" : "Vocal Mode"} · min {minPlayers} · max{" "}
                {maxPlayers} · test 1 vs 1 · raggio 50 km
              </p>
            </div>
          </div>
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full gradient-primary px-6 py-4 font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Crea Round
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
  icon: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: step * 0.035 }}
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
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
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left transition ${
        active ? "border-primary/60 bg-primary/15" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </button>
  );
}
