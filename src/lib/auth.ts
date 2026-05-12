import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type AuthUser = {
  id: string;
  email: string;
};

export function toAuthUser(user: { id: string; email?: string | null } | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? "",
  };
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return toAuthUser(data.session?.user ?? null);
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw redirect({ to: "/login" });
  }
  return { user };
}

export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();
  if (user) {
    throw redirect({ to: "/dashboard" });
  }
}

export function onAuthUserChange(callback: (user: AuthUser | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(toAuthUser(session?.user ?? null));
  });
  return data.subscription;
}
