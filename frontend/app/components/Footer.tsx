// frontend/app/components/Footer.tsx
import Link from "next/link";
import ResetTourButton from "./ResetTourButton";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏆</span>
              <span className="font-bold text-gray-900 dark:text-white">
                Euro 2024 Context Zone
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Interactive tactical analysis with StatsBomb 360 data.
            </p>
          </div>

          {/* Navigasi */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
              Navigasi
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/players"
                  className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Players
                </Link>
              </li>
              <li>
                <Link
                  href="/match-similarity"
                  className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Similarity
                </Link>
              </li>
              <li>
                <Link
                  href="/clusters"
                  className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Clusters
                </Link>
              </li>
              <li>
                <Link
                  href="/compare"
                  className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Compare
                </Link>
              </li>
              <li>
                <Link
                  href="/player-comparison"
                  className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Compare Players
                </Link>
              </li>
              <li>
                <Link
                  href="/bot"
                  className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Hudl Bot
                </Link>
              </li>
            </ul>
          </div>

          {/* Data Source */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
              Data Source
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Event &amp; 360 data provided by:
            </p>
            <a
              href="https://github.com/statsbomb/open-data"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>📊</span>
              StatsBomb Open Data
            </a>

            <ResetTourButton />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center sm:text-left">
            © {new Date().getFullYear()} Euro 2024 Context Zone. Built with
            Next.js + FastAPI + Ollama.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center sm:text-right">
            Powered by <span className="font-medium">StatsBomb Open Data</span> •{" "}
            Licensed for public use.
          </p>
        </div>
      </div>
    </footer>
  );
}