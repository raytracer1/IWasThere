"use client";

import { useSession as nextAuthUseSession } from "next-auth/react";
export { signIn, signOut } from "next-auth/react";

/**
 * Wraps NextAuth's useSession. In dev mode (NEXT_PUBLIC_DEV_TOKEN is set),
 * returns a fake authenticated session so all auth checks pass naturally.
 */
export function useSession() {
  const session = nextAuthUseSession();
  const isDev = typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_DEV_TOKEN;

  if (isDev) {
    return {
      ...session,
      data: {
        user: {
          id: "dev-user",
          email: "dev@localhost",
          name: "Dev Admin",
          image: undefined,
          role: "admin" as const,
        },
        accessToken: process.env.NEXT_PUBLIC_DEV_TOKEN,
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      status: "authenticated" as const,
    };
  }

  return session;
}
