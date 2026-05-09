import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Image, Loader2, LocateFixed, Save, UserRound } from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { fakeAuth, type AuthUser } from "@/integrations/fakeAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

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

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [profile, setProfile] = useState<EditableProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      const { data: sessionData } = await fakeAuth.getSession();
      const currentUser = sessionData.session?.user ?? null;
      if (!alive) return;
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!alive) return;
      setLoading(false);

      if (error) {
        toast.error("Impossibile caricare il profilo", { description: error.message });
        return;
      }

      setProfile({
        display_name: data?.display_name ?? currentUser.email?.split("@")[0] ?? "",
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
  }, []);

  async function saveProfile(nextProfile = profile) {
    if (!user) return;

    const age = nextProfile.age ? Number(nextProfile.age) : null;
    const latitude = nextProfile.latitude ? Number(nextProfile.latitude) : null;
    const longitude = nextProfile.longitude ? Number(nextProfile.longitude) : null;

    if (
      !nextProfile.display_name.trim() ||
      !nextProfile.gender ||
      !nextProfile.age ||
      !nextProfile.nationality.trim() ||
      splitList(nextProfile.spoken_languages).length === 0 ||
      !nextProfile.preferred_language.trim() ||
      splitList(nextProfile.interests).length === 0 ||
      !nextProfile.profile_photo_url.trim() ||
      !nextProfile.matching_preferences.trim()
    ) {
      toast.error("Completa tutti i campi obbligatori");
      return;
    }

    if (
      (age != null && !Number.isFinite(age)) ||
      (latitude != null && !Number.isFinite(latitude)) ||
      (longitude != null && !Number.isFinite(longitude))
    ) {
      toast.error("Controlla età e coordinate");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: nextProfile.display_name.trim(),
      age,
      gender: nextProfile.gender,
      city: nextProfile.city.trim() || null,
      latitude,
      longitude,
      nationality: nextProfile.nationality.trim(),
      spoken_languages: splitList(nextProfile.spoken_languages),
      preferred_language: nextProfile.preferred_language.trim(),
      interests: splitList(nextProfile.interests),
      profile_photo_url: nextProfile.profile_photo_url.trim(),
      matching_preferences: { summary: nextProfile.matching_preferences.trim() },
      avatar_color: nextProfile.avatar_color,
    });
    setSaving(false);

    if (error) {
      toast.error("Profilo non salvato", { description: error.message });
      return;
    }

    toast.success("Profilo salvato");
    navigate({ to: "/create-event" });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocalizzazione non disponibile in questo browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setProfile((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
      },
      (error) => {
        setLocating(false);
        toast.error("Posizione non disponibile", { description: error.message });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-widest text-primary">Profilo</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Completa il profilo</h1>
          <p className="mt-3 text-muted-foreground">
            Questi dati servono per creare stanze compatibili e migliorare il matchmaking.
          </p>
        </motion.div>

        {!user && !loading ? (
          <div className="mt-8 glass-strong rounded-3xl p-6 text-sm text-muted-foreground">
            Effettua il login dalla pagina di creazione evento per completare il profilo.
          </div>
        ) : loading ? (
          <div className="mt-8 flex items-center gap-2 glass rounded-3xl p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carico profilo...
          </div>
        ) : (
          <div className="mt-8 glass rounded-3xl p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full gradient-primary">
                <UserRound className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold">Dati obbligatori</div>
                <div className="text-xs text-muted-foreground">
                  Sesso, età, nazionalità, lingue, interessi, foto e preferenze.
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Nome pubblico"
                value={profile.display_name}
                onChange={(value) => setProfile((p) => ({ ...p, display_name: value }))}
              />
              <Input
                label="Città"
                value={profile.city}
                onChange={(value) => setProfile((p) => ({ ...p, city: value }))}
              />
              <Input
                label="Età"
                type="number"
                value={profile.age}
                onChange={(value) => setProfile((p) => ({ ...p, age: value }))}
              />
              <label>
                <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
                  Sesso
                </span>
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground focus:border-primary/60 focus:outline-none"
                >
                  <option value="">Seleziona</option>
                  <option value="Donna">Donna</option>
                  <option value="Uomo">Uomo</option>
                  <option value="Non-binary">Non-binary</option>
                </select>
              </label>
              <Input
                label="Nazionalità"
                value={profile.nationality}
                onChange={(value) => setProfile((p) => ({ ...p, nationality: value }))}
              />
              <Input
                label="Lingua preferita"
                value={profile.preferred_language}
                onChange={(value) => setProfile((p) => ({ ...p, preferred_language: value }))}
              />
              <Input
                className="sm:col-span-2"
                label="Lingue parlate"
                placeholder="Italiano, English, Español"
                value={profile.spoken_languages}
                onChange={(value) => setProfile((p) => ({ ...p, spoken_languages: value }))}
              />
              <Input
                className="sm:col-span-2"
                label="Interessi"
                placeholder="Musica, viaggi, sport"
                value={profile.interests}
                onChange={(value) => setProfile((p) => ({ ...p, interests: value }))}
              />
              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
                  Foto profilo
                </span>
                <div className="relative">
                  <Image className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    value={profile.profile_photo_url}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, profile_photo_url: e.target.value }))
                    }
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                  />
                </div>
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
                  Preferenze di matching
                </span>
                <textarea
                  value={profile.matching_preferences}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, matching_preferences: e.target.value }))
                  }
                  placeholder="Chi vuoi incontrare, range, vibe, interessi importanti..."
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                label="Latitudine"
                value={profile.latitude}
                onChange={(value) => setProfile((p) => ({ ...p, latitude: value }))}
              />
              <Input
                label="Longitudine"
                value={profile.longitude}
                onChange={(value) => setProfile((p) => ({ ...p, longitude: value }))}
              />
              <button
                onClick={useCurrentLocation}
                disabled={locating}
                className="self-end rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium transition hover:bg-white/[0.07] disabled:opacity-50"
              >
                <LocateFixed className="mr-2 inline h-4 w-4" />
                {locating ? "Localizzo..." : "Usa posizione"}
              </button>
            </div>

            <button
              onClick={() => saveProfile()}
              disabled={saving}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full gradient-primary px-6 py-4 font-semibold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salva profilo
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
      />
    </label>
  );
}
