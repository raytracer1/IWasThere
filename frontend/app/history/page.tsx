"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { fetchGenerations } from "@/lib/api";
import type { Generation } from "@/lib/types";

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (p: number) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetchGenerations(accessToken, p, PAGE_SIZE);
      if (res.success) {
        setGenerations(res.data);
        setTotal((res as Record<string, unknown>).total as number);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!accessToken) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">History</h1>
        <p className="text-gray-400 mb-4">Sign in to view your generation history.</p>
        <button
          onClick={() => signIn("google")}
          className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-20">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">📜 History</h1>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {!loading && generations.length === 0 && (
        <p className="text-gray-500 text-sm">No generations yet.</p>
      )}

      <div className="space-y-3">
        {generations.map((gen) => (
          <button
            key={gen.id}
            onClick={() => router.push(`/result/${gen.id}`)}
            className="w-full text-left rounded-xl bg-gray-900/60 border border-gray-300 dark:border-white/10 p-4 hover:border-cyan-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              {gen.eventThumbnail ? (
                <img
                  src={gen.eventThumbnail}
                  alt=""
                  className="w-16 h-10 rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-10 rounded bg-gray-800 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {gen.eventTitle || "Untitled"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {gen.status === "completed" ? "✅" : gen.status === "failed" ? "❌" : "⏳"}{" "}
                  {gen.status}
                  {" · "}
                  {gen.createdAt ? new Date(gen.createdAt * 1000).toLocaleDateString() : ""}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-xs bg-gray-800 border border-gray-300 dark:border-white/10 text-gray-400 disabled:opacity-30 hover:text-white transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-xs bg-gray-800 border border-gray-300 dark:border-white/10 text-gray-400 disabled:opacity-30 hover:text-white transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
