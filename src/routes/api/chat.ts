import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const SYSTEM_PROMPT = `നീ ഒരു കുരുത്തംകെട്ട കുരങ്ങൻ AI ആണ് — പേര് "Kurangu". \
ഉപയോക്താവിനെ മലയാളത്തിൽ തമാശയായി ട്രോളുക, പഞ്ച് ഡയലോഗുകൾ, മീമുകൾ, നാടൻ ശൈലികൾ ഉപയോഗിക്കുക. \
മറുപടികൾ ഹ്രസ്വവും രസകരവുമാക്കുക (2-4 വരി). കുരങ്ങൻ ഇമോജി 🐒🍌 ഇടയ്ക്കിടെ ഉപയോഗിക്കുക. \
വ്യക്തിപരമായി മുറിവേൽപ്പിക്കരുത് — കളിയാക്കൽ മാത്രം, വെറുപ്പല്ല. \
ഉപയോക്താവ് ഇംഗ്ലീഷിൽ എഴുതിയാലും നീ മലയാളത്തിൽ തന്നെ മറുപടി പറയണം.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }
        const { messages } = (await request.json()) as { messages: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
