// frontend/app/components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/players", label: "Players", icon: "👤" },
    { href: "/match-similarity", label: "Similarity", icon: "🔍" },
    { href: "/clusters", label: "Clusters", icon: "🧩" },
    { href: "/compare", label: "Compare Teams", icon: "⚽" },
    { href: "/player-comparison", label: "Compare Players", icon: "🆚" },
    { href: "/bot", label: "Hudl Bot", icon: "🤖" },
    { href: "/lab", label: "Data Lab", icon: "🧪" },
    { href: "/counterfactual", label: "Counterfactual", icon: "🔮" },
    { href: "/cognitive", label: "Cognitive", icon: "🧠" },
    { href: "/ghost", label: "Ghost", icon: "👻" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <nav
      data-tour="nav"
      className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">
              🏆
            </span>
            <span className="font-bold text-lg text-gray-900 dark:text-white">
              Euro 2024
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive(link.href)
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <span className="mr-1">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(link.href)
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}