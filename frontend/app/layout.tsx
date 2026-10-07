// frontend/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import Onboarding from "./components/Onboarding";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://euro-2024-public.vercel.app";

const SITE_NAME = "Euro 2024 Context Zone";

const SITE_DESCRIPTION =
  "Platform analitik taktis Euro 2024 dengan data StatsBomb 360. Pass network, cognitive mirror, counterfactual engine, dan analitik lanjutan untuk 51 pertandingan.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },

  description: SITE_DESCRIPTION,

  applicationName: SITE_NAME,

  keywords: [
    "Euro 2024",
    "StatsBomb",
    "football analytics",
    "tactical analysis",
    "pass network",
    "xG",
    "expected goals",
    "counterfactual",
    "cognitive mirror",
    "soccer analytics",
    "sepak bola",
    "analitik taktis",
  ],

  authors: [{ name: "nomine-ds", url: "https://github.com/nomine-ds" }],

  creator: "nomine-ds",
  publisher: "nomine-ds",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "id_ID",
    alternateLocale: ["en_US"],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Euro 2024 Context Zone — Interactive Tactical Analysis",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@nomine_ds",
  },

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      {
        url: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚽</text></svg>",
        type: "image/svg+xml",
      },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },

  alternates: {
    canonical: SITE_URL,
  },

  category: "sports",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
          <Onboarding />
        </Providers>
      </body>
    </html>
  );
}