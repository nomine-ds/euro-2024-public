// frontend/app/components/Navbar.tsx
"use client";

import Link from "next/link";
import { navIcons } from "@/lib/icons";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import ThemeToggle from "./ThemeToggle";
import { Trophy, ChevronDown, Menu, X, Search } from "lucide-react";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/players", label: "Players" },
  { href: "/compare", label: "Compare" },
  { href: "/bot", label: "Bot" },
  { href: "/lab", label: "Lab" },
];

const moreLinks = [
  { href: "/match-similarity", label: "Match Similarity" },
  { href: "/clusters", label: "Player Clusters" },
  { href: "/player-comparison", label: "Player Comparison" },
  { href: "/counterfactual", label: "Counterfactual" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const moreRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [searchOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  const isMoreActive = moreLinks.some((l) => isActive(l.href));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setSearchOpen(false);
    }
  };

  return (
    <>
      <nav
        data-tour="nav"
        className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <Trophy
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform"
                strokeWidth={2}
              />
              <span className="font-semibold text-lg text-gray-900 dark:text-white tracking-tight">
                Euro 2024
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <div ref={moreRef} className="relative">
                <button
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isMoreActive
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  aria-haspopup="true"
                  aria-expanded={moreOpen}
                >
                  More
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                    strokeWidth={2}
                  />
                </button>

                {moreOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 py-1.5 z-50">
                    {moreLinks.map((link) => {
                      const Icon = navIcons[link.href];
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                            isActive(link.href)
                              ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          }`}
                        >
                          {Icon ? <Icon className="w-4 h-4 shrink-0" strokeWidth={2} /> : null}
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSearchOpen(true)}
                className="ml-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4" strokeWidth={2} />
                <kbd className="hidden lg:inline text-[10px] font-mono px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600">
                  Cmd+K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                aria-label="Search"
              >
                <Search className="w-5 h-5" strokeWidth={2} />
              </button>

              <ThemeToggle />

              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div
        className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-200 ${
          mobileOpen ? "opacity-100 pointer-events-auto visible" : "opacity-0 pointer-events-none invisible"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />

        <aside
          className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200 dark:border-gray-800">
            <span className="font-semibold text-gray-900 dark:text-white tracking-tight">
              Menu
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 px-3">
            <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide px-3 mb-2">
              Main
            </div>
            {primaryLinks.map((link) => {
              const Icon = navIcons[link.href];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {Icon ? <Icon className="w-4 h-4 shrink-0" strokeWidth={2} /> : null}
                  {link.label}
                </Link>
              );
            })}

            <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide px-3 mt-4 mb-2">
              More
            </div>
            {moreLinks.map((link) => {
              const Icon = navIcons[link.href];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {Icon ? <Icon className="w-4 h-4 shrink-0" strokeWidth={2} /> : null}
                  {link.label}
                </Link>
              );
            })}
          </div>
        </aside>
      </div>

      <div
        className={`fixed inset-0 z-[70] flex items-start justify-center pt-24 px-4 transition-opacity duration-150 ${
          searchOpen ? "opacity-100 pointer-events-auto visible" : "opacity-0 pointer-events-none invisible"
        }`}
        aria-hidden={!searchOpen}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        />
        <div
          className={`relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-transform duration-150 ${
            searchOpen ? "scale-100" : "scale-95"
          }`}
        >
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <Search className="w-5 h-5 text-gray-500 shrink-0" strokeWidth={2} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players, matches, teams..."
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-mono px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600"
            >
              Esc
            </button>
          </form>
          <div className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
            Press Enter to search. Results include matches and players.
          </div>
        </div>
      </div>
    </>
  );
}