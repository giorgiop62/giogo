export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  user: AuthUser | null;
};

const STORAGE_KEY = "fakeAuthUser";
const listeners = new Set<(event: string, session: { session: AuthUser | null }) => void>();

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function setStoredUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  notifyListeners(user);
}

function notifyListeners(user: AuthUser | null) {
  listeners.forEach((listener) => {
    try {
      listener("SIGNED_IN", { session: user });
    } catch {
      // ignore
    }
  });
}

function createUser(email: string): AuthUser {
  const normalized = email.trim().toLowerCase();
  return {
    id: `fake:${normalized}`,
    email: normalized,
  };
}

export const fakeAuth = {
  getSession: async () => {
    return { data: { session: getStoredUser() ? { user: getStoredUser() } : null } };
  },
  signInWithOtp: async ({ email }: { email: string; options?: unknown }) => {
    const user = createUser(email);
    setStoredUser(user);
    return { data: { user: null, session: { user } }, error: null as Error | null };
  },
  signOut: async () => {
    setStoredUser(null);
    return { error: null };
  },
  onAuthStateChange: (callback: (event: string, session: { session: AuthUser | null }) => void) => {
    listeners.add(callback);
    callback("INITIAL_SESSION", { session: getStoredUser() });
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },
};
