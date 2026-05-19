import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/elevenlabs-token")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "Missing ELEVENLABS_API_KEY" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        let agentId: string | undefined;
        try {
          const body = (await request.json()) as { agentId?: string };
          agentId = body.agentId;
        } catch {
          // ignore
        }
        if (!agentId || typeof agentId !== "string") {
          return new Response(
            JSON.stringify({ error: "agentId is required" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const res = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
          { headers: { "xi-api-key": apiKey } },
        );

        if (!res.ok) {
          const text = await res.text();
          return new Response(
            JSON.stringify({ error: text || "Failed to get token" }),
            { status: res.status, headers: { "Content-Type": "application/json" } },
          );
        }

        const data = (await res.json()) as { token: string };
        return new Response(JSON.stringify({ token: data.token }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
