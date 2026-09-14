// frontend/app/bot/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Message {
  role: "user" | "bot";
  content: string;
  context?: any[];
}

export default function BotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content:
        "Hi! I am Hudl Bot 🤖. Ask me anything about Euro 2024. Example: 'Who is the top scorer?' atau 'Ceritakan final Euro 2024'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/bot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      const data = await res.json();

      const botMsg: Message = {
        role: "bot",
        content: data.answer || "Sorry, I could not answer that.",
        context: data.context,
      };
    } catch (err: any) {
      toast.error(`Failed to send: ${err.message}`);
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: `❌ Error: ${err.message}` },
      ]);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline inline-block mb-6">
          ← Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🤖</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Hudl Bot
            </h1>
            <p className="text-sm text-gray-500">
              AI Football Analysis • Powered by Ollama + ChromaDB
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
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
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>


          <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask anything about Euro 2024..."
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition"
            >
              Kirim
            </button>
          </div>
        </div>


        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Who is the top scorer of Euro 2024?",
            "Ceritakan final Euro 2024",
            "How many goals did Spain score?",
            "Best player of the tournament?",
          ].map((q, i) => (
            <button
              key={i}
              onClick={() => setInput(q)}
              className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}