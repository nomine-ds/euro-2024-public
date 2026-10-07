// frontend/app/page.tsx
"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { featureIcons } from "@/lib/icons";
import { API_BASE } from "@/lib/api";

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
      icon: "🤖",
      title: "Hudl Bot",
      desc: "Ask anything about Euro 2024 with AI",
    },
    {
      href: "/match-similarity",
      icon: "🔍",
      title: "Match Similarity",
      desc: "Find matches with similar patterns",
    },
    {
      href: "/clusters",
      icon: "🧩",
      title: "Player Clusters",
      desc: "Group players by playing style",
    },
    {
      href: "/players",
      icon: "👤",
      title: "Player Stats",
      desc: "Complete stats for all players",
    },
    {
      href: "/player-comparison",
      icon: "🆚",
      title: "Player Comparison",
      desc: "Compare 2-4 players with radar chart",
    },
    {
      href: "/compare",
      icon: "⚽",
      title: "Compare Teams",
      desc: "Compare two teams head-to-head",
    },
    {
      href: "/lab",
      icon: "🧪",
      title: "Data Lab",
      desc: "Run Python analysis in the browser",
    },
    {
      href: "/counterfactual",
      icon: "🔮",
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
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200 dark:bg-blue-900/30 rounded-full blur-3xl opacity-40" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200 dark:bg-purple-900/30 rounded-full blur-3xl opacity-40" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <motion.div variants={itemVariants} className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Data 360 is ready
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
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
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                🤖 Coba Hudl Bot
              </Link>
              <Link
                href="/players"
                className="px-8 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 border border-gray-200 dark:border-gray-700"
              >
                👤 View Players
              </Link>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto"
          >
            {[
              { label: "Matches", value: stats.matches, icon: "🏟️" },
              {
                label: "Events",
                value: stats.events > 0 ? stats.events.toLocaleString() : "—",
                icon: "📊",
              },
              { label: "Teams", value: stats.teams, icon: "🇪🇺" },
              {
                label: "Match 360",
                value: stats.matches360 > 0 ? stats.matches360 : "—",
                icon: "🔄",
              },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.03, y: -4 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700 text-center"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Explore Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
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
                className="block h-full bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group"
              >
                {(() => {
                  const slug = feature.href.replace(/^\//, "");
                  const Icon = featureIcons[slug];
                  return Icon ? (
                    <div className="mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
                    </div>
                  ) : null;
                })()}
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {feature.desc}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 p-12 text-center"
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
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-600 rounded-xl font-medium hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
          >
            🤖 Start Chat Now
          </Link>
        </motion.div>
      </section>
    </main>
  );
}