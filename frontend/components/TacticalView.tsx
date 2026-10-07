"use client";

import { useState } from "react";
import { fetch360Data } from "@/lib/api";

interface EventItem {
  event_id: string;
  timestamp: number;
  period: number;
  player_name: string;
  team_name: string;
  event_type: string;
  has_360: boolean;
}

interface PlayerPos {
  player_id: number;
  player_name: string;
  x: number;
  y: number;
  jersey: number;
  teammate: boolean;
}

interface PitchData {
  event_id: string;
  match_id: number;
  timestamp: number;
  period: number;
  possession_team: PlayerPos[];
  opponent_team: PlayerPos[];
  ball_x: number;
  ball_y: number;
}

interface TacticalViewProps {
  events: EventItem[];
  matchId: number;
}

export default function TacticalView({ events, matchId }: TacticalViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const eventsWith360 = events.filter((e) => e.has_360 === true);

  const handleSelectEvent = async (eventId: string) => {
    if (selectedEventId === eventId && pitchData) {
      return;
    }
    
    setSelectedEventId(eventId);
    setLoading(true);
    
    try {
      const data = await fetch360Data(eventId, matchId);
      setPitchData(data);
    } catch (error) {
      console.error("Failed to fetch 360 data:", error);
      alert("Failed to load player position data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (eventsWith360.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
        ⚠️ No 360 data (player positions) available for this match. 
        360 data is only available for certain moments.
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">📊 360 Visualization (Player Positions)</h3>
      <p className="text-sm text-gray-500 mb-4">
        Click any moment below to see the positions of 22 players on the pitch at that moment.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-3 max-h-96 overflow-y-auto">
          <p className="text-xs text-gray-400 mb-2 sticky top-0 bg-white py-1">
            {eventsWith360.length} momen tersedia
          </p>
          <ul className="space-y-1">
            {eventsWith360.map((ev) => (
              <li key={ev.event_id}>
                <button
                  onClick={() => handleSelectEvent(ev.event_id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    selectedEventId === ev.event_id
                      ? "bg-blue-600 text-white shadow-md"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="font-medium">{ev.event_type}</div>
                  <div className="text-xs opacity-75">
                    Minute {ev.timestamp} - {ev.player_name || "Unknown"}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Tampilan Lapangan (Kanan) */}
        <div className="lg:col-span-3 bg-gray-900 rounded-xl p-4 flex items-center justify-center min-h-[400px]">
          {loading && (
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
              <p>Loading player positions...</p>
            </div>
          )}
          
          {!loading && pitchData && (
            <div className="w-full max-w-4xl">
              <div className="text-white text-sm mb-2 flex justify-between items-center">
                <span>
                  ⚽ Possession Team: {pitchData.possession_team.length} players
                  <span className="ml-2 text-gray-400">
                    (vs {pitchData.opponent_team.length} players)
                  </span>
                </span>
                <span className="bg-gray-800 px-3 py-1 rounded-full">
                  ⏱️ Minute {pitchData.timestamp}
                </span>
              </div>

              <svg
                viewBox="0 0 120 80"
                className="w-full h-auto border border-gray-700 rounded-lg shadow-2xl"
                style={{ background: "#2e7d32" }}
              >
                {/* Garis Lapangan */}
                <rect x="0" y="0" width="120" height="80" fill="none" stroke="white" strokeWidth="0.3" />
                <line x1="60" y1="0" x2="60" y2="80" stroke="white" strokeWidth="0.3" />
                <circle cx="60" cy="40" r="9.15" fill="none" stroke="white" strokeWidth="0.3" />
                <circle cx="60" cy="40" r="0.8" fill="white" />
                <rect x="0" y="16.5" width="16.5" height="47" fill="none" stroke="white" strokeWidth="0.3" />
                <rect x="103.5" y="16.5" width="16.5" height="47" fill="none" stroke="white" strokeWidth="0.3" />
                <rect x="0" y="27.5" width="5.5" height="25" fill="none" stroke="white" strokeWidth="0.3" />
                <rect x="114.5" y="27.5" width="5.5" height="25" fill="none" stroke="white" strokeWidth="0.3" />
                <circle cx="11" cy="40" r="0.6" fill="white" />
                <circle cx="109" cy="40" r="0.6" fill="white" />

                <circle 
                  cx={pitchData.ball_x} 
                  cy={pitchData.ball_y} 
                  r="0.8" 
                  fill="white" 
                  stroke="#333" 
                  strokeWidth="0.2"
                />
                <text 
                  x={pitchData.ball_x + 1.5} 
                  y={pitchData.ball_y - 1.5} 
                  fontSize="2" 
                  fill="white"
                  className="font-bold"
                >
                  ⚽
                </text>

                {pitchData.possession_team.map((p) => (
                  <circle 
                    key={`pos-${p.player_id}`}
                    cx={p.x} 
                    cy={p.y} 
                    r="1.2" 
                    fill="#3b82f6" 
                    stroke="white" 
                    strokeWidth="0.3"
                    className="cursor-pointer hover:r-1.6 transition-all"
                  >
                    <title>{p.player_name} (Possession Team) - Number #{p.jersey}</title>
                  </circle>
                ))}

                {pitchData.opponent_team.map((p) => (
                  <circle 
                    key={`opp-${p.player_id}`}
                    cx={p.x} 
                    cy={p.y} 
                    r="1.2" 
                    fill="#ef4444" 
                    stroke="white" 
                    strokeWidth="0.3"
                    className="cursor-pointer hover:r-1.6 transition-all"
                  >
                    <title>{p.player_name} (Opponent Team) - Number #{p.jersey}</title>
                  </circle>
                ))}
              </svg>

              <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block mr-1 border border-white"></span>
                  Possession Team
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block mr-1 border border-white"></span>
                  Opponent Team
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-white border border-gray-500 inline-block mr-1"></span>
                  Bola
                </span>
                <span className="text-gray-500">
                  Hover a player to see name & jersey number
                </span>
              </div>
            </div>
          )}
          
          {!loading && !pitchData && (
            <div className="text-gray-400 text-center">
              <svg className="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p>Select a moment on the side to view the positions of 22 players.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}