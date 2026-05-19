import { createFileRoute } from "@tanstack/react-router";
import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import monkeyImg from "@/assets/monkey.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Monkey Troller — Live AI Joke Roaster" },
      {
        name: "description",
        content:
          "Talk live with a cheeky AI monkey that cracks jokes and trolls you in real time.",
      },
    ],
  }),
});

type TranscriptEntry = {
  id: string;
  role: "user" | "monkey";
  text: string;
  at: number;
};

const AGENT_KEY = "monkey_agent_id";
const HISTORY_KEY = "monkey_history_v1";

function loadHistory(): TranscriptEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as TranscriptEntry[]) : [];
  } catch {
    return [];
  }
}

function Index() {
  const [agentId, setAgentId] = useState("");
  const [agentInput, setAgentInput] = useState("");
  const [history, setHistory] = useState<TranscriptEntry[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(AGENT_KEY) ?? "";
    setAgentId(saved);
    setAgentInput(saved);
    setHistory(loadHistory());
  }, []);

  const pushEntry = useCallback((entry: TranscriptEntry) => {
    setHistory((prev) => {
      const next = [...prev, entry].slice(-200);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const conversation = useConversation({
    onConnect: () => setError(null),
    onDisconnect: () => setConnecting(false),
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setConnecting(false);
    },
    onMessage: (message: { source: "user" | "ai"; message: string }) => {
      if (!message?.message) return;
      pushEntry({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: message.source === "user" ? "user" : "monkey",
        text: message.message,
        at: Date.now(),
      });
    },
  });

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history.length]);

  const start = useCallback(async () => {
    if (!agentId) {
      setError("Add your ElevenLabs Agent ID first.");
      return;
    }
    setError(null);
    setConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res = await fetch("/api/elevenlabs-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Token request failed: ${res.status}`);
      }
      const { token } = (await res.json()) as { token: string };
      await conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }, [agentId, conversation]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const saveAgent = () => {
    const v = agentInput.trim();
    setAgentId(v);
    try {
      localStorage.setItem(AGENT_KEY, v);
    } catch {
      // ignore
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  };

  const status = conversation.status;
  const isConnected = status === "connected";
  const isSpeaking = conversation.isSpeaking;

  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Banana pop background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--color-primary) 0 2px, transparent 2px 28px)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl">🍌</span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
              Monkey<span className="text-primary"> Troller</span>
            </h1>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase border-2 ${
              isConnected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border"
            }`}
          >
            {isConnected ? (isSpeaking ? "Roasting..." : "Listening") : status}
          </span>
        </header>

        {/* Monkey stage */}
        <section className="rounded-3xl border-4 border-primary bg-card p-6 sm:p-10 shadow-[8px_8px_0_0_var(--color-primary)] mb-6">
          <div className="flex flex-col items-center text-center">
            <div
              className={`relative w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-primary/10 flex items-center justify-center transition-transform ${
                isSpeaking ? "animate-bounce" : ""
              }`}
            >
              {isConnected && (
                <span
                  className={`absolute inset-0 rounded-full border-4 border-primary ${
                    isSpeaking ? "animate-ping" : "animate-pulse"
                  }`}
                />
              )}
              <img
                src={monkeyImg}
                alt="Mischievous AI monkey mascot"
                width={288}
                height={288}
                className="relative w-full h-full object-contain drop-shadow-[0_6px_0_rgba(0,0,0,0.6)]"
              />
            </div>

            <p className="mt-6 text-sm sm:text-base text-muted-foreground max-w-md">
              Tap the banana to start. The monkey will hear you and absolutely
              destroy you with jokes.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {!isConnected ? (
                <button
                  onClick={start}
                  disabled={connecting || !agentId}
                  className="group inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-black uppercase tracking-wider px-8 py-4 text-base border-4 border-primary-foreground/0 shadow-[4px_4px_0_0_rgba(0,0,0,0.6)] hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_rgba(0,0,0,0.6)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl group-hover:rotate-12 transition">
                    🍌
                  </span>
                  {connecting ? "Summoning..." : "Start Trolling"}
                </button>
              ) : (
                <button
                  onClick={stop}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary text-secondary-foreground font-black uppercase tracking-wider px-8 py-4 text-base shadow-[4px_4px_0_0_rgba(0,0,0,0.6)] hover:translate-y-[-2px] transition"
                >
                  Stop
                </button>
              )}
            </div>

            {error && (
              <p className="mt-4 text-sm text-destructive-foreground bg-destructive/80 px-3 py-2 rounded-md">
                {error}
              </p>
            )}
          </div>
        </section>

        {/* Agent setup */}
        <section className="rounded-2xl border-2 border-border bg-card p-5 mb-6">
          <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">
            ElevenLabs Agent ID
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              placeholder="agent_xxxxxxxxxxxxxxxxxxxxxxxxx"
              className="flex-1 rounded-lg bg-background border-2 border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            />
            <button
              onClick={saveAgent}
              className="rounded-lg bg-primary text-primary-foreground font-bold uppercase text-sm px-4 py-2 hover:opacity-90"
            >
              Save
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Create a Conversational AI agent at{" "}
            <a
              href="https://elevenlabs.io/app/conversational-ai"
              target="_blank"
              rel="noreferrer"
              className="underline text-primary"
            >
              elevenlabs.io
            </a>
            , give it a chaotic comedian system prompt, and paste its Agent ID
            here.
          </p>
        </section>

        {/* Transcript */}
        <section className="rounded-2xl border-2 border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black uppercase tracking-wider">
              Roast Log
            </h2>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs font-bold uppercase text-muted-foreground hover:text-destructive"
              >
                Clear
              </button>
            )}
          </div>
          <div
            ref={scrollerRef}
            className="max-h-80 overflow-y-auto space-y-2 pr-1"
          >
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No roasts yet. The monkey is patient. The monkey is hungry.
              </p>
            ) : (
              history.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-secondary-foreground rounded-bl-sm"
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase opacity-70 mb-0.5">
                      {m.role === "user" ? "You" : "🐒 Monkey"}
                    </div>
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          Powered by ElevenLabs Conversational AI. Mic required.
        </footer>
      </div>
    </main>
  );
}
