import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import monkeyImg from "@/assets/monkey.png";

export const Route = createFileRoute("/_authenticated/")({
  component: ChatPage,
  head: () => ({
    meta: [{ title: "Kurangu — Chat" }],
  }),
});

type Profile = {
  id: string;
  nickname: string;
  district: string;
  avatar_url: string | null;
};

function storageKey(uid: string) {
  return `kurangu_messages_${uid}`;
}

function loadMessages(uid: string): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(uid));
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function partsToText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function scoreMessage(text: string): number {
  let pts = 1;
  if (text.length > 20) pts += 1;
  if (text.length > 60) pts += 2;
  if (text.includes("?") || text.includes("?")) pts += 2;
  if (text.length > 120) pts += 2;
  return Math.min(pts, 10);
}

function ChatPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("id, nickname, district, avatar_url")
        .eq("id", u.user.id)
        .single();
      if (p) {
        setProfile(p as Profile);
        setInitial(loadMessages(p.id));
      }
    })();
  }, []);

  const { messages, sendMessage, status, error, stop } = useChat({
    messages: initial ?? [],
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        profile: profile
          ? { nickname: profile.nickname, district: profile.district }
          : undefined,
      }),
    }),
  });

  // Persist
  useEffect(() => {
    if (!profile || initial === null) return;
    try {
      localStorage.setItem(storageKey(profile.id), JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, initial, profile]);

  // Award points when assistant finishes
  const lastUserAwarded = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "ready" || messages.length < 2) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    const prevUser = [...messages].reverse().find((m) => m.role === "user");
    if (!prevUser || lastUserAwarded.current === prevUser.id) return;
    lastUserAwarded.current = prevUser.id;
    const delta = scoreMessage(partsToText(prevUser));
    supabase.rpc("award_bonus", { _delta: delta }).then(() => {});
  }, [status, messages]);

  // Scroll & focus
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (status === "ready") inputRef.current?.focus();
  }, [status]);

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    setInput("");
    await sendMessage({ text });
  };

  const clearChat = () => {
    if (!profile) return;
    try {
      localStorage.removeItem(storageKey(profile.id));
    } catch {
      // ignore
    }
    window.location.reload();
  };

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <main className="relative flex flex-col h-[calc(100vh-4rem)] mx-auto w-full max-w-md px-3 pt-3">
      {/* Header */}
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <img
            src={monkeyImg}
            alt="Kurangu"
            className="w-11 h-11 rounded-full bg-primary/20 border-2 border-primary object-contain"
          />
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight leading-none">
              Kurangu <span className="text-primary">🍌</span>
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {profile ? `${profile.nickname} · ${profile.district}` : "loading..."}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-[10px] font-bold uppercase text-muted-foreground border-2 border-border rounded-md px-2 py-1"
          >
            Clear
          </button>
        )}
      </header>

      {/* Messages */}
      <section
        ref={scrollerRef}
        className="flex-1 overflow-y-auto rounded-2xl border-2 border-primary bg-card p-3 shadow-[4px_4px_0_0_var(--color-primary)] mb-3 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🐒</div>
            <p className="text-sm font-bold">
              {profile ? `വാടാ ${profile.nickname}, എന്തെങ്കിലും പറയ്...` : "..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ജോക്, debate, ഉപദേശം — എന്തും ചോദിക്ക്
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const text = partsToText(m);
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && <div className="shrink-0 text-xl select-none">🐒</div>}
                <div
                  className={
                    isUser
                      ? "max-w-[78%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap"
                      : "max-w-[80%] text-sm whitespace-pre-wrap leading-relaxed"
                  }
                >
                  {text || <span className="italic opacity-60">...</span>}
                </div>
              </div>
            );
          })
        )}

        {status === "submitted" && (
          <div className="flex gap-2 items-center text-muted-foreground text-sm">
            <span className="text-xl">🐒</span>
            <span className="inline-flex gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
              <span
                className="w-2 h-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "0.15s" }}
              />
              <span
                className="w-2 h-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "0.3s" }}
              />
            </span>
          </div>
        )}

        {error && (
          <div className="text-sm bg-destructive/80 text-destructive-foreground px-3 py-2 rounded-md">
            {error.message}
          </div>
        )}
      </section>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="rounded-2xl border-2 border-border bg-card p-2 flex items-end gap-2 mb-2"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="എന്തെങ്കിലും ടൈപ്പ് ചെയ്യൂ..."
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 py-2 text-sm focus:outline-none max-h-32"
        />
        {isLoading ? (
          <button
            type="button"
            onClick={() => stop()}
            className="rounded-xl bg-secondary text-secondary-foreground font-black uppercase text-xs px-3 py-2"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-xl bg-primary text-primary-foreground font-black uppercase text-xs px-3 py-2 disabled:opacity-40"
          >
            Send 🍌
          </button>
        )}
      </form>
    </main>
  );
}
