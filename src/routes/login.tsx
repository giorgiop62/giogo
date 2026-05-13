import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Lock, Mail, Loader2 } from "lucide-react";
import { FloatingBackground } from "@/components/viberound/Background";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";
import { redirectIfAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  beforeLoad: redirectIfAuthenticated,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(t("auth.login_error"), { description: error.message });
      return;
    }

    if (data.session?.user) {
      toast.success(t("auth.login_success"));
      navigate({ to: "/dashboard" });
      return;
    }

    toast.success(t("auth.login_success"));
    navigate({ to: "/dashboard" });
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      toast.error("Inserisci la tua email per recuperare la password");
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setResetLoading(false);

    if (error) {
      toast.error("Impossibile inviare il recupero password", { description: error.message });
      return;
    }

    toast.success("Email di recupero password inviata");
  }

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-24 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mx-auto rounded-3xl border border-white/10 bg-white/5 p-8 shadow-glow"
        >
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary">
                {t("auth.login_title")}
              </p>
              <h1 className="mt-3 text-3xl font-semibold">{t("auth.login_title")}</h1>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {t("auth.signup_title")}
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-sm font-medium text-muted-foreground">
              <span className="text-sm text-foreground">{t("auth.email_label")}</span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="name@example.com"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  required
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-muted-foreground">
              <span className="text-sm text-foreground">{t("auth.password_label")}</span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="********"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  required
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={loading || resetLoading || !email.trim() || !password.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("auth.login_button")}
                </>
              ) : (
                t("auth.login_button")
              )}
            </button>

            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={loading || resetLoading}
              className="w-full text-center text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resetLoading ? t("common.loading") : t("auth.forgot")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.no_account")}{" "}
            <Link to="/register" className="font-semibold text-primary hover:text-primary/80">
              {t("auth.signup_button")}
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
