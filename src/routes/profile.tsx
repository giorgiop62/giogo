import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  Camera,
  Check,
  ChevronDown,
  Edit3,
  Heart,
  ImagePlus,
  Languages,
  Loader2,
  MapPin,
  Save,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUser, requireAuth, type AuthUser } from "@/lib/auth";
import { LANGUAGES, NATIONALITIES } from "@/lib/profile-options";

export const Route = createFileRoute("/profile")({
  beforeLoad: requireAuth,
  component: ProfilePage,
});

type PreferredMode = "chat" | "vocale";

type EditableProfile = {
  display_name: string;
  age: string;
  gender: string;
  city: string;
  nationality: string;
  spoken_languages: string[];
  preferred_language: string;
  interests: string;
  bio: string;
  preferred_mode: PreferredMode | "";
  profile_photo_url: string;
  avatar_color: string;
};

const DEFAULT_PROFILE: EditableProfile = {
  display_name: "",
  age: "",
  gender: "",
  city: "",
  nationality: "",
  spoken_languages: [],
  preferred_language: "",
  interests: "",
  bio: "",
  preferred_mode: "",
  profile_photo_url: "",
  avatar_color: "from-rose-500 to-pink-500",
};

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<EditableProfile>(DEFAULT_PROFILE);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [hasCompleteProfile, setHasCompleteProfile] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      const currentUser = await getCurrentUser();
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

      const matchingPreferences =
        typeof data?.matching_preferences === "object" && data?.matching_preferences
          ? (data.matching_preferences as { preferred_mode?: PreferredMode })
          : null;

      const nextProfile = {
        display_name: data?.display_name ?? currentUser.email?.split("@")[0] ?? "",
        age: data?.age?.toString() ?? "",
        gender: data?.gender ?? "",
        city: data?.city ?? "",
        nationality: data?.nationality ?? "",
        spoken_languages: data?.spoken_languages ?? [],
        preferred_language: data?.preferred_language ?? "",
        interests: data?.interests?.join(", ") ?? "",
        bio: data?.bio ?? "",
        preferred_mode: data?.preferred_mode ?? matchingPreferences?.preferred_mode ?? "",
        profile_photo_url: data?.profile_photo_url ?? "",
        avatar_color: data?.avatar_color ?? DEFAULT_PROFILE.avatar_color,
      };

      setProfile(nextProfile);
      setPhotoPreview(nextProfile.profile_photo_url);
      setHasCompleteProfile(isCompleteProfile(nextProfile));
    }

    loadProfile();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, navigate, user]);

  const interests = useMemo(
    () =>
      profile.interests
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [profile.interests],
  );

  async function uploadProfilePhoto() {
    if (!photoFile || !user) return profile.profile_photo_url;

    const extension = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(filePath, photoFile, { cacheControl: "3600", upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    if (!isCompleteProfile(profile) && !photoFile) {
      toast.error("Completa tutti i campi obbligatori e carica una foto profilo");
      return;
    }

    const age = Number(profile.age);
    if (!Number.isFinite(age) || age < 18 || age > 99) {
      toast.error("Inserisci un'età valida tra 18 e 99 anni");
      return;
    }

    setSaving(true);

    try {
      const profilePhotoUrl = await uploadProfilePhoto();

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: profile.display_name.trim(),
        age,
        gender: profile.gender,
        city: profile.city.trim(),
        nationality: profile.nationality,
        spoken_languages: profile.spoken_languages,
        preferred_language: profile.preferred_language,
        interests,
        bio: profile.bio.trim(),
        preferred_mode: profile.preferred_mode,
        profile_photo_url: profilePhotoUrl,
        matching_preferences: { preferred_mode: profile.preferred_mode },
        avatar_color: profile.avatar_color,
      });

      if (error) throw error;

      const savedProfile = { ...profile, profile_photo_url: profilePhotoUrl };
      setProfile(savedProfile);
      setPhotoPreview(profilePhotoUrl);
      setPhotoFile(null);
      setHasCompleteProfile(true);
      setEditing(false);
      toast.success("Profilo salvato");
    } catch (error: any) {
  console.log("FULL ERROR:", error);

  toast.error("Profilo non salvato", {
    description:
      error?.message ||
      error?.error_description ||
      JSON.stringify(error) ||
      "Errore sconosciuto",
  });
} finally {
  setSaving(false);
}

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un file immagine");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  const showForm = !hasCompleteProfile || editing;

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        {loading ? (
          <div className="mt-8 flex items-center gap-2 glass rounded-3xl p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carico profilo...
          </div>
        ) : showForm ? (
          <ProfileForm
            profile={profile}
            photoPreview={photoPreview}
            saving={saving}
            isEditing={editing}
            onSubmit={saveProfile}
            onPhotoChange={onPhotoChange}
            onCancel={() => {
              setEditing(false);
              setPhotoPreview(profile.profile_photo_url);
              setPhotoFile(null);
            }}
            setProfile={setProfile}
          />
        ) : (
          <ProfileView profile={profile} interests={interests} onEdit={() => setEditing(true)} />
        )}
      </main>
    </div>
  );
}

