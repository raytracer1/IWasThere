"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/EventForm";

export default function NewEventPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-white">Create New Event</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <EventForm />
      </div>
    </div>
  );
}
