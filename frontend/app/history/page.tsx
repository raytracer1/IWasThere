"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useAppSession";
import { fetchGenerations } from "@/lib/api";
import type { Generation } from "@/lib/types";

export default function HistoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    async function load() {
      try {
        const res = await fetchGenerations();
        setGenerations(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session?.user]);

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-400">Sign in to view your history.</p>
        <a href="/login" className="mt-3 inline-block text-sm text-cyan-400 hover:underline">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-6">📜 Your History</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-900/60 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : generations.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">⚡</span>
          <p className="mt-4 text-gray-400 text-sm">No generations yet.</p>
          <button onClick={() => router.push("/")} className="mt-3 text-sm text-cyan-400 hover:underline">
            Browse events
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {generations.map((gen) => (
            <button
              key={gen.id}
              onClick={() => router.push(`/result/${gen.id}`)}
              className="w-full text-left rounded-xl border border-white/10 bg-gray-900/60 p-4 hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                {gen.outputImageUrl ? (
                  <img
                    src={gen.outputImageUrl}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                    ⚡
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {gen.eventTitle || "Historic Moment"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {gen.eventYear && `${gen.eventYear} · `}
                    <span className={`inline-flex items-center gap-1 ${
                      gen.status === "completed" ? "text-green-400" :
                      gen.status === "failed" ? "text-red-400" :
                      "text-yellow-400"
                    }`}>
                      {gen.status === "completed" ? "✅" : gen.status === "failed" ? "❌" : "⏳"}
                      {gen.status}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(gen.createdAt)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(ts: number): string {
  const diff = (Date.now() / 1000) - ts;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
