// supabase/functions/api/routes/index.ts
import { json, numeric } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";
import { matchRoutes } from "./matches.ts";
import { eventRoutes } from "./events.ts";
import { playerRoutes } from "./players.ts";
import { analyticsRoutes } from "./analytics.ts";
import { passNetwork } from "./passnetwork.ts";
import { exportRoutes } from "./export.ts";
import { ghostRoutes } from "./ghost.ts";
import { counterfactualRoutes } from "./counterfactual.ts";
import { tacticalRoutes } from "./tactical.ts";

export async function dispatch(
  client: SupabaseClient,
  path: string,
  url: URL,
): Promise<Response> {
  const matchResponse = await matchRoutes(client, path, url);
  if (matchResponse) return matchResponse;

  const eventResponseValue = await eventRoutes(client, path, url);
  if (eventResponseValue) return eventResponseValue;

  const playerResponse = await playerRoutes(client, path, url);
  if (playerResponse) return playerResponse;

  const analyticsResponse = await analyticsRoutes(client, path, url);
  if (analyticsResponse) return analyticsResponse;

  const ghostResponse = await ghostRoutes(client, path);
  if (ghostResponse) return ghostResponse;

  const exportResponse = await exportRoutes(client, path, url);
  if (exportResponse) return exportResponse;

  const counterfactualResponse = await counterfactualRoutes(client, path, url);
  if (counterfactualResponse) return counterfactualResponse;

  const tacticalResponse = await tacticalRoutes(client, path);
  if (tacticalResponse) return tacticalResponse;

  const network = path.match(/^\/passnetwork\/(\d+)$/);
  if (network) {
    return await passNetwork(
      client,
      Number(network[1]),
      numeric(url.searchParams.get("team_id")),
    );
  }

  if (path === "/bot/health") {
    const { botHealthHandler } = await import("./bot.ts");
    return await botHealthHandler(client);
  }

  return json(
    { message: "This API endpoint has not been migrated to Supabase yet." },
    501,
  );
}