// frontend/app/bot/page.tsx
"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { API_BASE } from "@/lib/api";

interface Message {
  role: "user" | "bot";
  content: string;
  context?: Array<{ text: string }>;
}

export default function BotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content:
        "Hi! I am Hudl Bot. Ask me about Euro 2024, for example, who scored the most goals or what happened in the final.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!input.trim() || loading) return;

    const query = input.trim();
    const userMsg: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/bot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      const result: { answer: string; context?: Message["context"] } = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: result.answer, context: result.context },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(`Failed to send: ${message}`);
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: `Failed to get a response: ${message}` },
      ]);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-blue-600 hover:underline inline-block mb-6">
          ← Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Hudl Bot
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Euro 2024 match data assistant
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

          <div aria-live="polite" aria-relevant="additions" className="h-[min(60vh,500px)] min-h-64 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>


                  {msg.context && msg.context.length > 0 && (
                    <details className="mt-2 text-xs opacity-70">
                      <summary className="cursor-pointer hover:underline">
                        📚 {msg.context.length} konteks data
                      </summary>
                      <ul className="mt-2 space-y-1 pl-3">
                        {msg.context.slice(0, 3).map((c, i) => (
                          <li key={i} className="truncate">
                            • {c.text}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start" role="status">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
                  <span className="text-sm text-gray-800 dark:text-gray-100">Searching match data…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>


          <form
            className="flex flex-col gap-2 border-t border-gray-200 p-4 dark:border-gray-700 sm:flex-row"
            onSubmit={sendMessage}
          >
            <input
              aria-label="Your question"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about Euro 2024..."
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-500 bg-gray-50 px-4 py-2 text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-gray-500 dark:bg-gray-900 dark:text-white dark:focus-visible:outline-blue-300"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="min-h-11 rounded-xl bg-blue-700 px-6 py-2 font-medium text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-gray-500"
            >
              Send question
            </button>
          </form>
        </div>


        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Who is the top scorer of Euro 2024?",
            "Tell me about the Euro 2024 final",
            "How many goals did Spain score?",
            "Best player of the tournament?",
          ].map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInput(q)}
              className="min-h-11 rounded-full border border-gray-300 bg-white px-3 py-2 text-left text-xs text-gray-800 transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus-visible:outline-blue-300"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}