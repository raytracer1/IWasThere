"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/store/user";

export function PendoInitializer() {
  const { data: session, status } = useSession();
  const credits = useUserStore((s) => s.credits);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    pendo.initialize({ visitor: { id: '' } });
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    pendo.identify({
      visitor: {
        id: session.user.id,
        email: session.user.email ?? '',
        full_name: session.user.name ?? '',
        ...(credits !== null && { credits }),
      },
    });
  }, [session, status, credits]);

  return null;
}
