// frontend/app/components/Onboarding.tsx
"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_DISMISSED = "euro2024_tour_dismissed";
const STORAGE_COMPLETED = "euro2024_tour_completed";
export const TOUR_OPEN_EVENT = "euro2024:open-tour";

interface Step {
  title: string;
  description: string;
  target: string | null;
  position: "center" | "bottom" | "top";
}

const STEPS: Step[] = [
  {
    title: "Welcome to Euro 2024 Context Zone",
    description:
      "Interactive tactical analysis platform with StatsBomb 360 data. Let's explore the features in 6 short steps.",
    target: null,
    position: "center",
  },
  {
    title: "Main Navigation",
    description:
      "Use the top menu to navigate between pages: Home, Players, Compare, Bot, Lab, and more under the More menu.",
    target: "nav",
    position: "bottom",
  },
  {
    title: "Players Page",
    description:
      "View complete stats for all Euro 2024 players. Filter by team, sort by goals, assists, xG, and more.",
    target: null,
    position: "center",
  },
  {
    title: "Hudl Bot",
    description:
      "Ask anything about Euro 2024. RAG-based AI bot with 17,000+ events from StatsBomb. Example: 'Who scored in the final?'",
    target: null,
    position: "center",
  },
  {
    title: "Public Data Lab",
    description:
      "Write and run Python directly in your browser. 10 ready-to-use analysis templates with export options.",
    target: null,
    position: "center",
  },
  {
    title: "Keyboard Shortcuts",
    description:
      "Press ? to see all shortcuts. Navigate quickly with g + [key]. Example: g p = Players, g b = Bot, g l = Lab.",
    target: null,
    position: "center",
  },
  {
    title: "Ready to Explore",
    description:
      "You are ready to use all features. Press ? in the footer to reopen this tour at any time.",
    target: null,
    position: "center",
  },
];

export default function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  // Listen for manual open event
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setShow(true);
    };
    window.addEventListener(TOUR_OPEN_EVENT, handler);
    return () => window.removeEventListener(TOUR_OPEN_EVENT, handler);
  }, []);

  // Highlight target when step changes
  useEffect(() => {
    if (!show) return;
    const target = STEPS[step].target;
    if (!target) {
      setHighlightRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${target}"]`);
    if (el) {
      setHighlightRect(el.getBoundingClientRect());
      if (typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setHighlightRect(null);
    }
  }, [step, show]);

  // Escape key to close
  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  });

  const close = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_DISMISSED, "true");
    }
    setShow(false);
    setStep(0);
  }, []);

  const finish = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_COMPLETED, "true");
      localStorage.setItem(STORAGE_DISMISSED, "true");
    }
    setShow(false);
    setStep(0);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  }, [step, finish]);

  const prev = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  if (!show) return null;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      <div
        className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {highlightRect && (
        <div
          className="fixed z-[1000] pointer-events-none transition-all duration-300"
          style={{
            left: highlightRect.left - 8,
            top: highlightRect.top - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.5), 0 0 0 3px #10b981",
            borderRadius: "12px",
          }}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="fixed z-[1001] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4 overflow-hidden"
        style={{
          left: "50%",
          top: currentStep.target ? "auto" : "50%",
          bottom: currentStep.position === "bottom" ? "10%" : "auto",
          transform: currentStep.target
            ? "translateX(-50%)"
            : "translate(-50%, -50%)",
        }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
              Step {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={close}
              aria-label="Close tour"
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <h2
            id="onboarding-title"
            className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-2"
          >
            {currentStep.title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
            {currentStep.description}
          </p>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={close}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Skip tour
            </button>

            <div className="flex gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Previous
                </button>
              )}
              <button
                onClick={next}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                {isLast ? "Start Exploring" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function resetOnboarding() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_DISMISSED);
    localStorage.removeItem(STORAGE_COMPLETED);
    window.location.reload();
  }
}

export function isTourDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_DISMISSED) === "true";
}