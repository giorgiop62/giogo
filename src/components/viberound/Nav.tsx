import { Link } from "@tanstack/react-router";
import { Heart, LogOut, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { fakeAuth, type AuthUser } from "@/integrations/fakeAuth";
import { useLanguage } from "@/lib/language";
import logo from "@/assets/logo.png";

export function Nav() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    let alive = true;

    fakeAuth.getSession().then(({ data }) => {
      if (alive) setUser(data.session?.user ?? null);
    });

    const { data } = fakeAuth.onAuthStateChange((_event, session) => {
      setUser(session.session ?? null);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await fakeAuth.signOut();
  }

  const mainLinks = (
    <>
      <Link
        to="/"
        className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
        activeOptions={{ exact: true }}
        activeProps={{ className: "rounded-full px-4 py-1.5 text-foreground bg-white/5" }}
      >
        {t('nav.home')}
      </Link>
      <Link
        to="/dashboard"
        className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
        activeProps={{ className: "rounded-full px-4 py-1.5 text-foreground bg-white/5" }}
      >
        {t('nav.play')}
      </Link>
      <Link
        to="/events"
        className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
        activeProps={{ className: "rounded-full px-4 py-1.5 text-foreground bg-white/5" }}
      >
        {t('nav.events')}
      </Link>
      <Link
        to="/profile"
        className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
        activeProps={{ className: "rounded-full px-4 py-1.5 text-foreground bg-white/5" }}
      >
        {t('nav.profile')}
      </Link>
      <Link
        to="/matches"
        className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground"
        activeProps={{ className: "rounded-full px-4 py-1.5 text-foreground bg-white/5" }}
      >
        {t('nav.matches')}
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="glass flex items-center gap-2 rounded-full px-4 py-2">
          <div className="grid h-7 w-7 place-items-center">

            <img src={logo} alt="Logo" className="h-7 w-7 object-contain" />

          </div>
          <span className="font-display text-lg font-semibold tracking-tight">{t('app.name')}</span>
        </Link>
        <nav className="glass hidden items-center gap-1 rounded-full p-1 text-sm md:flex">
          {mainLinks}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(language === 'it' ? 'en' : 'it')}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.07]"
            title={t('change_language')}
          >
            <Languages className="h-4 w-4 text-muted-foreground" />
            {language === 'it' ? 'EN' : 'IT'}
          </button>
          {user ? (
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.07]"
              title={t('nav.logout')}
            >
              {t('nav.logout')}
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <Link
              to="/"
              className="rounded-full gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>
      </div>
      <nav className="mx-auto mt-2 flex max-w-6xl gap-1 overflow-x-auto px-4 pb-1 text-sm md:hidden sm:px-6">
        <div className="glass flex min-w-max items-center gap-1 rounded-full p-1">{mainLinks}</div>
      </nav>
    </header>
  );
}
