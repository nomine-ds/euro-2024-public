// frontend/app/error.tsx
"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <AlertTriangle
        className="w-12 h-12 text-emerald-600 dark:text-emerald-400"
        strokeWidth={1.5}
        aria-hidden="true"
      />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {error.message || "Failed to load this page. Please try again."}
        </p>
      </div>

      {error.digest && (
        <p className="font-mono text-xs text-neutral-400 dark:text-neutral-600">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <RotateCw className="w-4 h-4" strokeWidth={2} />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Home className="w-4 h-4" strokeWidth={2} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}