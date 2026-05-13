import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Loader2, LogOut, Trash2, UserX } from "lucide-react";
import { useState, type ReactNode } from "react";
import { FloatingBackground } from "@/components/viberound/Background";
import { Nav } from "@/components/viberound/Nav";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function logout() {
    setLoadingAction("logout");
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  async function deleteProfile() {
    const user = await getCurrentUser();
    if (!user) return;
    setLoadingAction("profile");
    const { error } = await supabase.from("profiles").delete().eq("id", user.id);
    setLoadingAction(null);
    if (error) {
      toast.error("Profilo non eliminato", { description: error.message });
      return;
    }
    toast.success("Profilo eliminato");
    navigate({ to: "/profile" });
  }

  async function deleteAccount() {
    setLoadingAction("account");
    toast.error("Eliminazione account non eseguita dal client", {
      description:
        "Serve una Edge Function Supabase con service role per cancellare auth.users in sicurezza.",
    });
    setLoadingAction(null);
  }

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-widest text-primary">{t("settings.title")}</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{t("settings.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("settings.subtitle")}</p>
        </motion.div>

        <section className="mt-8 grid gap-3">
          <ActionCard
            icon={<LogOut className="h-5 w-5" />}
            title={t("nav.logout")}
            tone="neutral"
            loading={loadingAction === "logout"}
            onClick={logout}
          />
          <ActionCard
            icon={<UserX className="h-5 w-5" />}
            title={t("settings.delete_profile")}
            tone="danger"
            loading={loadingAction === "profile"}
            onClick={deleteProfile}
          />
          <ActionCard
            icon={<Trash2 className="h-5 w-5" />}
            title={t("settings.delete_account")}
            tone="danger"
            loading={loadingAction === "account"}
            onClick={deleteAccount}
          />
        </section>
      </main>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  tone,
  loading,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  tone: "neutral" | "danger";
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`glass-strong flex items-center justify-between rounded-3xl p-5 text-left transition hover:bg-white/[0.08] disabled:opacity-50 ${tone === "danger" ? "text-red-200" : ""}`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${tone === "danger" ? "bg-red-500/10 text-red-200" : "bg-white/10 text-primary"}`}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
        </span>
        <span className="font-semibold">{title}</span>
      </span>
    </button>
  );
}
