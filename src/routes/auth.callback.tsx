import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallbackPage });

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;

    async function handleCallback() {
      const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
      if (!alive) return;
      if (error) {
        console.error("Supabase callback error:", error.message);
      }

      if (data?.session?.user) {
        navigate({ to: "/dashboard" });
      } else {
        navigate({ to: "/login" });
      }
    }

    handleCallback();

    return () => {
      alive = false;
    };
  }, [navigate]);

  return null;
}
