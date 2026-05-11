import { supabase } from "@/integrations/supabase/client";

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  user: AuthUser | null;
};

function toAuthUser(user: { id: string; email?: string | null } | null) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? "",
  };
}

function toAuthSession(session: { user: { id: string; email?: string | null } } | null) {
  if (!session?.user) return { user: null };
  return { user: toAuthUser(session.user) };
}

export const fakeAuth = {
  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    return { data: { session: toAuthSession(data.session) } };
  },
  signInWithOtp: async ({ email }: { email: string; options?: unknown }) => {
    return await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  onAuthStateChange: (callback: (event: string, session: { session: AuthUser | null }) => void) => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, { session: toAuthSession(session) });
    });
    return { data };
  },
};
