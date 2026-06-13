"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string; count?: number }[];
  className?: string;
}

function Tabs({ value, onValueChange, items, className }: TabsProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1", className)}>
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onValueChange(item.value)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            value === item.value
              ? "bg-cyan-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className="ml-1.5 text-xs opacity-70">({item.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

export { Tabs };
