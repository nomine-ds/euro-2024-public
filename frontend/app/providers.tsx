// frontend/app/providers.tsx
"use client";

import { ThemeProvider } from "@teispace/next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}