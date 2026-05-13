import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  CalendarDays,
  Heart,
  MapPin,
  MessageCircle,
  Mic,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { FloatingBackground } from "@/components/viberound/Background";
import { Nav } from "@/components/viberound/Nav";
import { redirectIfAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/")({
  beforeLoad: redirectIfAuthenticated,
  component: HomePage,
});

function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <section className="grid min-h-[calc(100vh-118px)] items-center gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("landing.badge")}
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[0.98] sm:text-7xl">
              {t("landing.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              {t("landing.subtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full gradient-primary px-6 py-4 font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01]"
              >
                <UserPlus className="h-5 w-5" />
                {t("landing.register")}
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-6 py-4 font-semibold transition hover:bg-white/[0.08]"
              >
                {t("landing.login")}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong rounded-[2rem] p-4"
          >
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
              <div className="aspect-[4/5] bg-[radial-gradient(circle_at_30%_20%,rgba(244,114,182,.45),transparent_34%),radial-gradient(circle_at_75%_45%,rgba(34,211,238,.30),transparent_32%),linear-gradient(150deg,rgba(15,23,42,.96),rgba(63,18,49,.72))] p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                    live
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                    3 min voice
                  </span>
                </div>
                <div className="mt-28 rounded-3xl bg-black/30 p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="grid h-14 w-14 place-items-center rounded-full gradient-primary text-xl font-semibold">
                      G
                    </div>
                    <div>
                      <p className="font-semibold">{t("landing.preview_city")}</p>
                      <p className="text-sm text-white/65">4.8 km · tonight</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <PreviewPill
                      icon={<MessageCircle className="h-4 w-4" />}
                      text={t("landing.preview_chat")}
                    />
                    <PreviewPill
                      icon={<Mic className="h-4 w-4" />}
                      text={t("landing.preview_voice")}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {[t("landing.how_1"), t("landing.how_2"), t("landing.how_3")].map((text, index) => (
            <div key={text} className="glass rounded-3xl p-5">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-primary">
                {index === 0 ? (
                  <Heart className="h-5 w-5" />
                ) : index === 1 ? (
                  <MapPin className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </div>
              <h2 className="mt-4 text-xl font-semibold">{t("landing.how_title")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <PreviewPanel title={t("landing.events")} icon={<CalendarDays className="h-5 w-5" />}>
            <PreviewLine title="Aperitivo in centro" meta="Chat + voce · entro 50 km" />
            <PreviewLine title="Sunday coffee walk" meta="Locale · 12 posti" />
          </PreviewPanel>
          <PreviewPanel title={t("landing.people")} icon={<ShieldCheck className="h-5 w-5" />}>
            <PreviewLine
              title="Una foto, profili reali"
              meta="Solo utenti registrati e niente gallery infinite"
            />
            <PreviewLine title="Match permanenti" meta="Chat sbloccata dopo interesse reciproco" />
          </PreviewPanel>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-muted-foreground">
        {t("app.footer", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}

function PreviewPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold">
      {icon}
      {text}
    </div>
  );
}

function PreviewPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <div className="text-secondary">{icon}</div>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      <div className="mt-5 grid gap-3">{children}</div>
    </div>
  );
}

function PreviewLine({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
    </div>
  );
}
