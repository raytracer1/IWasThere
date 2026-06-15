"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const pathname = usePathname();

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
        <div className="absolute left-1/2 -translate-x-1/2">
          <NavLink href="/" active={pathname === "/"} label="Home" />
        </div>

        <div className="flex-1 flex justify-end">
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
