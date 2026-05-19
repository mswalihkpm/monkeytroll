import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState, type FormEvent } from "react";
import monkeyImg from "@/assets/monkey.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Kurangu — മലയാളം AI ട്രോൾ ബോട്ട്" },
      {
        name: "description",
        content:
          "നിങ്ങളെ മലയാളത്തിൽ കിടിലൻ ട്രോൾ ചെയ്യുന്ന ഒരു കുരുത്തംകെട്ട AI കുരങ്ങൻ.",
      },
    ],
  }),
});

const STORAGE_KEY = "kurangu_messages_v1";

function loadMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function partsToText(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
}

function Index() {
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setInitial(loadMessages());
  }, []);

  const { messages, sendMessage, status, error, stop } = useChat({
    messages: initial ?? [],
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  // Persist
  useEffect(() => {
    if (initial === null) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, initial]);

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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    window.location.reload();
  };

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--color-primary) 0 2px, transparent 2px 28px)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-6 flex flex-col flex-1 min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={monkeyImg}
              alt="Kurangu mascot"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary object-contain"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                Kurangu <span className="text-primary">🍌</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                മലയാളം ട്രോൾ ബോട്ട് · എഴുതൂ, ഞാൻ കളിയാക്കാം 🐒
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs font-bold uppercase text-muted-foreground hover:text-destructive border-2 border-border rounded-lg px-3 py-1.5"
            >
              Clear
            </button>
          )}
        </header>

        {/* Messages */}
        <section
          ref={scrollerRef}
          className="flex-1 overflow-y-auto rounded-3xl border-4 border-primary bg-card p-4 sm:p-6 shadow-[6px_6px_0_0_var(--color-primary)] mb-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">🐒</div>
              <p className="text-base font-bold">
                എന്തെങ്കിലും എഴുതടാ മോനെ...
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try: "എനിക്ക് ജോലി ഇല്ല" or "ഞാൻ ഇന്ന് മുണ്ടും ഷർട്ടും ഇട്ടു"
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
                  {!isUser && (
                    <div className="shrink-0 text-2xl select-none">🐒</div>
                  )}
                  <div
                    className={
                      isUser
                        ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap"
                        : "max-w-[80%] text-sm whitespace-pre-wrap leading-relaxed"
                    }
                  >
                    {text || (
                      <span className="italic opacity-60">...</span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {status === "submitted" && (
            <div className="flex gap-2 items-center text-muted-foreground text-sm">
              <span className="text-2xl">🐒</span>
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
          className="rounded-2xl border-2 border-border bg-card p-2 flex items-end gap-2"
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
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm focus:outline-none max-h-32"
            autoFocus
          />
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              className="rounded-xl bg-secondary text-secondary-foreground font-black uppercase text-sm px-4 py-2"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-xl bg-primary text-primary-foreground font-black uppercase text-sm px-4 py-2 disabled:opacity-40"
            >
              Send 🍌
            </button>
          )}
        </form>

        <footer className="mt-3 text-center text-[11px] text-muted-foreground">
          Powered by Lovable AI · ചാറ്റ് ഈ ബ്രൗസറിൽ സേവ് ചെയ്യപ്പെടും
        </footer>
      </div>
    </main>
  );
}
