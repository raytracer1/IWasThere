"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/useAppSession";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/EventForm";

export default function NewEventPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <h1 className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">Create New Event</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <EventForm />
      </div>
    </div>
  );
}
