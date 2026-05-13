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
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  Mic,
  MessageCircle,
  Navigation,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUser, requireAuth, type AuthUser } from "@/lib/auth";
import { getBrowserPosition, saveUserLocation } from "@/lib/geo";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/profile")({
  beforeLoad: requireAuth,
  component: ProfilePage,
});

type PreferredMode = "chat" | "voice";

type EditableProfile = {
  display_name: string;
  age: string;
  city: string;
  bio: string;
  interests: string;
  looking_for: string;
  hobbies: string;
  prompt_love: string;
  prompt_agree: string;
  prompt_green_flag: string;
  prompt_spontaneous: string;
  preferred_mode: PreferredMode | "";
  profile_photo_url: string;
  latitude: string;
  longitude: string;
  avatar_color: string;
};

const DEFAULT_PROFILE: EditableProfile = {
  display_name: "",
  age: "",
  city: "",
  bio: "",
  interests: "",
  looking_for: "",
  hobbies: "",
  prompt_love: "",
  prompt_agree: "",
  prompt_green_flag: "",
  prompt_spontaneous: "",
  preferred_mode: "",
  profile_photo_url: "",
  latitude: "",
  longitude: "",
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
  const { t } = useLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<EditableProfile>(DEFAULT_PROFILE);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [hasSavedProfile, setHasSavedProfile] = useState(false);

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

      const nextProfile: EditableProfile = {
        display_name: data?.display_name ?? currentUser.email?.split("@")[0] ?? "",
        age: data?.age?.toString() ?? "",
        city: data?.city ?? "",
        bio: data?.bio ?? "",
        interests: data?.interests?.join(", ") ?? "",
        looking_for: data?.looking_for ?? "",
        hobbies: data?.hobbies?.join(", ") ?? "",
        prompt_love: data?.prompt_love ?? "",
        prompt_agree: data?.prompt_agree ?? "",
        prompt_green_flag: data?.prompt_green_flag ?? "",
        prompt_spontaneous: data?.prompt_spontaneous ?? "",
        preferred_mode:
          data?.preferred_mode === "voice" || data?.preferred_mode === "chat"
            ? data.preferred_mode
            : "",
        profile_photo_url: data?.profile_photo_url ?? "",
        latitude: data?.latitude?.toString() ?? "",
        longitude: data?.longitude?.toString() ?? "",
        avatar_color: data?.avatar_color ?? DEFAULT_PROFILE.avatar_color,
      };

      setProfile(nextProfile);
      setPhotoPreview(nextProfile.profile_photo_url);
      setHasSavedProfile(isCompleteProfile(nextProfile));
    }
    loadProfile();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, navigate, user]);

  const interests = useMemo(() => splitList(profile.interests), [profile.interests]);
  const hobbies = useMemo(() => splitList(profile.hobbies), [profile.hobbies]);
  const showForm = !hasSavedProfile || editing;

  async function uploadProfilePhoto() {
    if (!photoFile || !user) return profile.profile_photo_url;
    const extension = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${user.id}/profile.${extension}`;
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
      toast.error("Completa i campi principali e carica una foto profilo");
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
      const latitude = Number(profile.latitude);
      const longitude = Number(profile.longitude);
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: profile.display_name.trim(),
        age,
        city: profile.city.trim(),
        bio: profile.bio.trim(),
        interests,
        looking_for: profile.looking_for.trim(),
        hobbies,
        prompt_love: profile.prompt_love.trim(),
        prompt_agree: profile.prompt_agree.trim(),
        prompt_green_flag: profile.prompt_green_flag.trim(),
        prompt_spontaneous: profile.prompt_spontaneous.trim(),
        preferred_mode: profile.preferred_mode,
        profile_photo_url: profilePhotoUrl,
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
        matching_preferences: {
          preferred_mode: profile.preferred_mode,
          looking_for: profile.looking_for,
        },
        avatar_color: profile.avatar_color,
      });
      if (error) throw error;

      const savedProfile = { ...profile, profile_photo_url: profilePhotoUrl };
      setProfile(savedProfile);
      setPhotoPreview(profilePhotoUrl);
      setPhotoFile(null);
      setHasSavedProfile(true);
      setEditing(false);
      toast.success(t("profile.saved"));
    } catch (error) {
      toast.error("Profilo non salvato", {
        description: error instanceof Error ? error.message : "Riprova tra poco",
      });
    } finally {
      setSaving(false);
    }
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

  async function enableLocation() {
    if (!user) return;
    setLocating(true);
    try {
      const coordinates = await getBrowserPosition();
      await saveUserLocation(user.id, coordinates);
      setProfile((current) => ({
        ...current,
        latitude: coordinates.latitude.toString(),
        longitude: coordinates.longitude.toString(),
      }));
      toast.success(t("geo.saved"));
    } catch (error) {
      toast.error(t("geo.denied"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        {loading ? (
          <div className="mt-8 flex items-center gap-2 glass rounded-3xl p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : showForm ? (
          <ProfileForm
            profile={profile}
            photoPreview={photoPreview}
            saving={saving}
            locating={locating}
            isEditing={editing || hasSavedProfile}
            onSubmit={saveProfile}
            onPhotoChange={onPhotoChange}
            onLocation={enableLocation}
            onCancel={() => {
              setEditing(false);
              setPhotoPreview(profile.profile_photo_url);
              setPhotoFile(null);
            }}
            setProfile={setProfile}
            t={t}
          />
        ) : (
          <ProfileView
            profile={profile}
            interests={interests}
            hobbies={hobbies}
            onEdit={() => setEditing(true)}
            t={t}
          />
        )}
      </main>
    </div>
  );
}

function isCompleteProfile(profile: EditableProfile) {
  return Boolean(
    profile.display_name.trim() &&
    profile.age &&
    profile.city.trim() &&
    profile.bio.trim() &&
    profile.interests.trim() &&
    profile.looking_for.trim() &&
    profile.hobbies.trim() &&
    profile.preferred_mode &&
    profile.profile_photo_url,
  );
}

function ProfileForm({
  profile,
  photoPreview,
  saving,
  locating,
  isEditing,
  onSubmit,
  onPhotoChange,
  onLocation,
  onCancel,
  setProfile,
  t,
}: {
  profile: EditableProfile;
  photoPreview: string;
  saving: boolean;
  locating: boolean;
  isEditing: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLocation: () => void;
  onCancel: () => void;
  setProfile: Dispatch<SetStateAction<EditableProfile>>;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]"
    >
      <section className="glass-strong rounded-3xl p-6">
        <p className="text-xs uppercase tracking-widest text-primary">
          {isEditing ? t("profile.edit") : t("profile.create")}
        </p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
          Un profilo essenziale, personale, leggibile.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Una sola foto profilo, prompt sinceri e dettagli utili per match locali e conversazioni
          rapide.
        </p>

        <label className="mt-8 block">
          <span className="mb-3 block text-xs uppercase tracking-widest text-muted-foreground">
            {t("profile.photo")}
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

        <button
          onClick={onLocation}
          disabled={locating}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold transition hover:bg-white/[0.08] disabled:opacity-50"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          {t("geo.enable")}
        </button>
      </section>

      <form onSubmit={onSubmit} className="glass rounded-3xl p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("profile.name")}
            value={profile.display_name}
            onChange={(value) => setProfile((p) => ({ ...p, display_name: value }))}
          />
          <TextField
            label={t("profile.age")}
            type="number"
            value={profile.age}
            onChange={(value) => setProfile((p) => ({ ...p, age: value }))}
          />
          <TextField
            label={t("profile.city")}
            value={profile.city}
            onChange={(value) => setProfile((p) => ({ ...p, city: value }))}
          />
          <TextField
            label={t("profile.looking_for")}
            value={profile.looking_for}
            placeholder="Una relazione, nuove persone, eventi..."
            onChange={(value) => setProfile((p) => ({ ...p, looking_for: value }))}
          />
          <TextArea
            className="sm:col-span-2"
            label={t("profile.bio")}
            value={profile.bio}
            onChange={(value) => setProfile((p) => ({ ...p, bio: value }))}
          />
          <TextField
            className="sm:col-span-2"
            label={t("profile.interests")}
            placeholder="Musica, viaggi, cinema"
            value={profile.interests}
            onChange={(value) => setProfile((p) => ({ ...p, interests: value }))}
          />
          <TextField
            className="sm:col-span-2"
            label={t("profile.hobbies")}
            placeholder="Cucina, trekking, fotografia"
            value={profile.hobbies}
            onChange={(value) => setProfile((p) => ({ ...p, hobbies: value }))}
          />

          <div className="sm:col-span-2">
            <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
              {t("profile.preferred_mode")}
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              <ModeButton
                active={profile.preferred_mode === "chat"}
                icon={<MessageCircle className="h-4 w-4" />}
                label={t("dashboard.chat")}
                onClick={() => setProfile((p) => ({ ...p, preferred_mode: "chat" }))}
              />
              <ModeButton
                active={profile.preferred_mode === "voice"}
                icon={<Mic className="h-4 w-4" />}
                label={t("dashboard.voice")}
                onClick={() => setProfile((p) => ({ ...p, preferred_mode: "voice" }))}
              />
            </div>
          </div>

          <PromptField
            label={t("profile.prompt_1")}
            value={profile.prompt_love}
            onChange={(value) => setProfile((p) => ({ ...p, prompt_love: value }))}
          />
          <PromptField
            label={t("profile.prompt_2")}
            value={profile.prompt_agree}
            onChange={(value) => setProfile((p) => ({ ...p, prompt_agree: value }))}
          />
          <PromptField
            label={t("profile.prompt_3")}
            value={profile.prompt_green_flag}
            onChange={(value) => setProfile((p) => ({ ...p, prompt_green_flag: value }))}
          />
          <PromptField
            label={t("profile.prompt_4")}
            value={profile.prompt_spontaneous}
            onChange={(value) => setProfile((p) => ({ ...p, prompt_spontaneous: value }))}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {isEditing ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-semibold transition hover:bg-white/[0.07]"
            >
              <X className="h-4 w-4" />
              {t("common.cancel")}
            </button>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex flex-[2] items-center justify-center gap-2 rounded-full gradient-primary px-6 py-4 font-semibold text-primary-foreground shadow-glow disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditing ? t("profile.update") : t("profile.create")}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function ProfileView({
  profile,
  interests,
  hobbies,
  onEdit,
  t,
}: {
  profile: EditableProfile;
  interests: string[];
  hobbies: string[];
  onEdit: () => void;
  t: (key: string) => string;
}) {
  const prompts = [
    [t("profile.prompt_1"), profile.prompt_love],
    [t("profile.prompt_2"), profile.prompt_agree],
    [t("profile.prompt_3"), profile.prompt_green_flag],
    [t("profile.prompt_4"), profile.prompt_spontaneous],
  ].filter(([, value]) => value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
    >
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
              {t("profile.edit")}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge icon={<MapPin className="h-3.5 w-3.5" />}>{profile.city}</Badge>
            <Badge icon={<Heart className="h-3.5 w-3.5" />}>{profile.looking_for}</Badge>
            <Badge icon={<Sparkles className="h-3.5 w-3.5" />}>{profile.preferred_mode}</Badge>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <InfoBlock title={t("profile.bio")}>{profile.bio}</InfoBlock>
        <InfoBlock title={t("profile.interests")}>
          <TagList items={interests} />
        </InfoBlock>
        <InfoBlock title={t("profile.hobbies")}>
          <TagList items={hobbies} />
        </InfoBlock>
        {prompts.map(([label, value]) => (
          <InfoBlock key={label} title={label}>
            {value}
          </InfoBlock>
        ))}
      </section>
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

function TextArea({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
      />
    </label>
  );
}

function PromptField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return <TextArea label={label} value={value} onChange={onChange} className="sm:col-span-1" />;
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${active ? "border-primary/60 bg-primary/15" : "border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07]"}`}
    >
      {icon}
      <span className="font-semibold">{label}</span>
    </button>
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

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item}>{item}</Badge>
      ))}
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
