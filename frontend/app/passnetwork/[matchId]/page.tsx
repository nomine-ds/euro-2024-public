// frontend/app/passnetwork/[matchId]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

const PITCH_W = 120;
const PITCH_H = 80;
const SVG_W = 960;
const SVG_H = 640;
const MARGIN = 20;
const NODE_R = 16;

const TEAM_PALETTE = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];

// ============================================================
// COMMON NAMES — 8 negara besar Euro 2024
// ============================================================
const COMMON_NAMES: Record<string, string> = {
  // ---- SPAIN ----
  "Unai Simón Mendibil": "Unai Simón",
  "Daniel Carvajal Ramos": "Carvajal",
  "Robin Aime Robert Le Normand": "Le Normand",
  "Aymeric Laporte": "Laporte",
  "Marc Cucurella Saseta": "Cucurella",
  "Rodrigo Hernández Cascante": "Rodri",
  "Martín Zubimendi Ibáñez": "Zubimendi",
  "Fabián Ruiz Peña": "Fabián Ruiz",
  "Daniel Olmo Carvajal": "Dani Olmo",
  "Lamine Yamal Nasraoui Ebana": "Lamine Yamal",
  "Nicholas Williams Arthuer": "Nico Williams",
  "Álvaro Borja Morata Martín": "Morata",
  "Mikel Oyarzabal Ugarte": "Oyarzabal",
  "José Ignacio Fernández Iglesias": "Nacho",
  "Mikel Merino Zazón": "Mikel Merino",
  "Fermín López Marín": "Fermín",
  "Pedro González López": "Pedri",
  "Pablo Martín Páez Gavira": "Gavi",
  "Jesús Navas González": "Jesús Navas",
  "Alejandro Grimaldo García": "Grimaldo",
  "Dani Carvajal": "Carvajal",
  "David Raya Martín": "David Raya",
  "Álex Remiro Gargallo": "Remiro",
  "Nacho Fernández": "Nacho",
  "Joselu Sanmartín": "Joselu",
  "Ferran Torres García": "Ferran Torres",
  "Vivian Mosquera": "Vivian",

  // ---- ENGLAND ----
  "Jordan Pickford": "Pickford",
  "Kyle Walker": "Walker",
  "John Stones": "Stones",
  "Marc Guehi": "Guehi",
  "Luke Shaw": "Shaw",
  "Declan Rice": "Rice",
  "Kobbie Mainoo": "Mainoo",
  "Jude Bellingham": "Bellingham",
  "Phil Foden": "Foden",
  "Bukayo Saka": "Saka",
  "Harry Kane": "Kane",
  "Cole Palmer": "Palmer",
  "Ollie Watkins": "Watkins",
  "Jarrod Bowen": "Bowen",
  "Ezri Konsa": "Konsa",
  "Conor Gallagher": "Gallagher",
  "Kieran Trippier": "Trippier",
  "Trent Alexander-Arnold": "Trent",
  "Anthony Gordon": "Gordon",
  "Eberechi Eze": "Eze",
  "Ivan Toney": "Toney",
  "Aaron Ramsdale": "Ramsdale",
  "Dean Henderson": "Henderson",
  "Lewis Dunk": "Dunk",
  "Joe Gomez": "Gomez",
  "Adam Wharton": "Wharton",

  // ---- GERMANY ----
  "Jamal Musiala": "Musiala",
  "İlkay Gündoğan": "Gündoğan",
  "Joshua Kimmich": "Kimmich",
  "Antonio Rüdiger": "Rüdiger",
  "Kai Havertz": "Havertz",
  "Florian Wirtz": "Wirtz",
  "Manuel Neuer": "Neuer",
  "Marc-André ter Stegen": "Ter Stegen",
  "Jonathan Tah": "Tah",
  "Nico Schlotterbeck": "Schlotterbeck",
  "Robert Andrich": "Andrich",
  "Pascal Groß": "Groß",
  "Toni Kroos": "Kroos",
  "Leroy Sané": "Sané",
  "Serge Gnabry": "Gnabry",
  "Niclas Füllkrug": "Füllkrug",
  "Deniz Undav": "Undav",
  "Maximilian Mittelstädt": "Mittelstädt",
  "David Raum": "Raum",
  "Waldemar Anton": "Anton",
  "Robin Koch": "Koch",
  "Benjamin Henrichs": "Henrichs",
  "Chris Führich": "Führich",
  "Emre Can": "Can",

  // ---- FRANCE ----
  "Kylian Mbappé Lottin": "Mbappé",
  "Kylian Mbappé": "Mbappé",
  "Antoine Griezmann": "Griezmann",
  "Olivier Giroud": "Giroud",
  "Aurélien Tchouaméni": "Tchouaméni",
  "N'Golo Kanté": "Kanté",
  "Adrien Rabiot": "Rabiot",
  "Eduardo Camavinga": "Camavinga",
  "Ousmane Dembélé": "Dembélé",
  "Marcus Thuram": "Thuram",
  "Randal Kolo Muani": "Kolo Muani",
  "Bradley Barcola": "Barcola",
  "Mike Maignan": "Maignan",
  "Brice Samba": "Samba",
  "William Saliba": "Saliba",
  "Dayot Upamecano": "Upamecano",
  "Ibrahima Konaté": "Konaté",
  "Théo Hernández": "Théo Hernández",
  "Jules Koundé": "Koundé",
  "Benjamin Pavard": "Pavard",
  "Ferland Mendy": "Mendy",
  "Jonathan Clauss": "Clauss",
  "Warren Zaïre-Emery": "Zaïre-Emery",
  "Youssouf Fofana": "Fofana",
  "Kingsley Coman": "Coman",

  // ---- PORTUGAL ----
  "Cristiano Ronaldo dos Santos Aveiro": "Ronaldo",
  "Bruno Miguel Borges Fernandes": "Bruno Fernandes",
  "Bernardo Mota Veiga de Carvalho e Silva": "Bernardo Silva",
  "Rafael Alexandre Conceição Leão": "Rafael Leão",
  "João Félix Sequeira": "João Félix",
  "Diogo José Teixeira da Silva": "Diogo Jota",
  "Vitor Machado Ferreira": "Vitinha",
  "João Maria Lobo Alves Palhinha Gonçalves": "Palhinha",
  "Rúben Santos Gato Alves Dias": "Rúben Dias",
  "Pepe": "Pepe",
  "Nuno Mendes": "Nuno Mendes",
  "João Cancelo": "Cancelo",
  "Diogo Dalot": "Dalot",
  "Rúben Neves": "Rúben Neves",
  "Danilo Luís Hélio Pereira": "Danilo",
  "Otávio Edmilson da Silva Monteiro": "Otávio",
  "Gonçalo Matias Ramos": "Gonçalo Ramos",
  "Francisco Fernandes Conceição": "Francisco Conceição",
  "Pedro Lomba Neto": "Pedro Neto",
  "Diogo Meireles Costa": "Diogo Costa",
  "José Sá": "José Sá",

  // ---- ITALY ----
  "Gianluigi Donnarumma": "Donnarumma",
  "Nicolò Barella": "Barella",
  "Federico Chiesa": "Chiesa",
  "Jorginho": "Jorginho",
  "Sandro Tonali": "Tonali",
  "Alessandro Bastoni": "Bastoni",
  "Giovanni Di Lorenzo": "Di Lorenzo",
  "Federico Dimarco": "Dimarco",
  "Riccardo Calafiori": "Calafiori",
  "Alessandro Buongiorno": "Buongiorno",
  "Gianluca Mancini": "Mancini",
  "Nicolò Fagioli": "Fagioli",
  "Davide Frattesi": "Frattesi",
  "Lorenzo Pellegrini": "Pellegrini",
  "Mateo Retegui": "Retegui",
  "Gianluca Scamacca": "Scamacca",
  "Riccardo Orsolini": "Orsolini",
  "Federico Gatti": "Gatti",
  "Raoul Bellanova": "Bellanova",
  "Mattia Zaccagni": "Zaccagni",
  "Guglielmo Vicario": "Vicario",

  // ---- NETHERLANDS ----
  "Virgil van Dijk": "Van Dijk",
  "Nathan Aké": "Aké",
  "Denzel Dumfries": "Dumfries",
  "Stefan de Vrij": "De Vrij",
  "Matthijs de Ligt": "De Ligt",
  "Daley Blind": "Blind",
  "Jurriën Timber": "Timber",
  "Micky van de Ven": "Van de Ven",
  "Frenkie de Jong": "De Jong",
  "Tijjani Reijnders": "Reijnders",
  "Jerdy Schouten": "Schouten",
  "Joey Veerman": "Veerman",
  "Xavi Simons": "Xavi Simons",
  "Cody Gakpo": "Gakpo",
  "Memphis Depay": "Depay",
  "Donyell Malen": "Malen",
  "Wout Weghorst": "Weghorst",
  "Steven Bergwijn": "Bergwijn",
  "Brian Brobbey": "Brobbey",
  "Bart Verbruggen": "Verbruggen",
  "Mark Flekken": "Flekken",
  "Jeremie Frimpong": "Frimpong",
  "Lutsharel Geertruida": "Geertruida",

  // ---- BELGIUM ----
  "Kevin De Bruyne": "De Bruyne",
  "Romelu Lukaku": "Lukaku",
  "Jérémy Doku": "Doku",
  "Leandro Trossard": "Trossard",
  "Youri Tielemans": "Tielemans",
  "Amadou Onana": "Onana",
  "Orel Mangala": "Mangala",
  "Arthur Vermeeren": "Vermeeren",
  "Timothy Castagne": "Castagne",
  "Wout Faes": "Faes",
  "Jan Vertonghen": "Vertonghen",
  "Zeno Debast": "Debast",
  "Koen Casteels": "Casteels",
  "Thibaut Courtois": "Courtois",
  "Matz Sels": "Sels",
  "Thomas Meunier": "Meunier",
  "Yannick Carrasco": "Carrasco",
  "Dodi Lukebakio": "Lukebakio",
  "Johan Bakayoko": "Bakayoko",
  "Charles De Ketelaere": "De Ketelaere",

  // ---- CROATIA ----
  "Luka Modrić": "Modrić",
  "Mateo Kovačić": "Kovačić",
  "Marcelo Brozović": "Brozović",
  "Ivan Perišić": "Perišić",
  "Andrej Kramarić": "Kramarić",
  "Joško Gvardiol": "Gvardiol",
  "Josip Stanišić": "Stanišić",
  "Josip Šutalo": "Šutalo",
  "Marin Pongračić": "Pongračić",
  "Dominik Livaković": "Livaković",
  "Ivica Ivušić": "Ivušić",
  "Lovro Majer": "Majer",
  "Mario Pašalić": "Pašalić",
  "Nikola Vlašić": "Vlašić",
  "Ante Budimir": "Budimir",
  "Marko Livaja": "Livaja",
  "Borna Sosa": "Sosa",
  "Josip Juranović": "Juranović",

  // ---- DENMARK ----
  "Christian Dannemann Eriksen": "Eriksen",
  "Pierre-Emile Højbjerg": "Højbjerg",
  "Rasmus Winther Højlund": "Højlund",
  "Kasper Schmeichel": "Schmeichel",
  "Simon Kjær": "Kjær",
  "Andreas Christensen": "Christensen",
  "Joachim Andersen": "Andersen",
  "Joakim Mæhle": "Mæhle",
  "Rasmus Kristensen": "R. Kristensen",
  "Victor Kristiansen": "V. Kristiansen",
  "Thomas Delaney": "Delaney",
  "Morten Hjulmand": "Hjulmand",
  "Alexander Bah": "Bah",
  "Andreas Skov Olsen": "Skov Olsen",
  "Yussuf Poulsen": "Poulsen",
  "Jonas Wind": "Wind",
  "Mikkel Damsgaard": "Damsgaard",
  "Jesper Lindstrøm": "Lindstrøm",
  "Anders Dreyer": "Dreyer",
  "Frederik Rønnow": "Rønnow",
};

