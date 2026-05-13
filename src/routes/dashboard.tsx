import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  CalendarPlus,
  Globe2,
  Loader2,
  MapPin,
  MessageCircle,
  Mic,
  Navigation,
  Sparkles,
  Users,
} from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { getCurrentUser, requireAuth, type AuthUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserPosition, saveUserLocation } from "@/lib/geo";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAuth,
  component: Dashboard,
});

type Scope = "global" | "local";
type PlayMode = "chat" | "voice";
type SessionLanguage = "Italiano" | "English" | "Español";

type NearbyProfile = {
  id: string;
  display_name: string;
  age: number | null;
  city: string | null;
  avatar_color: string;
  distance_km: number;
  profile_photo_url?: string | null;
};

const SESSION_LANGUAGES: SessionLanguage[] = ["Italiano", "English", "Español"];

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [scope, setScope] = useState<Scope>("global");
  const [playMode, setPlayMode] = useState<PlayMode>("chat");
  const [sessionLanguage, setSessionLanguage] = useState<SessionLanguage>("Italiano");
  const [nearby, setNearby] = useState<NearbyProfile[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [locating, setLocating] = useState(false);

  const loadNearby = useCallback(
    async (latitude: number, longitude: number) => {
      setLoadingNearby(true);
      const { data, error } = await supabase.rpc("nearby_profiles", {
        origin_lat: latitude,
        origin_lng: longitude,
        radius_km: 50,
      });
      setLoadingNearby(false);
      if (error) {
        toast.error(t("geo.denied"), { description: error.message });
        return;
      }
      setNearby((data ?? []) as NearbyProfile[]);
    },
    [t],
  );

  useEffect(() => {
    let alive = true;
    async function load() {
      const currentUser = await getCurrentUser();
      if (!alive) return;
      setUser(currentUser);
      if (!currentUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profile?.latitude && profile?.longitude) {
        await loadNearby(profile.latitude, profile.longitude);
      } else {
        setLoadingNearby(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [loadNearby]);

  async function enableLocation() {
    if (!user) return;
    setLocating(true);
    try {
      const coordinates = await getBrowserPosition();
      await saveUserLocation(user.id, coordinates);
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

  function startGlobalRound() {
    navigate({
      to: "/room",
      search: {
        mode: playMode,
        kind: "global",
        lang: sessionLanguage,
        participants: 10,
      },
    });
  }

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 lg:grid-cols-[1fr_360px]"
        >
          <section>
            <p className="text-xs uppercase tracking-widest text-primary">Play</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
              Modalità di gioco
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Scegli tra sessioni globali da 10 partecipanti o stanze locali basate su zona,
              interessi e tema.
            </p>
          </section>
          <section className="glass-strong rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl gradient-primary">
                <Navigation className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold">{t("geo.enable")}</p>
                <p className="text-xs text-muted-foreground">
                  Necessaria per profili e stanze locali
                </p>
              </div>
            </div>
            <button
              onClick={enableLocation}
              disabled={locating}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold hover:bg-white/[0.08] disabled:opacity-50"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {t("geo.enable")}
            </button>
          </section>
        </motion.div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Choice
            active={scope === "global"}
            onClick={() => setScope("global")}
            icon={<Globe2 className="h-5 w-5" />}
            title="Modalità Globale"
            desc="Sessioni internazionali basate su lingua e compatibilità. Partenza con 10 utenti."
          />
          <Choice
            active={scope === "local"}
            onClick={() => setScope("local")}
            icon={<MapPin className="h-5 w-5" />}
            title="Modalità Locale"
            desc="Crea o entra in stanze entro 50 km, con tema, interessi e filtri personalizzati."
          />
        </div>

        {scope === "global" ? (
          <section className="mt-6 glass rounded-3xl p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Lingua della sessione
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {SESSION_LANGUAGES.map((language) => (
                    <button
                      key={language}
                      onClick={() => setSessionLanguage(language)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        sessionLanguage === language
                          ? "border-primary/60 bg-primary/15"
                          : "border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07]"
                      }`}
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Modalità sessione
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ModeButton
                    active={playMode === "chat"}
                    onClick={() => setPlayMode("chat")}
                    icon={<MessageCircle className="h-4 w-4" />}
                    label="Chat Mode"
                    sub="5 minuti"
                  />
                  <ModeButton
                    active={playMode === "voice"}
                    onClick={() => setPlayMode("voice")}
                    icon={<Mic className="h-4 w-4" />}
                    label="Vocal Mode"
                    sub="3 minuti"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Partecipanti fissi: 10 utenti</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    La sessione parte solo quando si raggiunge il numero completo; lingua e
                    compatibilità guidano il bilanciamento.
                  </p>
                </div>
                <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">0/10</div>
              </div>
            </div>

            <button
              onClick={startGlobalRound}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full gradient-primary px-6 py-4 font-semibold text-primary-foreground shadow-glow"
            >
              <Sparkles className="h-5 w-5" />
              Entra in sessione globale
            </button>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
            <Link
              to="/create-event"
              className="glass-strong rounded-3xl p-6 transition hover:bg-white/[0.08]"
            >
              <CalendarPlus className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-2xl font-semibold">Crea la tua stanza locale</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Data, orario, raggio fino a 50 km, tema, Random o Custom, Chat o Vocal.
              </p>
            </Link>
            <Link
              to="/events"
              className="glass-strong rounded-3xl p-6 transition hover:bg-white/[0.08]"
            >
              <Users className="h-6 w-6 text-secondary" />
              <h2 className="mt-4 text-2xl font-semibold">Entra in una stanza</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Prenotati agli eventi locali e accedi alla lobby quando la sessione si attiva.
              </p>
            </Link>
          </section>
        )}

        <section className="mt-10 glass rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-secondary" />
              <h2 className="font-semibold">Persone vicine</h2>
            </div>
            <span className="text-xs text-muted-foreground">raggio 50 km</span>
          </div>

          {loadingNearby ? (
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </div>
          ) : nearby.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Nessun profilo trovato con questi filtri.
            </p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center gap-3">
                    {profile.profile_photo_url ? (
                      <img
                        src={profile.profile_photo_url}
                        alt={profile.display_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${profile.avatar_color} font-semibold`}
                      >
                        {profile.display_name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {profile.display_name}
                        {profile.age ? `, ${profile.age}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profile.distance_km.toFixed(1)} km
                        {profile.city ? ` · ${profile.city}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Choice({
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
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={`rounded-3xl border p-5 text-left transition ${
        active ? "border-primary/60 bg-primary/15 shadow-glow" : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </motion.button>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        active ? "border-primary/60 bg-primary/15" : "border-white/10 bg-white/[0.04]"
      }`}
    >
      {icon}
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}
