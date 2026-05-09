import { Link } from "@tanstack/react-router";
import { Heart, LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Nav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (alive) setUser(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  const mainLinks = (
    <>
      <Link
        to="/"
        className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
        activeOptions={{ exact: true }}
        activeProps={{ className: "rounded-full px-4 py-1.5 text-foreground bg-white/5" }}
      >
        Home
      </Link>
      <Link
        to="/dashboard"
        className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
        activeProps={{ className: "rounded-full px-4 py-1.5 text-foreground bg-white/5" }}
      >
        Play
      </Link>
      <Link
        to="/create-event"
        className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
        activeProps={{ className: "rounded-full px-4 py-1.5 text-foreground bg-white/5" }}
      >
        Crea
      </Link>
      <Link
        to="/events"
        className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
        activeProps={{ className: "rounded-full px-4 py-1.5 text-foreground bg-white/5" }}
      >
        Eventi
      </Link>
      <Link
        to="/profile"
        className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
        activeProps={{ className: "rounded-full px-4 py-1.5 text-foreground bg-white/5" }}
      >
        Profilo
      </Link>
      <Link
        to="/matches"
        className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
        activeProps={{ className: "rounded-full px-4 py-1.5 text-foreground bg-white/5" }}
      >
        Matches
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="glass flex items-center gap-2 rounded-full px-4 py-2">
          <div className="grid h-7 w-7 place-items-center rounded-full gradient-primary shadow-glow">
            <Heart className="h-3.5 w-3.5 fill-white text-white" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">VibeRound</span>
        </Link>
        <nav className="glass hidden items-center gap-1 rounded-full p-1 text-sm md:flex">
          {mainLinks}
        </nav>
        {user ? (
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.07]"
            title={user.email ?? "Esci"}
          >
            <UserRound className="h-4 w-4 text-primary" />
            <span className="hidden max-w-28 truncate sm:inline">{user.email}</span>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        ) : (
          <Link
            to="/create-event"
            className="rounded-full gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            Login
          </Link>
        )}
      </div>
      <nav className="mx-auto mt-2 flex max-w-6xl gap-1 overflow-x-auto px-4 pb-1 text-sm md:hidden sm:px-6">
        <div className="glass flex min-w-max items-center gap-1 rounded-full p-1">{mainLinks}</div>
      </nav>
    </header>
  );
}
