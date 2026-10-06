// frontend/lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "/api";

async function fetcher<T>(url: string): Promise<T> {
  let requestUrl = url;
  if (typeof window === "undefined" && url.startsWith("/api/")) {
    const backendUrl = process.env.BACKEND_INTERNAL_URL;
    if (!backendUrl) {
      throw new Error("BACKEND_INTERNAL_URL must be set for server-side API requests.");
    }
    requestUrl = `${new URL(backendUrl).origin}${url.slice(4)}`;
  }
  const res = await fetch(requestUrl);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${res.statusText} (${url})`);
  }
  return res.json();
}

export interface MatchRecord {
  match_id: number;
  home_team: string;
  away_team: string;
  date: string | null;
}

// --- MATCHES ---
export async function fetchMatches() {
  return fetcher<MatchRecord[]>(`${API_BASE}/matches`);
}

export async function fetchMatchSummary(matchId: number) {
  return fetcher<any>(`${API_BASE}/match/${matchId}/summary`);
}

export async function fetchMatchEvents(matchId: number, eventType?: string) {
  const params = new URLSearchParams();
  if (eventType) params.append("event_type", eventType);
  const url = `${API_BASE}/events/${matchId}${params.toString() ? `?${params.toString()}` : ""}`;
  return fetcher<any>(url);
}

export async function fetchMatchSimilarity(matchId: number, topN = 5) {
  return fetcher<any>(`${API_BASE}/matches/similar/${matchId}?top_n=${topN}`);
}

// --- 360 ---
export async function fetch360Data(eventUuid: string, matchId?: number) {
  const params = new URLSearchParams();
  if (matchId) params.append("match_id", String(matchId));
  const url = `${API_BASE}/360/${eventUuid}${params.toString() ? `?${params.toString()}` : ""}`;
  return fetcher<any>(url);
}

export async function fetchGhostData(matchId: string) {
  return fetcher<any>(`${API_BASE}/ghost/${matchId}`);
}

// --- PLAYERS ---
export async function fetchPlayers(matchId?: number, teamId?: number) {
  const params = new URLSearchParams();
  if (matchId) params.append("match_id", String(matchId));
  if (teamId) params.append("team_id", String(teamId));
  const url = `${API_BASE}/players${params.toString() ? `?${params.toString()}` : ""}`;
  return fetcher<any>(url);
}

export async function fetchPlayersBulk(matchId?: number) {
  const params = new URLSearchParams();
  if (matchId) params.append("match_id", String(matchId));
  const url = `${API_BASE}/players/bulk${params.toString() ? `?${params.toString()}` : ""}`;
  return fetcher<any>(url);
}

export async function fetchPlayerSummary(playerId: number) {
  return fetcher<any>(`${API_BASE}/player/${playerId}/summary`);
}

export async function fetchPlayerClusters(nClusters: number = 4) {
  return fetcher<any>(`${API_BASE}/players/clustering?n_clusters=${nClusters}`);
}

// --- PASS NETWORK ---
export async function fetchPassNetwork(matchId: number, teamId?: number) {
  const params = new URLSearchParams();
  if (teamId) params.append("team_id", String(teamId));
  const url = `${API_BASE}/passnetwork/${matchId}${params.toString() ? `?${params.toString()}` : ""}`;
  return fetcher<any>(url);
}

// --- EXPORT CSV ---
export async function exportCSV(
  exportType: string,
  matchId?: number,
  playerId?: number
) {
  const params = new URLSearchParams();
  params.append("export_type", exportType);
  if (matchId) params.append("match_id", String(matchId));
  if (playerId) params.append("player_id", String(playerId));
  const url = `${API_BASE}/export/csv?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `export_${exportType}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}