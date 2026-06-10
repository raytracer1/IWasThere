"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useAppSession";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { JobStatusDisplay } from "@/components/JobStatus";
import { useJobPolling } from "@/components/JobStatus";

export default function ResultPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const { job, loading, error } = useJobPolling(jobId);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        onClick={() => router.push("/")}
        className="mb-6 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        ← Back to Events
      </button>

      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Your Generated Video</h1>
      <p className="mb-8 text-gray-500 dark:text-gray-400">
        {job?.event?.title
          ? `You in: ${job.event.title}`
          : "Your AI-generated moment"}
      </p>

      {job?.status === "completed" && job.outputVideoUrl ? (
        <div className="rounded-lg overflow-hidden bg-black">
          <video src={job.outputVideoUrl} controls className="w-full" />
        </div>
      ) : (
        <JobStatusDisplay job={job} loading={loading} error={error} />
      )}

      {job?.status === "completed" && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button onClick={() => router.push("/history")} variant="outline">
            View History
          </Button>
          <Button onClick={() => router.push("/")}>
            Create Another
          </Button>
        </div>
      )}
    </div>
  );
}
