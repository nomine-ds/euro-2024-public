// frontend/app/matches/loading.tsx
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-16 w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800"
          />
        ))}
      </div>
    </div>
  );
}