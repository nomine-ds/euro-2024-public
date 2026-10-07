"use client";

import { useState, useEffect } from "react";
import { fetch360Data } from "@/lib/api";

interface Player {
  player_id: number;
  player_name: string;
  team_name?: string;
}

interface EventItem {
  event_id: string;
  timestamp: number;
  period: number;
  player_name: string;
  team_name: string;
  event_type: string;
  has_360: boolean;
}

interface HeatmapViewProps {
  matchId: number;
  events: EventItem[];
  players: Player[];
}

export default function HeatmapView({ matchId, events, players }: HeatmapViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [heatmapData, setHeatmapData] = useState<{ x: number; y: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventsWith360 = events.filter((e) => e.has_360 === true);

  useEffect(() => {
    setSelectedPlayerId(null);
    setHeatmapData([]);
    setError(null);
  }, [matchId]);

  const generateHeatmap = async (playerId: number) => {
    setLoading(true);
    setError(null);
    setSelectedPlayerId(playerId);

    try {
      const positions: { x: number; y: number }[] = [];

      for (const ev of eventsWith360) {
        try {
          const data = await fetch360Data(ev.event_id);
          const allPlayers = [...(data.possession_team || []), ...(data.opponent_team || [])];
          const found = allPlayers.find((p: any) => p.player_id === playerId);
          if (found) {
            positions.push({ x: found.x, y: found.y });
          }
        } catch (e) {
          console.warn(`Failed to fetch 360 for event ${ev.event_id}:`, e);
          continue;
        }
      }

      if (positions.length === 0) {
        setError(`No position data found for this player in the ${eventsWith360.length} available 360 moments.`);
      }

      setHeatmapData(positions);
    } catch (error) {
      console.error("Failed to generate heatmap:", error);
      setError("Failed to load heatmap. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderHeatmap = () => {
    if (heatmapData.length === 0) {
      return (
        <div className="text-gray-400 text-center py-8">
          <svg className="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p>{error || "Select a player above to view their movement heatmap."}</p>
          <p className="text-xs mt-2">Data from {eventsWith360.length} available 360 moments.</p>
        </div>
      );
    }

    const gridSize = 20;
    const grid: number[][] = Array(gridSize).fill(0).map(() => Array(Math.floor(gridSize * 0.75)).fill(0));

    // Normalize x (0-120) to grid (0-19), y (0-80) to grid (0-14)
    heatmapData.forEach((pos) => {
      const gx = Math.min(Math.floor((pos.x / 120) * gridSize), gridSize - 1);
      const gy = Math.min(Math.floor((pos.y / 80) * (gridSize * 0.75)), Math.floor(gridSize * 0.75) - 1);
      if (gx >= 0 && gx < gridSize && gy >= 0 && gy < grid.length) {
        grid[gy][gx] = (grid[gy][gx] || 0) + 1;
      }
    });

    // Find max for color normalization
    let maxVal = 0;
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        if (grid[i][j] > maxVal) maxVal = grid[i][j];
      }
    }

    // Ukuran cell (dalam persen)
    const cellW = 100 / gridSize;
    const cellH = 100 / (gridSize * 0.75);

    // Name of selected player
    const playerName = players.find(p => p.player_id === selectedPlayerId)?.player_name || 'Player';

    return (
      <div>
        <div className="text-white text-sm mb-2 flex justify-between items-center">
          <span className="bg-gray-800 px-3 py-1 rounded-full">
            🔥 {playerName} - {heatmapData.length} titik posisi
          </span>
          <span className="text-gray-400">Most visited area</span>
        </div>
        <div className="relative w-full bg-green-800 rounded-lg overflow-hidden" style={{ aspectRatio: "120/80" }}>
          <svg viewBox="0 0 100 75" className="w-full h-full">
            {/* Lapangan */}
            <rect x="0" y="0" width="100" height="75" fill="#2e7d32" />
            
            {/* Garis lapangan (tipis) */}
            <rect x="0" y="0" width="100" height="75" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
            <line x1="50" y1="0" x2="50" y2="75" stroke="white" strokeWidth="0.3" opacity="0.5" />
            <circle cx="50" cy="37.5" r="7.6" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
            <circle cx="50" cy="37.5" r="0.7" fill="white" opacity="0.5" />
            <rect x="0" y="15.5" width="13.75" height="44" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
            <rect x="86.25" y="15.5" width="13.75" height="44" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
            <rect x="0" y="25.8" width="4.6" height="23.4" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
            <rect x="95.4" y="25.8" width="4.6" height="23.4" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
            <circle cx="9.2" cy="37.5" r="0.5" fill="white" opacity="0.5" />
            <circle cx="90.8" cy="37.5" r="0.5" fill="white" opacity="0.5" />

            {/* Heatmap Grid */}
            {grid.map((row, i) => (
              row.map((val, j) => {
                if (val === 0) return null;
                const intensity = maxVal > 0 ? val / maxVal : 0;
                // Color gradient from blue (cold) to red (hot)
                const r = Math.round(255 * intensity);
                const g = Math.round(100 * (1 - intensity));
                const b = Math.round(100 * (1 - intensity));
                const opacity = Math.max(0.2, intensity * 0.8);
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={j * cellW}
                    y={i * cellH}
                    width={cellW + 0.5}
                    height={cellH + 0.5}
                    fill={`rgba(${r}, ${g}, ${b}, ${opacity})`}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="0.1"
                  />
                );
              })
            ))}
          </svg>
        </div>
      </div>
    );
  };

  if (eventsWith360.length === 0) {
    return (
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🔥 Player Movement Heatmap</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          ⚠️ No 360 data (player positions) available for this match. 
          360 data is only available for certain moments during the tournament.
          {events.length > 0 && (
            <div className="mt-2 text-sm">
              Total events: {events.length}. None have 360 data.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">🔥 Player Movement Heatmap</h3>
      <p className="text-sm text-gray-500 mb-4">
        Select a player to see the pitch areas they visited most (data from {eventsWith360.length} 360 moments).
      </p>

      <div className="mb-6">
        <label htmlFor="player-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Player:
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            id="player-select"
            className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
            value={selectedPlayerId || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val) generateHeatmap(parseInt(val, 10));
            }}
          >
            <option value="">-- Select player --</option>
            {players.map((p) => (
              <option key={p.player_id} value={p.player_id}>
                {p.player_name} {p.team_name ? `(${p.team_name})` : ""}
              </option>
            ))}
          </select>
          {selectedPlayerId && (
            <button
              onClick={() => {
                setSelectedPlayerId(null);
                setHeatmapData([]);
                setError(null);
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-4">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
              <p>Loading heatmap...</p>
              <p className="text-gray-400 text-sm mt-2">Collecting positions from {eventsWith360.length} moments...</p>
            </div>
          </div>
        ) : (
          renderHeatmap()
        )}
      </div>

      {selectedPlayerId && heatmapData.length > 0 && (
        <div className="mt-3 text-sm text-gray-500">
          ✅ Showing {heatmapData.length} positions from {eventsWith360.length} 360 moments.
        </div>
      )}
    </div>
  );
}