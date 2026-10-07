// frontend/app/error.tsx
"use client";

import { useEffect } from "react";

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
      <div className="text-6xl" role="img" aria-label="Error">
        ⚠️
      </div>

      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        Terjadi kesalahan
      </h1>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {error.message || "Failed to load page. Please try again."}
      </p>

      {error.digest && (
        <p className="font-mono text-xs text-neutral-400 dark:text-neutral-600">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Coba lagi
        </button>
        <a
          href="/"
          className="rounded-md border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Kembali ke Beranda
        </a>
      </div>
    </div>
  );
}