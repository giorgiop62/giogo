import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MailWarning } from "lucide-react";
import { FloatingBackground } from "@/components/viberound/Background";
import { supabase } from "@/integrations/supabase/client";

type Search = { next?: string };

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    next: typeof search.next === "string" ? search.next : "/profile",
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const safeNext = useMemo(() => (next?.startsWith("/") ? next : "/profile"), [next]);

  useEffect(() => {
    async function finishLogin() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const errorDescription = hash.get("error_description");
      const errorCode = hash.get("error_code");

      if (errorDescription) {
        setError(
          errorCode === "otp_expired"
            ? "Il link email è scaduto o è già stato usato. Richiedi un nuovo link di login."
            : errorDescription,
        );
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("Sessione non trovata. Richiedi un nuovo link di login.");
        return;
      }

      navigate({ to: safeNext });
    }

    finishLogin();
  }, [navigate, safeNext]);

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <main className="grid min-h-screen place-items-center px-4">
        <div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center">
          {error ? (
            <>
              <MailWarning className="mx-auto h-8 w-8 text-primary" />
              <h1 className="mt-4 text-2xl font-semibold">Link non valido</h1>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Link
                to="/create-event"
                className="mt-6 inline-flex rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Richiedi nuovo link
              </Link>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <h1 className="mt-4 text-2xl font-semibold">Accesso in corso</h1>
              <p className="mt-2 text-sm text-muted-foreground">Sto completando il login...</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
