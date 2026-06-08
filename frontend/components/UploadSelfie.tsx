"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MAX_SELFIE_SIZE } from "@hotinsert/shared";

interface UploadSelfieProps {
  onUpload: (file: File) => void;
  uploading: boolean;
}

export function UploadSelfie({ onUpload, uploading }: UploadSelfieProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndPreview = useCallback((file: File) => {
    setError(null);

    if (file.size > MAX_SELFIE_SIZE) {
      setError(`File too large. Max ${MAX_SELFIE_SIZE / (1024 * 1024)}MB.`);
      return false;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Invalid file type. Use JPEG, PNG, or WebP.");
      return false;
    }

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    return true;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && validateAndPreview(file)) {
        onUpload(file);
      }
    },
    [validateAndPreview, onUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateAndPreview(file)) {
        onUpload(file);
      }
    },
    [validateAndPreview, onUpload]
  );

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragOver
            ? "border-purple-500 bg-purple-500/10"
            : "border-white/20 hover:border-white/40"
        }`}
      >
        {preview ? (
          <div className="relative h-48 w-48 overflow-hidden rounded-lg">
            <Image
              src={preview}
              alt="Selfie preview"
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <>
            <span className="text-4xl">📸</span>
            <p className="mt-3 text-sm text-gray-400">
              Drag & drop your selfie here, or click to select
            </p>
            <p className="mt-1 text-xs text-gray-500">
              JPEG, PNG, or WebP (max 10MB)
            </p>
          </>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={uploading}
        />
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {uploading && (
        <div className="flex items-center justify-center gap-2 text-sm text-purple-400">
          <span className="animate-spin">⏳</span>
          Uploading...
        </div>
      )}
    </div>
  );
}
