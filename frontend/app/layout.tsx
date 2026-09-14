// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import Onboarding from "./components/Onboarding";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Euro 2024 Context Zone",
  description: "Interactive tactical analysis with StatsBomb 360 data",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏆</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gray-50 dark:bg-gray-900 transition-colors`}
      >
        <Providers>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#1f2937",
                color: "#fff",
                borderRadius: "12px",
                fontSize: "14px",
              },
              success: {
                iconTheme: { primary: "#10b981", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#fff" },
              },
            }}
          />
          <KeyboardShortcuts />
          <Navbar />
          <div className="min-h-screen">{children}</div>
          <Footer />
          <Onboarding/>
        </Providers>
      </body>
    </html>
  );
}