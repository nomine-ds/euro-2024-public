// frontend/app/players/loading.tsx
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 h-8 w-56 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mb-4 h-10 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-24 w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800"
          />
        ))}
      </div>
    </div>
  );
}