function isCompleteProfile(profile: EditableProfile) {
  return Boolean(
    profile.display_name.trim() &&
    profile.age &&
    profile.gender &&
    profile.nationality &&
    profile.city.trim() &&
    profile.spoken_languages.length > 0 &&
    profile.preferred_language &&
    profile.interests.trim() &&
    profile.bio.trim() &&
    profile.preferred_mode &&
    profile.profile_photo_url,
  );
}

function ProfileForm({
  profile,
  photoPreview,
  saving,
  isEditing,
  onSubmit,
  onPhotoChange,
  onCancel,
  setProfile,
}: {
  profile: EditableProfile;
  photoPreview: string;
  saving: boolean;
  isEditing: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  setProfile: Dispatch<SetStateAction<EditableProfile>>;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="glass-strong rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest text-primary">
            {isEditing ? "Modifica profilo" : "Creazione profilo"}
          </p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
            Racconta chi sei prima del prossimo round.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Foto, lingue e preferenze aiutano Giogo a creare match più naturali e conversazioni meno
            casuali.
          </p>

          <label className="mt-8 block">
            <span className="mb-3 block text-xs uppercase tracking-widest text-muted-foreground">
              Foto profilo
            </span>
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
              <div className="aspect-square bg-white/[0.03]">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Anteprima profilo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-center text-muted-foreground">
                    <div>
                      <Camera className="mx-auto h-10 w-10" />
                      <p className="mt-3 text-sm">Carica una foto dal dispositivo</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4">
                <input
                  id="profile-photo"
                  type="file"
                  accept="image/*"
                  onChange={onPhotoChange}
                  className="sr-only"
                />
                <label
                  htmlFor="profile-photo"
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold transition hover:bg-white/[0.08]"
                >
                  <ImagePlus className="h-4 w-4" />
                  Scegli immagine
                </label>
              </div>
            </div>
          </label>
        </section>

        <form onSubmit={onSubmit} className="glass rounded-3xl p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Nickname"
              value={profile.display_name}
              onChange={(value) => setProfile((p) => ({ ...p, display_name: value }))}
            />
            <TextField
              label="Età"
              type="number"
              value={profile.age}
              onChange={(value) => setProfile((p) => ({ ...p, age: value }))}
            />
            <SearchSelect
              label="Sesso"
              value={profile.gender}
              options={["Donna", "Uomo", "Non-binary", "Preferisco non dirlo"]}
              onChange={(value) => setProfile((p) => ({ ...p, gender: value }))}
            />
            <SearchSelect
              label="Nazionalità"
              value={profile.nationality}
              options={NATIONALITIES}
              onChange={(value) => setProfile((p) => ({ ...p, nationality: value }))}
            />
            <TextField
              label="Città"
              value={profile.city}
              onChange={(value) => setProfile((p) => ({ ...p, city: value }))}
            />
            <SearchSelect
              label="Lingua da praticare"
              value={profile.preferred_language}
              options={LANGUAGES}
              onChange={(value) => setProfile((p) => ({ ...p, preferred_language: value }))}
            />
            <MultiSearchSelect
              className="sm:col-span-2"
              label="Lingue parlate"
              values={profile.spoken_languages}
              options={LANGUAGES}
              onChange={(values) => setProfile((p) => ({ ...p, spoken_languages: values }))}
            />
            <TextField
              className="sm:col-span-2"
              label="Interessi"
              placeholder="Musica, viaggi, sport, cinema"
              value={profile.interests}
              onChange={(value) => setProfile((p) => ({ ...p, interests: value }))}
            />
            <label className="sm:col-span-2">
              <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
                Breve bio
              </span>
              <textarea
                value={profile.bio}
                onChange={(event) => setProfile((p) => ({ ...p, bio: event.target.value }))}
                rows={4}
                placeholder="Due righe sincere su cosa ti piace fare e che tipo di conversazioni cerchi."
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
              />
            </label>
            <div className="sm:col-span-2">
              <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
                Modalità preferita
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["chat", "vocale"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, preferred_mode: mode }))}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      profile.preferred_mode === mode
                        ? "border-primary/60 bg-primary/15 text-foreground"
                        : "border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07]"
                    }`}
                  >
                    <span className="font-semibold capitalize">{mode}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {mode === "chat" ? "Messaggi durante il round" : "Conversazione vocale live"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {isEditing && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-semibold transition hover:bg-white/[0.07]"
              >
                <X className="h-4 w-4" />
                Annulla
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-[2] items-center justify-center gap-2 rounded-full gradient-primary px-6 py-4 font-semibold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditing ? "Salva modifiche" : "Crea profilo"}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

function ProfileView({
  profile,
  interests,
  onEdit,
}: {
  profile: EditableProfile;
  interests: string[];
  onEdit: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-strong overflow-hidden rounded-3xl">
          <div className="aspect-[4/5] bg-white/[0.04]">
            <img
              src={profile.profile_photo_url}
              alt={profile.display_name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-primary">Profilo</p>
                <h1 className="mt-2 text-4xl font-semibold">
                  {profile.display_name}, {profile.age}
                </h1>
              </div>
              <button
                onClick={onEdit}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.08]"
              >
                <Edit3 className="h-4 w-4" />
                Modifica
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge icon={<MapPin className="h-3.5 w-3.5" />}>{profile.city}</Badge>
              <Badge icon={<Sparkles className="h-3.5 w-3.5" />}>{profile.nationality}</Badge>
              <Badge icon={<Heart className="h-3.5 w-3.5" />}>{profile.preferred_mode}</Badge>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <InfoBlock title="Bio">{profile.bio}</InfoBlock>
          <InfoBlock title="Lingue">
            <div className="flex flex-wrap gap-2">
              {profile.spoken_languages.map((language) => (
                <Badge key={language} icon={<Languages className="h-3.5 w-3.5" />}>
                  {language}
                </Badge>
              ))}
              <Badge icon={<Check className="h-3.5 w-3.5" />}>
                Pratica {profile.preferred_language}
              </Badge>
            </div>
          </InfoBlock>
          <InfoBlock title="Interessi">
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Badge key={interest}>{interest}</Badge>
              ))}
            </div>
          </InfoBlock>
          <InfoBlock title="Dettagli">
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Sesso" value={profile.gender} />
              <Detail label="Modalità preferita" value={profile.preferred_mode} />
              <Detail label="Nazionalità" value={profile.nationality} />
              <Detail label="Città" value={profile.city} />
            </div>
          </InfoBlock>
        </section>
      </div>
    </motion.div>
  );
}

function TextField({
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
      />
    </label>
  );
}

function SearchSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = options
    .filter((option) => option.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 80);

  return (
    <div className="relative">
      <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm outline-none transition hover:bg-white/[0.07]"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || "Seleziona"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-white/10 bg-popover p-2 shadow-2xl">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-2 max-h-56 overflow-auto">
            {filtered.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              >
                {option}
                {value === option && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MultiSearchSelect({
  label,
  values,
  options,
  onChange,
  className = "",
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = options
    .filter(
      (option) => option.toLowerCase().includes(query.toLowerCase()) && !values.includes(option),
    )
    .slice(0, 80);

  return (
    <div className={className}>
      <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(values.filter((item) => item !== value))}
              className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-foreground"
            >
              {value}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca e aggiungi lingue..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {query && (
          <div className="mt-2 max-h-48 overflow-auto">
            {filtered.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange([...values, option]);
                  setQuery("");
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass rounded-3xl p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

function Badge({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-foreground">
      {icon}
      {children}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold text-foreground capitalize">{value}</p>
    </div>
  );
}
