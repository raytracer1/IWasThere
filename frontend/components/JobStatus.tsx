"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { fetchJob } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { POLL_INTERVAL_MS } from "@/lib/types";
import type { Job, Event } from "@/lib/types";

type JobWithDetails = Job & {
  event?: Event;
  outputVideoUrl?: string;
  inputImageUrl?: string;
};

interface JobStatusProps {
  jobId: string;
  onComplete?: (job: JobWithDetails) => void;
}

export function useJobPolling(jobId: string) {
  const [job, setJob] = useState<JobWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetchJob(jobId);
        if (!cancelled) {
          if (res.success && res.data) {
            setJob(res.data as JobWithDetails);
            setLoading(false);

            // Stop polling on terminal states
            if (res.data.status === "completed" || res.data.status === "failed") {
              clearInterval(interval);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to check job status");
          setLoading(false);
        }
      }
    }

    // Poll immediately, then on interval
    poll();
    interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId]);

  return { job, loading, error };
}

export function JobStatusDisplay({
  job,
  loading,
  error,
}: {
  job: JobWithDetails | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="animate-spin text-4xl">⏳</span>
        <p className="mt-4 text-lg font-medium text-white">Starting generation...</p>
        <p className="mt-1 text-sm text-gray-400">This usually takes 30-60 seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <span className="text-4xl">⚠️</span>
        <p className="mt-2 text-red-400">{error}</p>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Generation Status</h3>
          <Badge variant={job.status}>{job.status}</Badge>
        </div>
        <span className="text-sm text-gray-400">
          {formatRelativeTime(job.createdAt)}
        </span>
      </div>

      {/* Processing State */}
      {(job.status === "queued" || job.status === "processing") && (
        <div className="flex flex-col items-center py-8">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 animate-pulse rounded-full bg-purple-500" />
            <span className="h-3 w-3 animate-pulse rounded-full bg-purple-500 [animation-delay:0.2s]" />
            <span className="h-3 w-3 animate-pulse rounded-full bg-purple-500 [animation-delay:0.4s]" />
          </div>
          <p className="mt-4 text-gray-400">
            {job.status === "queued" ? "Waiting in queue..." : "AI is working its magic..."}
          </p>
        </div>
      )}

      {/* Completed */}
      {job.status === "completed" && job.outputVideoUrl && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <video
            src={job.outputVideoUrl}
            controls
            autoPlay
            loop
            muted
            className="w-full"
          >
            Your browser does not support the video tag.
          </video>

          <div className="flex items-center gap-3 border-t border-white/10 p-4">
            <a
              href={job.outputVideoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
            >
              ⬇ Download
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(job.outputVideoUrl!);
              }}
              className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              🔗 Copy Link
            </button>
          </div>
        </div>
      )}

      {/* Failed */}
      {job.status === "failed" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <span className="text-4xl">😞</span>
          <p className="mt-2 text-lg font-medium text-red-400">Generation failed</p>
          {job.errorMessage && (
            <p className="mt-1 text-sm text-gray-400">{job.errorMessage}</p>
          )}
          <p className="mt-3 text-sm text-gray-500">
            Please try again with a different photo or event.
          </p>
        </div>
      )}
    </div>
  );
}
