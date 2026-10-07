// frontend/app/player/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 h-10 w-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800"
          />
        ))}
      </div>
      <div className="h-64 w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
    </div>
  );
}