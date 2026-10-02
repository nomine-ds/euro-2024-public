// frontend/components/KeyboardShortcuts.tsx
"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

const SHORTCUTS = [
  { keys: "g h", desc: "Home" },
  { keys: "g p", desc: "Players" },
  { keys: "g s", desc: "Match Similarity" },
  { keys: "g c", desc: "Clusters" },
  { keys: "g t", desc: "Compare Teams" },
  { keys: "g v", desc: "Compare Players" },
  { keys: "g b", desc: "Hudl Bot" },
  { keys: "g l", desc: "Data Lab" },
  { keys: "?", desc: "Tampilkan bantuan" },
  { keys: "Esc", desc: "Tutup bantuan" },
];

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  // Navigation: g + key
  useHotkeys("g+h", () => router.push("/"), { preventDefault: true });
  useHotkeys("g+p", () => router.push("/players"), { preventDefault: true });
  useHotkeys("g+s", () => router.push("/match-similarity"), { preventDefault: true });
  useHotkeys("g+c", () => router.push("/clusters"), { preventDefault: true });
  useHotkeys("g+t", () => router.push("/compare"), { preventDefault: true });
  useHotkeys("g+v", () => router.push("/player-comparison"), { preventDefault: true });
  useHotkeys("g+b", () => router.push("/bot"), { preventDefault: true });
  useHotkeys("g+l", () => router.push("/lab"), { preventDefault: true });

  // Help
  useHotkeys("shift+slash", () => setShowHelp(true), { preventDefault: true });
  useHotkeys("esc", () => setShowHelp(false));

  // Dark mode toggle (menggunakan next-themes via event)
  useHotkeys("shift+d", () => {
    const btn = document.querySelector('[aria-label="Toggle theme"]') as HTMLElement;
    btn?.click();
    toast.success("Dark mode toggled");
  });

  return (
    <>
      {showHelp && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                ⌨️ Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <ul className="space-y-2">
              {SHORTCUTS.map((s, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{s.desc}</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-800 dark:text-gray-200">
                    {s.keys}
                  </kbd>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              Tekan <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">?</kbd>{" "}
              at any time to open this help.
            </div>
          </div>
        </div>
      )}
    </>
  );
}