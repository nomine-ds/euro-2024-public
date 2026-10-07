// frontend/app/match/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 h-6 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mb-8 h-24 w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800"
          />
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800"
          />
        ))}
      </div>
    </div>
  );
}