function getShortName(full: string) {
  if (!full) return "?";
  if (COMMON_NAMES[full]) return COMMON_NAMES[full];

  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return full;
  if (parts.length === 2) return full;

  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  const compoundPrefixes = [
    "Le", "De", "Van", "Del", "Da", "Di", "La", "Mc", "O'", "St.",
  ];
  if (compoundPrefixes.includes(secondLast)) {
    return `${secondLast} ${last}`;
  }
  return last;
}

function initials(full: string) {
  if (!full) return "?";
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toSvg(x: number, y: number) {
  const innerW = SVG_W - 2 * MARGIN;
  const innerH = SVG_H - 2 * MARGIN;
  return {
    cx: MARGIN + (x / PITCH_W) * innerW,
    cy: MARGIN + (y / PITCH_H) * innerH,
  };
}

function curvePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curveOffset = 0.06
) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * len * curveOffset;
  const cy = my + ny * len * curveOffset;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

interface PNode {
  id: number;
  name: string;
  avg_x?: number;
  avg_y?: number;
}

interface PEdge {
  source: number;
  target: number;
  count: number;
}

interface PassNetworkData {
  match_id: number;
  team_id: number | null;
  total_passes: number;
  nodes: PNode[];
  edges: PEdge[];
}

interface EventItem {
  player_name: string | null;
  team_name: string | null;
}

