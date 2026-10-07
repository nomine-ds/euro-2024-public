// frontend/app/lab/page.tsx
"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { API_BASE } from "@/lib/api";

// ================================================================
// 10 TEMPLATE NOTEBOOK
// ================================================================

const TEMPLATES: Record<string, { name: string; icon: string; code: string }> = {
  welcome: {
    name: "Selamat Datang",
    icon: "👋",
    code: `# Selamat datang di Euro 2024 Public Data Lab!
# All Python code below runs in YOUR BROWSER (via Pyodide).

print("🏆 Euro 2024 Context Zone")
print("=" * 40)

angka = [1, 2, 3, 4, 5]
print(f"Sum: {sum(angka)}")
print(f"Average: {sum(numbers) / len(numbers)}")

kuadrat = [x ** 2 for x in range(1, 6)]
print(f"Kuadrat: {kuadrat}")

print()
print("✅ Success! Try other templates on the left.")`,
  },

  api: {
    name: "Fetch from API",
    icon: "🌐",
    code: `# Fetch data from FastAPI backend
from pyodide.http import pyfetch

response = await pyfetch(f"${API_BASE}/matches")
data = await response.json()

print(f"📊 Total matches: {len(data)}")
print()
print("First 5 matches:")
print("-" * 50)
for m in data[:5]:
    print(f"  {m['home_team']:15} vs {m['away_team']:15} ({m.get('date', 'TBD')})")`,
  },

  topScorers: {
    name: "Top Scorers",
    icon: "⚽",
    code: `# Analisis top scorers Euro 2024
from pyodide.http import pyfetch

response = await pyfetch(f"${API_BASE}/players/bulk")
players = await response.json()

top_scorers = sorted(players, key=lambda p: p.get('goals', 0), reverse=True)[:10]

print("⚽ TOP 10 SCORERS EURO 2024")
print("=" * 55)
print(f"{'Rank':<5} {'Player':<28} {'Team':<18} {'Goals':<6}")
print("-" * 55)

for i, p in enumerate(top_scorers, 1):
    name = p['player_name'][:26]
    team = (p.get('team_name') or 'Unknown')[:16]
    print(f"{i:<5} {name:<28} {team:<18} {p['goals']:<4}")

print()
print(f"Total players analyzed: {len(players)}")`,
  },

  cluster: {
    name: "Player Clustering",
    icon: "🧩",
    code: `# Cluster players with K-Means
from pyodide.http import pyfetch

response = await pyfetch(f"${API_BASE}/players/clustering?n_clusters=4")
data = await response.json()

print("🧩 PLAYER CLUSTERING (4 CLUSTERS)")
print("=" * 50)

clusters = {}
for p in data['players']:
    label = p.get('cluster_label', 'Unknown')
    if label not in clusters:
        clusters[label] = []
    clusters[label].append(p)

for label, members in clusters.items():
    print()
    print(f"📊 {label}")
    print(f"   Total: {len(members)} players")
    top = sorted(members, key=lambda p: p['goals'], reverse=True)[:3]
    for p in top:
        print(f"   • {p['player_name']} ({p.get('team_name', '?')}) - {p['goals']} goals")`,
  },

  compare: {
    name: "Compare Two Teams",
    icon: "⚖️",
    code: `# Compare two teams
from pyodide.http import pyfetch

teams_resp = await pyfetch(f"${API_BASE}/teams")
teams = await teams_resp.json()

spain = next((t for t in teams if t['team_name'] == 'Spain'), None)
england = next((t for t in teams if t['team_name'] == 'England'), None)

if not spain or not england:
    print("❌ Team not found")
else:
    print(f"⚖️ PERBANDINGAN: Spain vs England")
    print("=" * 60)

    url = f"${API_BASE}/compare/teams?team_ids={spain['team_id']},{england['team_id']}"
    resp = await pyfetch(url)
    data = await resp.json()

    if len(data) >= 2:
        stats_spain = data[0]
        stats_england = data[1]

        metrics = [('Goals', 'goals'), ('Shots', 'shots'), ('Passes', 'passes'),
                   ('xG', 'xG'), ('xA', 'xA')]

        print(f"{'Metric':<12} {'Spain':<12} {'England':<12}")
        print("-" * 36)
        for label, key in metrics:
            print(f"{label:<12} {stats_spain.get(key, 0):<12} {stats_england.get(key, 0):<12}")`,
  },

  cards: {
    name: "Cards & Discipline",
    icon: "🟨",
    code: `# Analyze yellow & red cards
from pyodide.http import pyfetch

response = await pyfetch(f"${API_BASE}/players/bulk")
players = await response.json()

# Filter players with cards (from event data)
print("🟨 EURO 2024 CARD ANALYSIS")
print("=" * 50)
print()
print("Note: Card data is available at event-level.")
print("To see cards, query endpoint /events/{match_id}")
print()

# Example: Germany vs Scotland match with a red card
url = f"${API_BASE}/events/3930158"
resp = await pyfetch(url)
events = await resp.json()

cards = [e for e in events if e.get('card_type')]

print(f"📊 Match Germany vs Scotland (3930158):")
print(f"   Total cards: {len(cards)}")
for c in cards:
    print(f"   • {c['player_name']} - {c['card_type']} (minute {c.get('timestamp', 0)})")`,
  },

  shots: {
    name: "Shot Map Analysis",
    icon: "🎯",
    code: `# Analyze shot map of Euro 2024 final
from pyodide.http import pyfetch

url = f"${API_BASE}/events/3943043"
resp = await pyfetch(url)
events = await resp.json()

shots = [e for e in events if e.get('event_type') == 'Shot']

print("🎯 SHOT MAP - FINAL EURO 2024 (Spain vs England)")
print("=" * 60)
print(f"Total shots: {len(shots)}")
print()

print("Shot positions on the pitch (x: 0-120, y: 0-80):")
print(f"{'Player':<28} {'x':<8} {'y':<8} {'Result':<15}")
print("-" * 60)

for s in shots[:15]:
    name = (s.get('player_name') or 'Unknown')[:26]
    x = round(s.get('x', 0), 1)
    y = round(s.get('y', 0), 1)
    outcome = s.get('outcome') or 'Unknown'
    print(f"{name:<28} {x:<8} {y:<8} {outcome:<15}")

print()
print(f"Total goals: {sum(1 for s in shots if s.get('is_goal'))}")`,
  },

  xg: {
    name: "Player xG Analysis",
    icon: "📊",
    code: `# Analyze xG per player
from pyodide.http import pyfetch

response = await pyfetch(f"${API_BASE}/players/bulk")
players = await response.json()

# Top 10 by xG
top_xg = sorted(players, key=lambda p: p.get('xg', 0), reverse=True)[:10]

print("📊 TOP 10 PLAYERS BY xG")
print("=" * 60)
print(f"{'Rank':<5} {'Player':<28} {'Team':<18} {'xG':<8}")
print("-" * 60)

for i, p in enumerate(top_xg, 1):
    name = p['player_name'][:26]
    team = (p.get('team_name') or 'Unknown')[:16]
    xg = round(p.get('xg', 0), 2)
    print(f"{i:<5} {name:<28} {team:<18} {xg:<8}")

# Perbandingan xG vs actual goals
print()
print("🔍 OVERPERFORMERS (Goals > xG):")
print("-" * 60)
over = [p for p in players if p.get('goals', 0) > p.get('xg', 0) and p.get('goals', 0) > 0]
over_sorted = sorted(over, key=lambda p: p['goals'] - p['xg'], reverse=True)[:5]
for p in over_sorted:
    diff = round(p['goals'] - p['xg'], 2)
    print(f"  {p['player_name'][:30]:<32} +{diff}")`,
  },

  momentum: {
    name: "Match Momentum",
    icon: "📈",
    code: `# Analyze match momentum (rolling xG)
from pyodide.http import pyfetch

# Use the final match
url = f"${API_BASE}/tactical/3943043"
resp = await pyfetch(url)
data = await resp.json()

rolling = data.get('rolling_data', {})
bins = rolling.get('bins', [])
xg = rolling.get('xg_rolling', [])

print("📈 MOMENTUM - FINAL EURO 2024")
print("=" * 50)
print(f"Window: {rolling.get('window_minutes', 5)} minutes")
print()

print(f"{'Minute':<10} {'xG':<10} {'Bar':<40}")
print("-" * 60)
for i, b in enumerate(bins):
    xg_val = xg[i] if i < len(xg) else 0
    bar = '█' * int(xg_val * 20)
    print(f"{b:<10} {round(xg_val, 3):<10} {bar}")

print()
cp = data.get('change_points', [])
print(f"⚡ Perubahan taktik terdeteksi: {len(cp)}")
for c in cp:
    print(f"   • Minute {c['minute']}: xG increased from {c['xg_before']:.3f} to {c['xg_after']:.3f}")`,
  },

  penalty: {
    name: "Penalties & Set Pieces",
    icon: "🎪",
    code: `# Analyze penalties and set pieces
from pyodide.http import pyfetch

response = await pyfetch(f"${API_BASE}/matches")
matches = await response.json()

print("🎪 PENALTY & SET PIECE ANALYSIS")
print("=" * 50)
print(f"Total match: {len(matches)}")
print()
print("Note: For detailed analysis, use endpoint /events/{match_id}")
print("and filter event_type='Shot' by location in penalty area.")
print()

# Example: check shots in the final
url = f"${API_BASE}/events/3943043"
resp = await pyfetch(url)
events = await resp.json()

shots = [e for e in events if e.get('event_type') == 'Shot']
inside_box = [s for s in shots if s.get('x', 0) > 102 and 18 < s.get('y', 0) < 62]

print(f"📊 Shots in the penalty box (final):")
print(f"   Total: {len(inside_box)} of {len(shots)} shots")
for s in inside_box[:10]:
    print(f"   • {s['player_name']} ({s['team_name']}) minute {s.get('timestamp', 0)}")`,
  },
};

