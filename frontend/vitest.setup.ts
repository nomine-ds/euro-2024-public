import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

process.env.NEXT_PUBLIC_API_BASE = "http://test.local";

const originalConsoleError = console.error;
console.error = (...args: Parameters<typeof console.error>) => {
  originalConsoleError(...args);
  throw new Error(`console.error called during test: ${args[0]}`);
};