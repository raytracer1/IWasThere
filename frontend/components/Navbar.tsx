"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";
import { useUserStore } from "@/store/user";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const email = user?.email;
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const credits = useUserStore((s) => s.credits);
  const refreshCredits = useUserStore((s) => s.refreshCredits);

  useEffect(() => {
    if (!accessToken) return;
    refreshCredits(accessToken);
  }, [accessToken, refreshCredits]);

  if (pathname === "/login") return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-3 relative">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-1">
          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            ⚡ IfIWasThere
          </span>
        </Link>

        {/* Navigation — centered */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
          <NavLink href="/" active={pathname === "/"} label="Home" />
          <NavLink href="/history" active={pathname === "/history"} label="History" />
        </div>

        <div className="flex-1 flex justify-end items-center gap-3">
          {email ? (
            <div className="flex items-center gap-3">
              {credits !== null && (
                <span className="text-xs text-cyan-400 font-medium">🪙 {credits}</span>
              )}
              <span className="text-xs text-gray-400 hidden sm:inline">{email}</span>
              <button
                onClick={() => { pendo.clearSession(); signOut(); }}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="text-xs font-medium bg-white text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign in
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        active
          ? "text-cyan-400"
          : "text-gray-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
