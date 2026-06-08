"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fetchHistory } from "@/lib/api";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { JobWithEvent } from "@/lib/types";

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobWithEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    setLoading(true);
    fetchHistory(page)
      .then((res) => {
        if (res.success) {
          setJobs(res.data);
          setTotal(res.total);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="mb-8 h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-white">Your History</h1>
      <p className="mb-8 text-gray-400">
        {total} generation{total !== 1 ? "s" : ""} total
      </p>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-6xl">📼</span>
          <h3 className="mt-4 text-lg font-medium text-white">No generations yet</h3>
          <p className="mt-1 text-gray-400">
            Go create your first AI video!
          </p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Browse Events
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link key={job.id} href={`/result/${job.id}`}>
              <Card className="group flex items-center gap-4 p-4 transition-all hover:border-purple-500/50">
                {/* Thumbnail */}
                <div className="h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
                  {job.eventThumbnail ? (
                    <img
                      src={job.eventThumbnail}
                      alt={job.eventTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl">🎬</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white line-clamp-1">
                    {job.eventTitle ?? "Unknown Event"}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={job.status}>{job.status}</Badge>
                    {job.eventCategory && (
                      <Badge variant={job.eventCategory}>{job.eventCategory}</Badge>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm text-gray-400">
                    {formatRelativeTime(job.createdAt)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(job.createdAt)}
                  </p>
                </div>

                <span className="flex-shrink-0 text-gray-600 group-hover:text-purple-400 transition-colors">
                  →
                </span>
              </Card>
            </Link>
          ))}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-400">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <Button
                variant="outline"
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
