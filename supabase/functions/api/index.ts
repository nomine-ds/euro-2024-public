// supabase/functions/api/index.ts
import { corsHeaders, getClient, json } from "./lib/core.ts";
import { dispatch } from "./routes/index.ts";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/(?:functions\/v1\/)?api/, "") || "/";

  if (request.method === "POST") {
    if (path === "/bot/chat") {
      try {
        const client = getClient();
        const { botChatHandler } = await import("./routes/bot.ts");
        return await botChatHandler(client, request);
      } catch (error) {
        console.error("Bot chat failed:", error);
        return json({ message: "Bot chat failed." }, 500);
      }
    }
    return json({ message: "Method not allowed." }, 405);
  }

  if (request.method !== "GET") {
    return json({ message: "Method not allowed." }, 405);
  }

  try {
    const client = getClient();
    return await dispatch(client, path, url);
  } catch (error) {
    console.error("Supabase API request failed:", error);
    return json({ message: "The Supabase API request failed." }, 500);
  }
});