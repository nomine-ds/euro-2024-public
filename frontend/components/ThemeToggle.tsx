"use client";

import { useTheme } from "@teispace/next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 16a7 7 0 1 1 7-7 7 7 0 0 1-7 7z" />
          <path d="M12 0v2m0 20v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M0 12h2m20 0h2M4.22 19.78l1.42-1.42m12.72-12.72l1.42-1.42" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 0 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
          <path d="M12 6v12m-6-6h12" />
        </svg>
      )}
    </button>
  );
}