type TemplateKey = keyof typeof TEMPLATES;

interface Notebook {
  id: string;
  name: string;
  code: string;
  output: string;
}

// ================================================================
// KOMPONEN UTAMA
// ================================================================

function LabContent() {
  const searchParams = useSearchParams();

  const [pyodide, setPyodide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Loading Python runtime...");
  const [notebooks, setNotebooks] = useState<Notebook[]>([
    { id: "1", name: "Notebook 1", code: TEMPLATES.welcome.code, output: "" },
  ]);
  const [activeTab, setActiveTab] = useState("1");
  const [running, setRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const activeNotebook = notebooks.find((n) => n.id === activeTab) || notebooks[0];

  // Load Pyodide
  useEffect(() => {
    const loadPyodide = async () => {
      try {
        if (!(window as any).loadPyodide) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        setLoadingMsg("Initializing Python...");
        const py = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
        });

        setLoadingMsg("Loading libraries...");
        await py.loadPackagesFromImports(`
import json
import math
        `);

        setPyodide(py);
        setLoading(false);
        toast.success("Python is ready!");
      } catch (err: any) {
        setLoadingMsg(`❌ Failed: ${err.message}`);
        toast.error("Failed to load Python");
      }
    };
    loadPyodide();
  }, []);

  // Load from share URL or localStorage
  useEffect(() => {
    const shareParam = searchParams.get("code");
    if (shareParam) {
      try {
        const decoded = atob(shareParam);
        setNotebooks([{ id: "1", name: "Shared Notebook", code: decoded, output: "" }]);
        toast.success("Notebook loaded from share link");
      } catch {
        toast.error("Invalid share link");
      }
    } else {
      const saved = localStorage.getItem("euro2024_notebooks");
      if (saved) {
        try {
          setNotebooks(JSON.parse(saved));
        } catch {}
      }
    }
  }, [searchParams]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("euro2024_notebooks", JSON.stringify(notebooks));
  }, [notebooks]);

  // Run code
  const runCode = async () => {
    if (!pyodide || running) return;
    setRunning(true);
    updateActiveOutput("⏳ Running...\n");

    try {
      pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
      `);

      await pyodide.runPythonAsync(activeNotebook.code);

      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      const stderr = pyodide.runPython("sys.stderr.getvalue()");

      let finalOutput = stdout || "";
      if (stderr) finalOutput += "\n⚠️ STDERR:\n" + stderr;
      if (!finalOutput.trim()) finalOutput = "✅ Code executed (no output).";

      updateActiveOutput(finalOutput);
      toast.success("Code executed successfully");
    } catch (err: any) {
      updateActiveOutput(`❌ Error:\n${err.message || String(err)}`);
      toast.error("Error while running code");
    } finally {
      setRunning(false);
    }
  };

  const updateActiveOutput = (output: string) => {
    setNotebooks((prev) =>
      prev.map((n) => (n.id === activeTab ? { ...n, output } : n))
    );
  };

  const updateActiveCode = (code: string) => {
    setNotebooks((prev) =>
      prev.map((n) => (n.id === activeTab ? { ...n, code } : n))
    );
  };

  const loadTemplate = (key: TemplateKey) => {
    const t = TEMPLATES[key];
    setNotebooks((prev) =>
      prev.map((n) =>
        n.id === activeTab ? { ...n, code: t.code, output: `📋 Template "${t.name}" loaded.` } : n
      )
    );
    toast.success(`Template "${t.name}" loaded`);
  };

  const addNotebook = () => {
    const newId = String(Date.now());
    setNotebooks((prev) => [
      ...prev,
      { id: newId, name: `Notebook ${prev.length + 1}`, code: "# Notebook baru\nprint('Hello!')\n", output: "" },
    ]);
    setActiveTab(newId);
    toast.success("Notebook baru dibuat");
  };

  const closeNotebook = (id: string) => {
    if (notebooks.length === 1) {
      toast.error("Minimal 1 notebook");
      return;
    }
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
    if (activeTab === id) {
      setActiveTab(notebooks.find((n) => n.id !== id)!.id);
    }
  };

  const shareNotebook = () => {
    const encoded = btoa(activeNotebook.code);
    const url = `${window.location.origin}/lab?code=${encoded}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied!");
  };

  const exportPNG = async () => {
    if (!outputRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(outputRef.current, {
        backgroundColor: "#111827",
      });
      const link = document.createElement("a");
      link.download = `euro2024_output_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("PNG diunduh");
    } catch (err) {
      toast.error("Failed to export PNG");
    }
  };

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("Euro 2024 Data Lab - Analysis Report", 10, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 10, 22);
      doc.setFontSize(12);
      doc.text("Code:", 10, 32);

      const codeLines = doc.splitTextToSize(activeNotebook.code, 180);
      doc.setFontSize(9);
      doc.text(codeLines, 10, 40);

      const yAfterCode = 40 + codeLines.length * 5 + 10;
      doc.setFontSize(12);
      doc.text("Output:", 10, yAfterCode);
      doc.setFontSize(9);
      const outputLines = doc.splitTextToSize(activeNotebook.output || "(empty)", 180);
      doc.text(outputLines, 10, yAfterCode + 8);

      doc.save(`euro2024_report_${Date.now()}.pdf`);
      toast.success("PDF diunduh");
    } catch (err) {
      toast.error("Failed to export PDF");
    }
  };

  const downloadScript = () => {
    const blob = new Blob([activeNotebook.code], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `euro2024_${Date.now()}.py`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Script diunduh");
  };

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          ← Back
        </Link>

        <div className="mt-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
            🧪 Public Data Lab v2
          </h1>
          <p className="text-gray-500 dark:text-gray-500 mt-1">
            Python REPL + 10 template + Export PDF/PNG + Share link + Multi-tab
          </p>
        </div>

        {/* Status */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 text-xs">
          {loading ? (
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span>{loadingMsg}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
              <span>✅ Python ready</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">API: {API_BASE}</span>
            </div>
          )}
        </div>

        {/* Multi-tab Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl border border-b-0 border-gray-200 dark:border-gray-700 p-2 flex items-center gap-1 overflow-x-auto">
          {notebooks.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                activeTab === n.id
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => setActiveTab(n.id)}
            >
              <span>{n.name}</span>
              {notebooks.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeNotebook(n.id);
                  }}
                  className="hover:bg-black/10 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addNotebook}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            + New Tab
          </button>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
          {/* Sidebar Templates */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 border border-r-0 border-gray-200 dark:border-gray-700 p-2 max-h-[600px] overflow-y-auto">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">
              📚 Templates
            </div>
            <ul className="space-y-1">
              {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => (
                <li key={key}>
                  <button
                    onClick={() => loadTemplate(key)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex items-center gap-2"
                  >
                    <span>{TEMPLATES[key].icon}</span>
                    <span>{TEMPLATES[key].name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Editor + Output */}
          <div className="lg:col-span-3 space-y-0">
            {/* Editor */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  🐍 {activeNotebook.name}
                </span>
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={downloadScript}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    📥 .py
                  </button>
                  <button
                    onClick={shareNotebook}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    🔗 Share
                  </button>
                  <button
                    onClick={exportPDF}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    📄 PDF
                  </button>
                  <button
                    onClick={exportPNG}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    🖼️ PNG
                  </button>
                  <button
                    onClick={runCode}
                    disabled={loading || running}
                    className="text-xs px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium"
                  >
                    {running ? "⏳ Running" : "▶️ Run"}
                  </button>
                </div>
              </div>
              <textarea
                value={activeNotebook.code}
                onChange={(e) => updateActiveCode(e.target.value)}
                spellCheck={false}
                disabled={loading}
                className="w-full h-72 p-4 font-mono text-sm bg-gray-900 text-green-400 focus:outline-none resize-none disabled:opacity-50"
              />
            </div>

            {/* Output */}
            <div className="bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-2xl overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-gray-900 dark:text-white text-sm">📤 Output</span>
              </div>
              <div
                ref={outputRef}
                className="w-full min-h-[200px] max-h-[400px] p-4 font-mono text-sm bg-gray-900 text-gray-300 overflow-auto whitespace-pre-wrap"
              >
                {activeNotebook.output || "▶️ Click 'Run' to execute code."}
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 text-xs">
          <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">💡 Tips</p>
          <ul className="space-y-1 text-yellow-700 dark:text-yellow-400 list-disc list-inside">
            <li>10 ready-to-use templates in the left sidebar</li>
            <li>Multi-tab: click "+ New Tab" for parallel notebooks</li>
            <li>Share link: send the URL to a friend, code auto-loads</li>
            <li>Export PDF/PNG for reports</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

export default function LabPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-8" role="status">Loading the data lab…</main>}>
      <LabContent />
    </Suspense>
  );
}