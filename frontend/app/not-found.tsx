// frontend/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-6">
          Sorry, the page you are looking for is unavailable or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}