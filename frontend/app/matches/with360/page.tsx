// frontend/app/matches/with360/page.tsx
import { fetchMatches } from "@/lib/api";
import { connection } from "next/server";

export default async function MatchesWith360Page() {
  await connection();
  const allMatches = await fetchMatches();
  // Filter matches with 360 data (hardcoded from known list)
  const matchIdsWith360 = [
    3764440, 3764661, 3773369, 3773372, 3773377, 3773386, 3773387,
    3773403, 3773415, 3773428, 3773457, 3773466, 3773474, 3773477,
    3773497, 3773523, 3773526, 3773547, 3773552, 3773565, 3930166
  ];
  
  const matches = allMatches.filter((m: any) => matchIdsWith360.includes(m.match_id));

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📊 Matches with 360 Data</h1>
        <p className="text-gray-500 mb-6">
          {matches.length} matches have 360 data (player positions).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match: any) => (
            <a
              key={match.match_id}
              href={`/match/${match.match_id}`}
              className="bg-white p-4 rounded-xl shadow hover:shadow-md transition border border-gray-100"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{match.home_team}</span>
                <span className="text-gray-400 text-sm">vs</span>
                <span className="font-semibold">{match.away_team}</span>
              </div>
              <div className="text-sm text-gray-400 mt-2">
                {new Date(match.date).toLocaleDateString('id-ID')}
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}