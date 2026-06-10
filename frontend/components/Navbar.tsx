"use client";

import { useSession, signOut } from "@/lib/useAppSession";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">🔥 HotInsert AI</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <NavLink href="/" active={pathname === "/"} label="Home" />
          {session?.user && (
            <NavLink href="/history" active={pathname === "/history"} label="History" />
          )}
          {(session?.user as { role?: string } | undefined)?.role === "admin" && (
            <NavLink href="/admin" active={pathname.startsWith("/admin")} label="Admin" />
          )}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session?.user ? (
            <>
              <div className="flex items-center gap-3">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? "User"}
                    className="h-8 w-8 rounded-full border border-white/20"
                  />
                )}
                <span className="hidden text-sm text-gray-300 sm:block">
                  {session.user.name ?? "User"}
                  {(session.user as { credits?: number }).credits !== undefined && (
                    <> · {(session.user as { credits: number }).credits} 💎</>
                  )}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm text-purple-400 hover:bg-white/10 hover:text-purple-300 transition-colors"
            >
              Sign in
            </Link>
          )}
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
          ? "text-white"
          : "text-gray-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
