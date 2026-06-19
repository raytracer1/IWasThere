"use client";

import { useState } from "react";

interface CaptionPickerProps {
  captions: string[];
  onSelect: (caption: string) => void;
  selected?: string;
}

export function CaptionPicker({ captions, onSelect, selected }: CaptionPickerProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (caption: string) => {
    await navigator.clipboard.writeText(caption);
    setCopied(caption);
    setTimeout(() => setCopied(null), 2000);
    if (typeof pendo !== 'undefined') {
      pendo.track("caption_copied", {
        captionLength: caption.length,
        captionIndex: captions.indexOf(caption),
      });
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">📝 Pick your caption</h3>
      {captions.map((caption, i) => (
        <div
          key={i}
          onClick={() => onSelect(caption)}
          className={`group rounded-xl border p-3 cursor-pointer transition-all ${
            selected === caption
              ? "border-cyan-500/50 bg-cyan-500/10"
              : "border-white/10 bg-gray-900/60 hover:border-white/20"
          }`}
        >
          <p className="text-sm text-gray-200 leading-relaxed">{caption}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">Tap to select</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(caption);
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {copied === caption ? "✅ Copied" : "📋 Copy"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
