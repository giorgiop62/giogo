import { Link } from "@tanstack/react-router";
import { Languages, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUser, onAuthUserChange, type AuthUser } from "@/lib/auth";
import { useLanguage, type Language } from "@/lib/language";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const languages: Array<{ value: Language; label: string }> = [
  { value: "it", label: "IT" },
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "fr", label: "FR" },
];

export function Nav() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    let alive = true;
    getCurrentUser().then((currentUser) => {
      if (alive) setUser(currentUser);
    });
    const subscription = onAuthUserChange(setUser);
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  const publicLinks = (
    <>
      <NavLink to="/" label={t("nav.home")} exact />
      <NavLink to="/login" label={t("nav.login")} />
      <NavLink to="/register" label={t("nav.register")} />
    </>
  );

  const privateLinks = (
    <>
      <NavLink to="/dashboard" label={t("nav.play")} />
      <NavLink to="/matches" label={t("nav.matches")} />
      <NavLink to="/events" label={t("nav.events")} />
      <NavLink to="/profile" label={t("nav.profile")} />
      <NavLink to="/settings" label={t("nav.settings")} />
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between px-4 sm:px-6">
     <Link

  to={user ? "/dashboard" : "/"}

  className="flex items-center gap-3"

>

  <img

    src={logo}

    alt="Giogo"

    className="h-16 w-16 sm:h-18 sm:w-18 object-contain"

  />

  <span className="font-display text-xl sm:text-2xl font-semibold tracking-tight">

    Giogo

  </span>

</Link>

        <nav className="glass hidden items-center gap-1 rounded-full p-1 text-sm lg:flex">
          {user ? privateLinks : publicLinks}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 sm:flex">
            <Languages className="ml-2 h-4 w-4 text-muted-foreground" />
            {languages.map((item) => (
              <button
                key={item.value}
                onClick={() => setLanguage(item.value)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  language === item.value ? "bg-white/10 text-foreground" : "text-muted-foreground"
                }`}
                title={t("change_language")}
              >
                {item.label}
              </button>
            ))}
          </div>

          {user ? (
            <button
              onClick={signOut}
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.07] sm:flex"
            >
              {t("nav.logout")}
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : null}

          <button
            onClick={() => setOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mx-auto mt-2 max-w-6xl px-4 sm:px-6 lg:hidden">
          <nav className="glass-strong grid gap-1 rounded-3xl p-2 text-sm">
            {user ? privateLinks : publicLinks}
            <div className="mt-2 flex flex-wrap gap-2 border-t border-white/10 pt-3">
              {languages.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setLanguage(item.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    language === item.value
                      ? "bg-white/10"
                      : "bg-white/[0.04] text-muted-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {user ? (
                <button
                  onClick={signOut}
                  className="ml-auto rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-semibold"
                >
                  {t("nav.logout")}
                </button>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function NavLink({ to, label, exact = false }: { to: string; label: string; exact?: boolean }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
      activeProps={{ className: "rounded-full bg-white/10 px-4 py-2 text-foreground" }}
    >
      {label}
    </Link>
  );
}
