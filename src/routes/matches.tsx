import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Heart, Loader2, Send, Sparkles } from "lucide-react";
import { Nav } from "@/components/viberound/Nav";
import { FloatingBackground } from "@/components/viberound/Background";
import { useLanguage } from "@/lib/language";
import { getCurrentUser, requireAuth, type AuthUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

export const Route = createFileRoute("/matches")({
  beforeLoad: requireAuth,
  component: Matches,
});

type MatchRow = Tables<"matches">;
type ProfileRow = Tables<"profiles">;
type MessageRow = Tables<"chat_messages">;
type MatchItem = MatchRow & { partner: ProfileRow };

function Matches() {
  const { t } = useLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const currentUser = await getCurrentUser();
      if (!alive) return;
      setUser(currentUser);
      if (!currentUser) return;

      const { data: matchRows, error } = await supabase
        .from("matches")
        .select("*")
        .or(`user_a.eq.${currentUser.id},user_b.eq.${currentUser.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Impossibile caricare i match", { description: error.message });
        setLoading(false);
        return;
      }

      const partnerIds = (matchRows ?? []).map((match) =>
        match.user_a === currentUser.id ? match.user_b : match.user_a,
      );
      const { data: profiles } = partnerIds.length
        ? await supabase.from("profiles").select("*").in("id", partnerIds)
        : { data: [] };
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      const nextMatches = (matchRows ?? [])
        .map((match) => {
          const partnerId = match.user_a === currentUser.id ? match.user_b : match.user_a;
          const partner = profileMap.get(partnerId);
          return partner ? { ...match, partner } : null;
        })
        .filter(Boolean) as MatchItem[];

      if (!alive) return;
      setMatches(nextMatches);
      setActiveId(nextMatches[0]?.id ?? null);
      setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const active = matches.find((match) => match.id === activeId) ?? null;

  return (
    <div className="relative min-h-screen">
      <FloatingBackground />
      <Nav />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            permanent matches
          </div>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">{t("matches.title")}</h1>
        </motion.div>

        {loading ? (
          <div className="mt-10 flex items-center gap-2 rounded-3xl glass p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : matches.length === 0 ? (
          <div className="glass-strong mx-auto mt-12 max-w-md rounded-3xl p-10 text-center">
            <p className="text-muted-foreground">{t("matches.empty")}</p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex rounded-full gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow"
            >
              {t("dashboard.start")}
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-[320px_1fr]">
            <div className="space-y-2">
              {matches.map((match, index) => (
                <motion.button
                  key={match.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setActiveId(match.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${activeId === match.id ? "glass-strong ring-1 ring-primary" : "glass hover:bg-white/[0.07]"}`}
                >
                  {match.partner.profile_photo_url ? (
                    <img
                      src={match.partner.profile_photo_url}
                      alt={match.partner.display_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${match.partner.avatar_color} font-semibold text-white`}
                    >
                      {match.partner.display_name[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{match.partner.display_name}</span>
                      <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {match.partner.city ?? "Giogo"}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>

            {active && user ? <PrivateChat match={active} user={user} t={t} /> : null}
          </div>
        )}
      </main>
    </div>
  );
}

function PrivateChat({
  match,
  user,
  t,
}: {
  match: MatchItem;
  user: AuthUser;
  t: (key: string) => string;
}) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let alive = true;
    async function loadMessages() {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("match_id", match.id)
        .order("created_at", { ascending: true });
      if (error) {
        toast.error("Chat non caricata", { description: error.message });
        return;
      }
      if (alive) setMessages(data ?? []);
    }

    const channel = supabase
      .channel(`match-chat-${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          const nextMessage = payload.new as MessageRow;
          setMessages((current) =>
            current.some((message) => message.id === nextMessage.id)
              ? current
              : [...current, nextMessage],
          );
        },
      )
      .subscribe();

    loadMessages();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [match.id]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ match_id: match.id, sender_id: user.id, body })
      .select("*")
      .single();
    if (error) {
      toast.error("Messaggio non inviato", { description: error.message });
      setDraft(body);
      return;
    }
    if (data) {
      setMessages((current) =>
        current.some((message) => message.id === data.id) ? current : [...current, data],
      );
    }
  }

  return (
    <motion.div
      key={match.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong flex h-[560px] flex-col rounded-3xl"
    >
      <div className="flex items-center gap-3 border-b border-white/5 p-4">
        {match.partner.profile_photo_url ? (
          <img
            src={match.partner.profile_photo_url}
            alt={match.partner.display_name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div
            className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${match.partner.avatar_color} font-semibold text-white`}
          >
            {match.partner.display_name[0]}
          </div>
        )}
        <div>
          <div className="font-medium">{match.partner.display_name}</div>
          <div className="text-xs text-secondary">match permanente</div>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === user.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${message.sender_id === user.id ? "gradient-primary text-primary-foreground" : "glass"}`}
            >
              {message.body}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5 p-3">
        <div className="glass flex items-center gap-2 rounded-full p-1.5 pl-4">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && send()}
            placeholder={t("matches.message")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={send}
            className="grid h-9 w-9 place-items-center rounded-full gradient-primary text-primary-foreground"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
