import * as React from "react";
import { cn } from "@/lib/utils";
import type { EventCategory, JobStatus } from "@hotinsert/shared";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: JobStatus | EventCategory;
}

const variantStyles: Record<string, string> = {
  completed: "bg-green-500/20 text-green-400",
  processing: "bg-yellow-500/20 text-yellow-400",
  queued: "bg-gray-500/20 text-gray-400",
  failed: "bg-red-500/20 text-red-400",
  sports: "bg-blue-500/20 text-blue-400",
  music: "bg-pink-500/20 text-pink-400",
  movies: "bg-orange-500/20 text-orange-400",
  news: "bg-cyan-500/20 text-cyan-400",
  other: "bg-purple-500/20 text-purple-400",
};

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant ? variantStyles[variant] : "bg-white/10 text-gray-300",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
