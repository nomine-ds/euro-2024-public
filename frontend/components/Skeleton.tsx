// frontend/components/Skeleton.tsx
"use client";

import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Skeleton height={24} width="30%" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4"
        >
          <Skeleton circle width={32} height={32} />
          <div className="flex-1">
            <Skeleton height={16} width="60%" />
            <div className="mt-1">
              <Skeleton height={12} width="40%" />
            </div>
          </div>
          <Skeleton height={16} width={40} />
          <Skeleton height={16} width={40} />
          <Skeleton height={16} width={40} />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
        >
          <Skeleton height={20} width="50%" />
          <div className="mt-3">
            <Skeleton height={14} count={3} />
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton height={32} width={80} />
            <Skeleton height={32} width={80} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <Skeleton height={24} width="40%" />
      <div className="mt-4">
        <Skeleton height={height} />
      </div>
    </div>
  );
}

export function MatchDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
        <Skeleton height={40} width="60%" />
        <div className="mt-4">
          <Skeleton height={24} width="40%" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <Skeleton height={16} width="60%" />
            <div className="mt-2">
              <Skeleton height={24} width="40%" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <Skeleton height={20} width="30%" />
        <div className="mt-4 space-y-2">
          <Skeleton height={14} count={10} />
        </div>
      </div>
    </div>
  );
}