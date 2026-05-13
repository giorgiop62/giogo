import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Loader2, Lock, Mail } from "lucide-react";
import { FloatingBackground } from "@/components/viberound/Background";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";
import { redirectIfAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  beforeLoad: redirectIfAuthenticated,
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("auth.password_mismatch"));
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp(
      { email, password },
      { emailRedirectTo: `${window.location.origin}/auth/callback` },
    );
    setLoading(false);

    if (error) {
      toast.error(error.message || t("auth.login_error"));
      return;
    }

    if (data.session?.user) {
      toast.success(t("auth.signup_success"));
      navigate({ to: "/dashboard" });
      return;
    }

    setEmailSent(true);
    toast.success(t("auth.check_email_confirmation"));
  }

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <main className="mx-auto grid min-h-screen max-w-5xl items-center px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-glow lg:grid-cols-[0.9fr_1.1fr]"
        >
          <aside className="hidden bg-[radial-gradient(circle_at_30%_20%,rgba(244,114,182,.40),transparent_35%),linear-gradient(160deg,rgba(17,24,39,.95),rgba(88,28,135,.28))] p-8 lg:block">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/75"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <h1 className="mt-20 text-5xl font-semibold leading-tight">{t("landing.title")}</h1>
            <p className="mt-5 text-sm leading-6 text-white/65">{t("landing.subtitle")}</p>
          </aside>

          <section className="glass-strong p-6 sm:p-8">
            <p className="text-xs uppercase tracking-widest text-primary">
              {t("auth.signup_title")}
            </p>
            <h2 className="mt-3 text-3xl font-semibold">{t("auth.signup_title")}</h2>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <AuthField icon={<Mail className="h-4 w-4" />} label={t("auth.email_label")}>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="name@example.com"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  required
                />
              </AuthField>
              <AuthField icon={<Lock className="h-4 w-4" />} label={t("auth.password_label")}>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="********"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  required
                />
              </AuthField>
              <AuthField
                icon={<Lock className="h-4 w-4" />}
                label={t("auth.confirm_password_label")}
              >
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  placeholder="********"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  required
                />
              </AuthField>

              <button
                type="submit"
                disabled={loading || !email || !password || !confirmPassword}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("auth.signup_button")}
              </button>
            </form>

            {emailSent ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-100">
                {t("auth.check_email_confirmation")}
              </div>
            ) : null}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("auth.have_account")}{" "}
              <Link to="/login" className="font-semibold text-primary">
                {t("auth.login_button")}
              </Link>
            </p>
          </section>
        </motion.div>
      </main>
    </div>
  );
}

function AuthField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-muted-foreground focus-within:border-primary/60">
        {icon}
        {children}
      </div>
    </label>
  );
}
