import { createFileRoute, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Heart,
  Video,
  MessageCircle,
  Sparkles,
  Users,
  Zap,
  Shield,
  Star,
  ArrowRight,
} from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { fakeAuth, type AuthUser } from "@/integrations/fakeAuth";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});

function useTicker(initial: number, range = 5, interval = 2200) {
  const [n, setN] = useState(initial);
  useEffect(() => {
    const id = setInterval(
      () => setN((v) => Math.max(initial - 30, v + Math.round((Math.random() - 0.4) * range))),
      interval,
    );
    return () => clearInterval(id);
  }, [initial, range, interval]);
  return n;
}

function Landing() {
  const online = useTicker(2438, 12);
  const rooms = useTicker(74, 4);
  const [user, setUser] = useState<AuthUser | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      const { data } = await fakeAuth.getSession();
      if (!alive) return;
      setUser(data.session?.user ?? null);
    }

    loadSession();

    const { data: listener } = fakeAuth.onAuthStateChange((_event, session) => {
      if (alive) setUser(session.session ?? null);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await fakeAuth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="glass mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {t('landing.live').replace('{count}', online.toLocaleString())}
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            {t('landing.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            {t('landing.subtitle')}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-2 rounded-full gradient-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
                >
                  {t('landing.enter_lobby')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <button
                  onClick={signOut}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-7 py-3.5 font-semibold text-primary-foreground shadow-glow transition hover:bg-white/[0.07]"
                >
                  {t('landing.logout')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </>
            ) : (
              <div className="grid w-full gap-3 sm:grid-cols-2">
                <Link
                  to="/login"
                  className="rounded-full gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow text-center transition hover:scale-105"
                >
                  {t('auth.login_button')}
                </Link>
                <Link
                  to="/signup"
                  className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow text-center transition hover:bg-white/[0.07]"
                >
                  {t('auth.signup_button')}
                </Link>
              </div>
            )}
            <a
              href="#how"
              className="glass rounded-full px-6 py-3.5 text-sm font-medium hover:bg-white/10"
            >
              {t('landing.how_it_works')}
            </a>
          </div>
        </motion.div>

        {/* live stats card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <StatCard
            icon={<Users className="h-4 w-4" />}
            labelKey="landing.online"
            value={online.toLocaleString()}
          />
          <StatCard
            icon={<Zap className="h-4 w-4" />}
            labelKey="landing.active_rooms"
            value={rooms.toString()}
            accent
          />
          <StatCard icon={<Heart className="h-4 w-4" />} labelKey="landing.matches_today" value="1,284" />
          <StatCard icon={<Star className="h-4 w-4" />} labelKey="landing.avg_rating" value="4.9" />
        </motion.div>

        {/* preview floating cards */}
        <div className="relative mx-auto mt-20 hidden h-72 max-w-4xl sm:block">
          <FloatingCard
            delay={0}
            className="left-0 top-0 rotate-[-6deg]"
            name="Mia, 26"
            tag="Loves rooftops"
          />
          <FloatingCard
            delay={0.2}
            className="left-1/2 top-6 -translate-x-1/2 rotate-[2deg] scale-110 z-10"
            name="Noah, 28"
            tag="Climber · espresso nerd"
            highlight
          />
          <FloatingCard
            delay={0.4}
            className="right-0 top-2 rotate-[6deg]"
            name="Léa, 24"
            tag="Plays bass"
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t('landing.how_title')}
          </p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-5xl">{t('landing.round_beats')}</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Step
            n="01"
            icon={<Sparkles className="h-5 w-5" />}
            title={t('landing.build_vibe')}
            desc={t('landing.build_desc')}
          />
          <Step
            n="02"
            icon={<Users className="h-5 w-5" />}
            title={t('landing.drop_room')}
            desc={t('landing.drop_desc')}
          />
          <Step
            n="03"
            icon={<Heart className="h-5 w-5" />}
            title={t('landing.reveal_matches')}
            desc={t('landing.reveal_desc')}
          />
        </div>
      </section>

      {/* MODES */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <ModeCard
            icon={<MessageCircle className="h-5 w-5" />}
            tone="primary"
            title={t('landing.chat_mode')}
            time={t('landing.chat_time')}
            desc={t('landing.chat_desc')}
          />
          <ModeCard
            icon={<Video className="h-5 w-5" />}
            tone="cool"
            title={t('landing.video_mode')}
            time={t('landing.video_time')}
            desc={t('landing.video_desc')}
          />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
            {t('landing.from_rounds')}
          </p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-5xl">{t('landing.people_met')}</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Quote
            name="Sofia, 27"
            text="Matched in my second round. We've been together six months now — still feels surreal."
          />
          <Quote
            name="Aman, 31"
            text="Way less awkward than apps. The timer takes the pressure off, the video rounds are fun."
          />
          <Quote
            name="Camille, 24"
            text="Found friends, found a date. The vibe is genuinely different from anything else."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-10 text-center sm:p-16">
          <div
            className="absolute inset-0 -z-10 opacity-60"
            style={{ background: "var(--gradient-hero)" }}
          />
          <Shield className="mx-auto h-6 w-6 text-secondary" />
          <h2 className="mt-4 text-3xl font-semibold sm:text-5xl">
            {t('landing.cta_title')}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            {t('landing.cta_desc')}
          </p>
          <Link
            to="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-full gradient-primary px-8 py-4 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            {t('landing.enter_lobby_2')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-muted-foreground">
        {t('app.footer').replace('{year}', new Date().getFullYear().toString())}
      </footer>
    </div>
  );
}

function StatCard({
  icon,
  labelKey,
  value,
  accent,
}: {
  icon: React.ReactNode;
  labelKey: string;
  value: string;
  accent?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className={`glass rounded-2xl p-4 ${accent ? "ring-glow" : ""}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {t(labelKey)}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}

function FloatingCard({
  name,
  tag,
  className = "",
  delay = 0,
  highlight = false,
}: {
  name: string;
  tag: string;
  className?: string;
  delay?: number;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      className={`absolute h-72 w-52 ${className}`}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut" }}
        className={`glass-strong relative h-full w-full overflow-hidden rounded-3xl ${highlight ? "shadow-glow" : ""}`}
      >
        <div
          className="absolute inset-0"
          style={{
            background: highlight
              ? "linear-gradient(160deg, oklch(0.55 0.22 12 / 0.7), oklch(0.45 0.22 330 / 0.6))"
              : "linear-gradient(160deg, oklch(0.40 0.10 320 / 0.6), oklch(0.30 0.10 200 / 0.5))",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">{name}</div>
              <div className="text-xs text-muted-foreground">{tag}</div>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full gradient-primary">
              <Heart className="h-3.5 w-3.5 fill-white text-white" />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Step({
  n,
  title,
  desc,
  icon,
}: {
  n: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass group rounded-3xl p-6 transition-all hover:bg-white/[0.07]">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm text-muted-foreground">{n}</span>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-primary">
          {icon}
        </div>
      </div>
      <h3 className="mt-6 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  time,
  desc,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  time: string;
  desc: string;
  tone: "primary" | "cool";
}) {
  return (
    <div
      className={`glass-strong relative overflow-hidden rounded-3xl p-8 ${tone === "primary" ? "shadow-glow" : "shadow-glow-cool"}`}
    >
      <div
        className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-50 blur-2xl"
        style={{
          background: tone === "primary" ? "var(--gradient-primary)" : "var(--gradient-cool)",
        }}
      />
      <div
        className={`grid h-11 w-11 place-items-center rounded-2xl ${tone === "primary" ? "gradient-primary" : "gradient-cool"} text-primary-foreground`}
      >
        {icon}
      </div>
      <div className="mt-5 flex items-baseline justify-between">
        <h3 className="text-2xl font-semibold">{title}</h3>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{time}</span>
      </div>
      <p className="mt-3 text-muted-foreground">{desc}</p>
    </div>
  );
}

function Quote({ name, text }: { name: string; text: string }) {
  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex gap-0.5 text-primary">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-current" />
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed">"{text}"</p>
      <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">— {name}</p>
    </div>
  );
}
