"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchMatchSummary, fetchMatchEvents, fetchPlayers, exportCSV } from "@/lib/api";
import TacticalView from "@/components/TacticalView";
import HeatmapView from "@/components/HeatmapView";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function MatchDetailPage({ params }: PageProps) {
  const [summary, setSummary] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadId = async () => {
      const { id } = await params;
      if (!id) {
        setError("Match ID not found");
        setLoading(false);
        return;
      }
      const mid = parseInt(id, 10);
      if (isNaN(mid) || mid <= 0) {
        setError("Match ID is invalid");
        setLoading(false);
        return;
      }
      setMatchId(mid);
    };
    loadId();
  }, [params]);

  useEffect(() => {
    if (!matchId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sum, evts, plrs] = await Promise.all([
          fetchMatchSummary(matchId),
          fetchMatchEvents(matchId),
          fetchPlayers(matchId),
        ]);
        setSummary(sum);
        setEvents(evts || []);
        setPlayers(plrs || []);
      } catch (err: any) {
        console.error("❌ Failed to fetch match data:", err);
        setError("Failed to load match data. Make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [matchId]);

  const handleExport = async () => {
    if (!matchId) return;
    setExporting(true);
    try {
      await exportCSV("match_events", matchId);
    } catch (err: any) {
      alert("Failed to export events: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading match data...</p>
        </div>
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <p className="text-red-800">❌ {error || "Data not found"}</p>
            <Link href="/" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const goals = events.filter((ev: any) => ev.is_goal === true);
  const cards = events.filter((ev: any) => ev.card_type);
  const shots = events.filter((ev: any) => ev.event_type === 'Shot');

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header dengan Tombol Export */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <Link href="/" className="text-blue-600 hover:underline inline-block">
            ← Back to Match List
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition ${
              exporting ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {exporting ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Mengekspor...
              </>
            ) : (
              "📥 Export Events (CSV)"
            )}
          </button>
        </div>

        {/* Header Skor */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-gray-100">
          <div className="flex justify-between items-center text-center">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">{summary.home_team}</h2>
            </div>
            <div className="px-6">
              <div className="text-4xl font-black text-gray-900">
                {summary.home_goals} - {summary.away_goals}
              </div>
              <div className="text-sm text-gray-400 mt-1">Final</div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">{summary.away_team}</h2>
            </div>
          </div>
        </div>

        {/* Statistik Ringkas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="text-sm text-gray-500">Total Goals</div>
            <div className="text-2xl font-bold text-gray-800">{summary.total_goals}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="text-sm text-gray-500">Total xG</div>
            <div className="text-2xl font-bold text-gray-800">{summary.total_xG}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="text-sm text-gray-500">Shots</div>
            <div className="text-2xl font-bold text-gray-800">{summary.shots}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="text-sm text-gray-500">Passes</div>
            <div className="text-2xl font-bold text-gray-800">{summary.passes}</div>
          </div>
        </div>

        {/* Pencetak Gol */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">⚽ Goalscorers</h3>
          {goals.length === 0 ? (
            <p className="text-gray-400">No goals recorded.</p>
          ) : (
            <ul className="space-y-2">
              {goals.map((g: any, idx: number) => (
                <li key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <span className="text-2xl">⚽</span>
                  <div>
                    <span className="font-semibold text-gray-800">{g.player_name || 'Unknown'}</span>
                    <span className="text-gray-500 text-sm ml-2">({g.team_name})</span>
                    <span className="text-gray-400 text-sm ml-2">
                      {g.period === 1 ? 'Half 1' : g.period === 2 ? 'Half 2' : 'ET'} - Minute {g.timestamp}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Timeline Event */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Timeline Event</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {goals.map((g: any, idx: number) => (
              <div key={`goal-${idx}`} className="flex items-start gap-3 p-2 border-b border-gray-50">
                <span className="text-lg mt-0.5">🥅</span>
                <div>
                  <span className="font-semibold text-green-700">GOAL!</span>
                  <span className="ml-2 text-gray-800">{g.player_name}</span>
                  <span className="text-gray-500 text-sm ml-2">({g.team_name})</span>
                  <span className="text-gray-400 text-sm ml-2">Minute {g.timestamp}</span>
                </div>
              </div>
            ))}
            
            {cards.map((c: any, idx: number) => (
              <div key={`card-${idx}`} className="flex items-start gap-3 p-2 border-b border-gray-50">
                <span className="text-lg mt-0.5">
                  {c.card_type === 'Yellow' ? '🟨' : '🟥'}
                </span>
                <div>
                  <span className={`font-semibold ${c.card_type === 'Red' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {c.card_type} Card
                  </span>
                  <span className="ml-2 text-gray-800">{c.player_name}</span>
                  <span className="text-gray-500 text-sm ml-2">({c.team_name})</span>
                  <span className="text-gray-400 text-sm ml-2">Minute {c.timestamp}</span>
                </div>
              </div>
            ))}

            {shots.filter((s: any) => !s.is_goal).slice(0, 10).map((s: any, idx: number) => (
              <div key={`shot-${idx}`} className="flex items-start gap-3 p-2 border-b border-gray-50">
                <span className="text-lg mt-0.5">🎯</span>
                <div>
                  <span className="text-gray-800">{s.player_name}</span>
                  <span className="text-gray-500 text-sm ml-2">Shots</span>
                  <span className="text-gray-400 text-sm ml-2">({s.outcome || 'No outcome'})</span>
                  <span className="text-gray-400 text-sm ml-2">Minute {s.timestamp}</span>
                </div>
              </div>
            ))}
            
            {shots.filter((s: any) => !s.is_goal).length === 0 && goals.length === 0 && cards.length === 0 && (
              <p className="text-gray-400">No notable events recorded yet.</p>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-3">
            Showing {goals.length} goals, {cards.length} cards, and {shots.length} shots.
          </div>
        </div>

        <TacticalView events={events} matchId={matchId ?? 0} />

        <HeatmapView matchId={matchId ?? 0} events={events} players={players} />
        
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">👥 Player List</h3>
          <p className="text-sm text-gray-500 mb-4">
            Click a player name to view detailed stats (Goals, Assists, xG, xA).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {players.slice(0, 30).map((p: any) => (
              <a
                key={p.player_id}
                href={`/player/${p.player_id}`}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm hover:shadow-md hover:border-blue-400 transition text-sm text-gray-700 hover:text-blue-600"
              >
                <span className="font-medium">{p.player_name}</span>
                {p.team_name && (
                  <span className="text-xs text-gray-400 block">{p.team_name}</span>
                )}
              </a>
            ))}
          </div>
          {players.length > 30 && (
            <p className="text-xs text-gray-400 mt-2">Showing 30 of {players.length} players.</p>
          )}
        </div>
        
      </div>
    </main>
  );
}