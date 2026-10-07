// frontend/app/components/Onboarding.tsx
"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "euro2024_seen_onboarding";

interface Step {
  title: string;
  description: string;
  target: string | null;
  position: "center" | "bottom" | "top";
}

const STEPS: Step[] = [
  {
    title: "👋 Selamat Datang di Euro 2024 Context Zone!",
    description:
      "Interactive tactical analysis platform with StatsBomb 360 data. Let's explore its features in 6 short steps.",
    target: null,
    position: "center",
  },
  {
    title: "🏠 Navigasi Utama",
    description:
      "Use the menu above to navigate between pages: Home, Players, Similarity, Clusters, Compare, Bot, and Data Lab.",
    target: "nav",
    position: "bottom",
  },
  {
    title: "👤 Players Page",
    description:
      "View complete statistics for all Euro 2024 players. Filter by team, position, and sort by your favorite metrics.",
    target: null,
    position: "center",
  },
  {
    title: "🤖 Hudl Bot",
    description:
      "Ask anything about Euro 2024! RAG-based AI bot with 17,000+ events from StatsBomb. Example: 'Who scored in the final?'",
    target: null,
    position: "center",
  },
  {
    title: "🧪 Public Data Lab",
    description:
      "Write and run Python directly in the browser! 10 ready-to-use analysis templates, export PDF/PNG, and share links with friends.",
    target: null,
    position: "center",
  },
  {
    title: "⚡ Keyboard Shortcuts",
    description:
      "Press ? to see all shortcuts. Quick navigation with g + [key]. Example: g p = Players, g b = Bot, g l = Lab.",
    target: null,
    position: "center",
  },
  {
    title: "🎉 Ready to Explore!",
    description:
      "You are now ready to use all features. If you need help again, click the '?' button in the footer to see this tour again.",
    target: null,
    position: "center",
  },
];

export default function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Cek localStorage
    if (typeof window === "undefined") {
      return undefined;
    }

    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, []);

  // Highlight target saat step berubah
  useEffect(() => {
    if (!show) return;
    const currentStep = STEPS[step];
    if (!currentStep.target) {
      setHighlightRect(null);
      return;
    }

    const targetEl = document.querySelector(
      `[data-tour="${currentStep.target}"]`
    );
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      setHighlightRect(rect);
    } else {
      setHighlightRect(null);
    }
  }, [step, show]);

  // Keyboard support
  useEffect(() => {
    if (!show) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [show, step]);

  const finish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setShow(false);
    setStep(0);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!show) return null;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <>
      {/* Overlay gelap */}
      <div
        className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={finish}
      />

      {/* Highlight box */}
      {highlightRect && (
        <div
          className="fixed z-[1000] pointer-events-none transition-all duration-300"
          style={{
            left: highlightRect.left - 8,
            top: highlightRect.top - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.5), 0 0 0 4px #3b82f6",
            borderRadius: "12px",
          }}
        />
      )}

      {/* Card tour */}
      <div
        className="fixed z-[1001] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4 transition-all duration-300"
        style={{
          left: "50%",
          top: currentStep.target ? "auto" : "50%",
          bottom: currentStep.position === "bottom" ? "10%" : "auto",
          transform: currentStep.target
            ? "translateX(-50%)"
            : "translate(-50%, -50%)",
        }}
      >
        {/* Progress */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-blue-600"
                    : i < step
                    ? "w-1.5 bg-blue-400"
                    : "w-1.5 bg-gray-300 dark:bg-gray-600"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* Content */}
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {currentStep.title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
          {currentStep.description}
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={finish}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            Skip
          </button>

          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={prev}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
              >
                ← Sebelumnya
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              {isLast ? "Start Exploring 🚀" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ================================================================
// Hook untuk reset onboarding (dipanggil dari footer)
// ================================================================
export function resetOnboarding() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
}