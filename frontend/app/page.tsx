// frontend/app/page.tsx
"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { featureIcons, statIcons } from "@/lib/icons";
import { API_BASE } from "@/lib/api";
import { TOUR_OPEN_EVENT, isTourDismissed } from "./components/Onboarding";
import { Sparkles, X } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

interface Stats {
  matches: number;
  events: number;
  teams: number;
  matches360: number;
}

function TourBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setVisible(!isTourDismissed());
  }, []);

  if (!mounted || !visible) return null;

  const takeTour = () => {
    window.dispatchEvent(new Event(TOUR_OPEN_EVENT));
    setVisible(false);
  };

  const dismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("euro2024_tour_dismissed", "true");
    }
    setVisible(false);
  };

  return (
    <div className="max-w-3xl mx-auto mt-12 px-4">
      <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3">
        <Sparkles
          className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0"
          strokeWidth={2}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            New to Euro 2024 Context Zone?
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Take a 30-second tour to see what you can do.
          </p>
        </div>
        <button
          onClick={takeTour}
          className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shrink-0"
        >
          Take tour
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss tour banner"
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shrink-0"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    matches: 51,
    events: 0,
    teams: 24,
    matches360: 0,
  });

  useEffect(() => {
    fetch(`${API_BASE}/`)
      .then((res) => res.json())
      .then((data) => {
        setStats((prev) => ({ ...prev, events: data.total_events || 0 }));
      })
      .catch(() => {});

    fetch(`${API_BASE}/matches/with360`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStats((prev) => ({ ...prev, matches360: data.length }));
        }
      })
      .catch(() => {});
  }, []);

  const features = [
    {
      href: "/bot",
      title: "Hudl Bot",
      desc: "Ask anything about Euro 2024 with AI",
    },
    {
      href: "/match-similarity",
      title: "Match Similarity",
      desc: "Find matches with similar patterns",
    },
    {
      href: "/clusters",
      title: "Player Clusters",
      desc: "Group players by playing style",
    },
    {
      href: "/players",
      title: "Player Stats",
      desc: "Complete stats for all players",
    },
    {
      href: "/player-comparison",
      title: "Player Comparison",
      desc: "Compare 2-4 players with radar chart",
    },
    {
      href: "/compare",
      title: "Compare Teams",
      desc: "Compare two teams head-to-head",
    },
    {
      href: "/lab",
      title: "Data Lab",
      desc: "Run Python analysis in the browser",
    },
    {
      href: "/counterfactual",
      title: "Counterfactual",
      desc: "Simulate alternative match scenarios",
    },

  ];

  return (
    <main className="min-h-screen">
      <motion.section
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-100 dark:bg-emerald-950/30 rounded-full blur-3xl opacity-40" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-200 dark:bg-emerald-900/20 rounded-full blur-3xl opacity-40" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
          <motion.div variants={itemVariants} className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Data 360 is ready
            </div>

            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-6">
              <span className="text-emerald-600 dark:text-emerald-400">
                Euro 2024
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">Context Zone</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10">
              Interactive tactical analysis with StatsBomb 360 data. Discover the story
behind every match.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/bot"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Ask Hudl Bot
              </Link>
              <Link
                href="/players"
                className="px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors border border-gray-200 dark:border-gray-700"
              >
                View Players
              </Link>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto"
          >
            {[
              { label: "Matches", value: stats.matches },
              {
                label: "Events",
                value: stats.events > 0 ? stats.events.toLocaleString() : "—",
              },
              { label: "Teams", value: stats.teams },
              {
                label: "Match 360",
                value: stats.matches360 > 0 ? stats.matches360 : "—",
              },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.03, y: -4 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 text-center"
              >
                {(() => { const Icon = statIcons[stat.label]; return Icon ? <Icon className="w-7 h-7 mx-auto mb-2 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} /> : null; })()}
                <div className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <TourBanner />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white mb-4">
            Explore Data
          </h2>
          <p className="text-gray-600 dark:text-gray-500 max-w-2xl mx-auto">
            Features to analyze Euro 2024 from multiple angles
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              <Link
                href={feature.href}
                className="block h-full bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors group"
              >
                {(() => {
                  const slug = feature.href.replace(/^\//, "");
                  const Icon = featureIcons[slug];
                  return Icon ? (
                    <div className="mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    </div>
                  ) : null;
                })()}
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {feature.desc}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-xl bg-emerald-600 dark:bg-emerald-700 p-10 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Explore?
          </h2>
          <p className="text-white/90 mb-8 max-w-2xl mx-auto">
            Ask Hudl Bot anything about Euro 2024. Get data-backed answers
            based on StatsBomb data.
          </p>
          <Link
            href="/bot"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-700 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
          >
            Start Chat Now
          </Link>
        </motion.div>
      </section>
    </main>
  );
}