import * as React from "react";
import { cn } from "@/lib/utils";
import type { GenerationStatus, SportType } from "@/lib/types";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: GenerationStatus | SportType | "queued" | "processing" | "completed" | "failed";
}

const variantStyles: Record<string, string> = {
  completed: "bg-green-500/20 text-green-400",
  processing: "bg-yellow-500/20 text-yellow-400",
  queued: "bg-gray-500/20 text-gray-400",
  failed: "bg-red-500/20 text-red-400",
  football: "bg-green-500/20 text-green-400",
  basketball: "bg-orange-500/20 text-orange-400",
  tennis: "bg-yellow-500/20 text-yellow-300",
  athletics: "bg-red-500/20 text-red-400",
  cricket: "bg-blue-500/20 text-blue-400",
  boxing: "bg-red-500/20 text-red-300",
  american_football: "bg-amber-500/20 text-amber-400",
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