export default function PassNetworkPage() {
  const { matchId } = useParams<{ matchId: string }>();

  const [data, setData] = useState<PassNetworkData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [minPasses, setMinPasses] = useState(3);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [showAllLabels, setShowAllLabels] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    const load = async () => {
      try {
        const [pnRes, evRes] = await Promise.all([
          fetch(`${API_BASE}/passnetwork/${matchId}`),
          fetch(`${API_BASE}/events/${matchId}`),
        ]);
        if (!pnRes.ok) throw new Error(`HTTP ${pnRes.status}`);
        const pnJson = await pnRes.json();
        setData(pnJson);
        if (evRes.ok) setEvents((await evRes.json()) || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matchId]);

  const playerTeamMap = useMemo(() => {
    const map: Record<string, string> = {};
    events.forEach((e) => {
      if (e.player_name && e.team_name && !map[e.player_name]) {
        map[e.player_name] = e.team_name;
      }
    });
    return map;
  }, [events]);

  const teams = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.nodes.forEach((n) => {
      const t = playerTeamMap[n.name];
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [data, playerTeamMap]);

  const teamColor = useMemo(() => {
    const m: Record<string, string> = {};
    teams.forEach((t, i) => (m[t] = TEAM_PALETTE[i % TEAM_PALETTE.length]));
    return m;
  }, [teams]);

  const filtered = useMemo(() => {
    if (!data) return { nodes: [], edges: [], totalPasses: 0 };
    let nodes = data.nodes;
    if (selectedTeam) {
      nodes = nodes.filter((n) => playerTeamMap[n.name] === selectedTeam);
    }
    const nodeIds = new Set(nodes.map((n) => n.id));
    let edges = data.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    edges = edges.filter((e) => e.count >= minPasses);
    const totalPasses = edges.reduce((s, e) => s + e.count, 0);
    return { nodes, edges, totalPasses };
  }, [data, selectedTeam, playerTeamMap, minPasses]);

  const layout = useMemo(() => {
    return filtered.nodes.map((n) => {
      const ax = typeof n.avg_x === "number" ? n.avg_x : 60;
      const ay = typeof n.avg_y === "number" ? n.avg_y : 40;
      const { cx, cy } = toSvg(ax, ay);
      return {
        ...n,
        x: cx,
        y: cy,
        team: playerTeamMap[n.name] || null,
      };
    });
  }, [filtered.nodes, playerTeamMap]);

  const nodeById = useMemo(() => {
    const m: Record<number, { x: number; y: number }> = {};
    layout.forEach((n) => (m[n.id] = { x: n.x, y: n.y }));
    return m;
  }, [layout]);

  const maxCount = useMemo(() => {
    if (filtered.edges.length === 0) return 1;
    return Math.max(...filtered.edges.map((e) => e.count), 1);
  }, [filtered.edges]);

  const highlightedEdges = useMemo(() => {
    if (hoveredNode === null) return new Set<number>();
    const s = new Set<number>();
    filtered.edges.forEach((e, i) => {
      if (e.source === hoveredNode || e.target === hoveredNode) s.add(i);
    });
    return s;
  }, [hoveredNode, filtered.edges]);

  const hasHover = hoveredNode !== null;

  const topPassers = useMemo(() => {
    const outgoing: Record<number, number> = {};
    const incoming: Record<number, number> = {};
    filtered.edges.forEach((e) => {
      outgoing[e.source] = (outgoing[e.source] || 0) + e.count;
      incoming[e.target] = (incoming[e.target] || 0) + e.count;
    });
    return filtered.nodes
      .map((n) => ({
        ...n,
        outgoing: outgoing[n.id] || 0,
        incoming: incoming[n.id] || 0,
        total: (outgoing[n.id] || 0) + (incoming[n.id] || 0),
      }))
      .sort((a, b) => b.outgoing - a.outgoing)
      .slice(0, 10);
  }, [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-500">Loading pass network...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-300">❌ {error}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-4xl mx-auto bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-300">
            ⚠️ No pass data for this match.
          </p>
          <Link
            href={`/match/${matchId}`}
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            ← Back to Match Detail
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href={`/match/${matchId}`}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back to Match Detail
        </Link>

        <div className="mt-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
            🔗 Pass Network
          </h1>
          <p className="text-gray-500 dark:text-gray-500 mt-1 text-sm">
            Player positions = average pitch location. Hover a node to
            view names & connections.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Passes" value={filtered.totalPasses} />
          <StatCard label="Players" value={filtered.nodes.length} />
          <StatCard label="Connections" value={filtered.edges.length} />
          <StatCard label="Most Passes" value={maxCount} />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-500 font-medium">
              Team:
            </span>
            <button
              onClick={() => setSelectedTeam(null)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                selectedTeam === null
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"
              }`}
            >
              All
            </button>
            {teams.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTeam(t)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition flex items-center gap-2 ${
                  selectedTeam === t
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: teamColor[t] }}
                />
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-500 font-medium">
              Min. passes:
            </span>
            {[1, 3, 5, 10].map((n) => (
              <button
                key={n}
                onClick={() => setMinPasses(n)}
                className={`px-2.5 py-1 rounded text-xs border transition ${
                  minPasses === n
                    ? "bg-gray-800 dark:bg-gray-700 text-white border-gray-800"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-500 border-gray-200 dark:border-gray-700"
                }`}
              >
                ≥ {n}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={showAllLabels}
              onChange={(e) => setShowAllLabels(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-xs text-gray-600 dark:text-gray-500">
              Show all names
            </span>
          </label>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 mb-6 overflow-hidden">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full h-auto"
            style={{ maxHeight: "75vh" }}
          >
            <defs>
              <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2e7d32" />
                <stop offset="100%" stopColor="#1b5e20" />
              </linearGradient>
              <radialGradient id="nodeGlow">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect
              x="0"
              y="0"
              width={SVG_W}
              height={SVG_H}
              fill="url(#grassGrad)"
              rx="8"
            />

            <PitchLines />

            <g>
              {filtered.edges.map((e, i) => {
                const a = nodeById[e.source];
                const b = nodeById[e.target];
                if (!a || !b) return null;

                const isHighlighted = highlightedEdges.has(i);
                const dim = hasHover && !isHighlighted;
                const thickness = 1 + (e.count / maxCount) * 5;
                const opacity = dim ? 0.05 : 0.15 + (e.count / maxCount) * 0.55;

                return (
                  <path
                    key={`edge-${i}`}
                    d={curvePath(a.x, a.y, b.x, b.y, 0.06)}
                    fill="none"
                    stroke={isHighlighted ? "#fde047" : "#fef3c7"}
                    strokeWidth={isHighlighted ? thickness + 1.5 : thickness}
                    strokeOpacity={opacity}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>

            <g>
              {layout.map((n) => {
                const color = n.team ? teamColor[n.team] : "#6b7280";
                const isHovered = hoveredNode === n.id;
                const dim = hasHover && !isHovered;
                const r = isHovered ? NODE_R + 3 : NODE_R;
                const showLabel = isHovered || showAllLabels;

                return (
                  <g
                    key={`node-${n.id}`}
                    style={{
                      cursor: "pointer",
                      opacity: dim ? 0.4 : 1,
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={() => setHoveredNode(n.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {isHovered && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={r + 12}
                        fill="url(#nodeGlow)"
                      />
                    )}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r}
                      fill={color}
                      stroke="white"
                      strokeWidth={2.5}
                    />
                    <text
                      x={n.x}
                      y={n.y + 5}
                      textAnchor="middle"
                      fontSize={11}
                      fill="white"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {initials(n.name)}
                    </text>
                    {showLabel && (
                      <g pointerEvents="none">
                        <rect
                          x={n.x - 75}
                          y={n.y + r + 4}
                          width={150}
                          height={22}
                          rx="4"
                          fill="rgba(17,24,39,0.9)"
                        />
                        <text
                          x={n.x}
                          y={n.y + r + 19}
                          textAnchor="middle"
                          fontSize={11}
                          fill="white"
                          fontWeight="600"
                        >
                          {getShortName(n.name)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            🏅 Top Passers (Outgoing)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">#</th>
                  <th className="text-left px-3 py-2 font-medium">Player</th>
                  <th className="text-left px-3 py-2 font-medium">Team</th>
                  <th className="text-right px-3 py-2 font-medium">Passes Out</th>
                  <th className="text-right px-3 py-2 font-medium">Passes In</th>
                  <th className="text-right px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {topPassers.map((p, i) => {
                  const team = playerTeamMap[p.name];
                  const color = team ? teamColor[team] : "#6b7280";
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-500 font-mono">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">
                        <span className="font-medium">
                          {getShortName(p.name)}
                        </span>
                        <span className="text-xs text-gray-500 ml-2 hidden md:inline">
                          {p.name}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: color }}
                        >
                          {team || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                        {p.outgoing}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-500 dark:text-gray-500">
                        {p.incoming}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium text-gray-900 dark:text-white">
                        {p.total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
      <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function PitchLines() {
  const innerW = SVG_W - 2 * MARGIN;
  const innerH = SVG_H - 2 * MARGIN;
  const sx = innerW / PITCH_W;
  const sy = innerH / PITCH_H;

  const L = MARGIN;
  const T = MARGIN;
  const R = SVG_W - MARGIN;
  const B = SVG_H - MARGIN;
  const CX = SVG_W / 2;
  const CY = SVG_H / 2;

  const u = (x: number, y: number) => ({
    x: L + x * sx,
    y: T + y * sy,
  });

  const penLeft = u(0, 18);
  const penRight = u(18, 62);
  const penRightL = u(102, 18);
  const penRightR = u(120, 62);

  const gaL = u(0, 30);
  const gaR = u(6, 50);
  const gaRL = u(114, 30);
  const gaRR = u(120, 50);

  const spotL = u(12, 40);
  const spotR = u(108, 40);

  const ccR = 10 * sx;
  const stroke = "rgba(255,255,255,0.75)";
  const lw = 2;

  return (
    <g>
      <rect
        x={L}
        y={T}
        width={innerW}
        height={innerH}
        fill="none"
        stroke={stroke}
        strokeWidth={lw}
      />
      <line x1={CX} y1={T} x2={CX} y2={B} stroke={stroke} strokeWidth={lw} />
      <circle
        cx={CX}
        cy={CY}
        r={ccR}
        fill="none"
        stroke={stroke}
        strokeWidth={lw}
      />
      <circle cx={CX} cy={CY} r={3} fill={stroke} />
      <rect
        x={penLeft.x}
        y={penLeft.y}
        width={penRight.x - penLeft.x}
        height={penRight.y - penLeft.y}
        fill="none"
        stroke={stroke}
        strokeWidth={lw}
      />
      <rect
        x={penRightL.x}
        y={penRightL.y}
        width={penRightR.x - penRightL.x}
        height={penRightR.y - penRightL.y}
        fill="none"
        stroke={stroke}
        strokeWidth={lw}
      />
      <rect
        x={gaL.x}
        y={gaL.y}
        width={gaR.x - gaL.x}
        height={gaR.y - gaL.y}
        fill="none"
        stroke={stroke}
        strokeWidth={lw}
      />
      <rect
        x={gaRL.x}
        y={gaRL.y}
        width={gaRR.x - gaRL.x}
        height={gaRR.y - gaRL.y}
        fill="none"
        stroke={stroke}
        strokeWidth={lw}
      />
      <circle cx={spotL.x} cy={spotL.y} r={3} fill={stroke} />
      <circle cx={spotR.x} cy={spotR.y} r={3} fill={stroke} />
      <rect
        x={L - 6}
        y={u(0, 36).y}
        width={6}
        height={u(0, 44).y - u(0, 36).y}
        fill="rgba(255,255,255,0.9)"
      />
      <rect
        x={R}
        y={u(0, 36).y}
        width={6}
        height={u(0, 44).y - u(0, 36).y}
        fill="rgba(255,255,255,0.9)"
      />
    </g>
  );
}