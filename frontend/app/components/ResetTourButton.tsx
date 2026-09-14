// frontend/app/components/ResetTourButton.tsx
"use client";

export default function ResetTourButton() {
  return (
    <button
      type="button"
      onClick={() => {
        localStorage.removeItem("euro2024_seen_onboarding");
        window.location.reload();
      }}
      className="mt-4 block text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
    >
      🔄 Lihat Tour Lagi
    </button>
  );
}