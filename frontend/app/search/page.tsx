// frontend/app/search/page.tsx
import { fetchMatches, fetchPlayers } from "@/lib/api";

type SearchPageProps = {
  searchParams: Promise<{ q: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.toLowerCase().trim() || "";

  if (!query) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">🔍 Pencarian</h1>
          <p className="text-gray-500 mt-2">Enter a keyword to search matches or players.</p>
        </div>
      </main>
    );
  }

  const [matches, players] = await Promise.all([
    fetchMatches(),
    fetchPlayers(),
  ]);

  const matchedMatches = matches.filter((m: any) =>
    m.home_team?.toLowerCase().includes(query) ||
    m.away_team?.toLowerCase().includes(query)
  );

  const matchedPlayers = players.filter((p: any) =>
    p.player_name?.toLowerCase().includes(query)
  );

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          🔍 Search results for: "{query}"
        </h1>
        <p className="text-gray-500 mb-6">
          {matchedMatches.length + matchedPlayers.length} results found
        </p>

        {matchedMatches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">🏟️ Matches</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matchedMatches.map((m: any) => (
                <a
                  key={m.match_id}
                  href={`/match/${m.match_id}`}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-100"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{m.home_team}</span>
                    <span className="text-gray-400 text-sm">vs</span>
                    <span className="font-medium">{m.away_team}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{m.date}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {matchedPlayers.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-3">👤 Players</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {matchedPlayers.slice(0, 20).map((p: any) => (
                <a
                  key={p.player_id}
                  href={`/player/${p.player_id}`}
                  className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition border border-gray-100 text-center"
                >
                  <div className="font-medium text-gray-800">{p.player_name}</div>
                  {p.team_name && (
                    <div className="text-xs text-gray-400">{p.team_name}</div>
                  )}
                </a>
              ))}
            </div>
            {matchedPlayers.length > 20 && (
              <p className="text-xs text-gray-400 mt-2">Showing 20 of {matchedPlayers.length} players.</p>
            )}
          </div>
        )}

        {matchedMatches.length === 0 && matchedPlayers.length === 0 && (
          <p className="text-gray-400 text-center py-8">
            No results found for "{query}".
          </p>
        )}
      </div>
    </main>
  );
}