import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  CalendarDays,
  HeartHandshake,
  LogIn,
  MessageCircle,
  Sparkles,
  UserPlus,
  Video,
} from "lucide-react";
import { FloatingBackground } from "@/components/viberound/Background";
import { Nav } from "@/components/viberound/Nav";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <section className="grid min-h-[calc(100vh-132px)] items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Speed dating live, chat e voce
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-tight sm:text-7xl">Giogo</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Una piattaforma per incontrare persone nuove attraverso round brevi, matchmaking
              intelligente e stanze live pensate per conversazioni naturali.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full gradient-primary px-6 py-4 font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01]"
              >
                <UserPlus className="h-5 w-5" />
                Registrati
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-6 py-4 font-semibold transition hover:bg-white/[0.08]"
              >
                <LogIn className="h-5 w-5" />
                Accedi
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 }}
            className="glass-strong rounded-3xl p-5"
          >
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Giogo" className="h-12 w-12 object-contain" />
                  <div>
                    <p className="text-sm font-semibold">Round live</p>
                    <p className="text-xs text-muted-foreground">Lobby globale pronta</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  online
                </span>
              </div>
              <div className="mt-6 grid gap-3">
                <PreviewRow
                  icon={<MessageCircle className="h-5 w-5" />}
                  title="Chat"
                  text="5 minuti per rompere il ghiaccio"
                />
                <PreviewRow
                  icon={<Video className="h-5 w-5" />}
                  title="Vocale"
                  text="Round rapidi con controllo totale"
                />
                <PreviewRow
                  icon={<HeartHandshake className="h-5 w-5" />}
                  title="Match"
                  text="Interesse reciproco sbloccato alla fine"
                />
              </div>
            </div>
          </motion.div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Feature
            title="Crea il tuo profilo"
            text="Foto caricata dal dispositivo, lingue, interessi e bio per rendere i match più pertinenti."
          />
          <Feature
            title="Scegli la modalità"
            text="Entra in chat o in vocale, con round a tempo e partecipanti bilanciati."
          />
          <Feature
            title="Scopri i match"
            text="Alla fine del round scopri solo le compatibilità reciproche, senza pressione."
          />
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-secondary" />
              <h2 className="text-2xl font-semibold">Eventi in evidenza</h2>
            </div>
            <div className="mt-5 grid gap-3">
              <EventPreview
                title="Aperitivo internazionale"
                meta="Questa settimana · chat e voce"
              />
              <EventPreview
                title="Language exchange night"
                meta="Round globali · italiano, inglese, spagnolo"
              />
            </div>
          </div>
          <div className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-semibold">Pronto a giocare?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              La sezione Gioca è dedicata solo alla dashboard di matchmaking, alla coda e ai round
              live. Da lì scegli stanza, lingua e modalità.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full gradient-cool px-6 py-3 text-sm font-semibold text-secondary-foreground shadow-glow-cool"
            >
              <Sparkles className="h-4 w-4" />
              Vai a Gioca
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function PreviewRow({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 p-4">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
        {icon}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function EventPreview({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
    </div>
  );
}
