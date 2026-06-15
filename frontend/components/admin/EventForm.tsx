"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Event } from "@/lib/types";

const CATEGORIES = [
  "football", "basketball", "tennis", "athletics",
  "cricket", "boxing", "american_football", "other",
] as const;

const EVENT_TYPES = ["sports", "music", "movies", "news", "other"] as const;

const DEFAULT_SCENE = { location: "", time_period: "", atmosphere: "", description: "" };
const DEFAULT_EMOTION = { primary: "", intensity: "", description: "" };
const DEFAULT_CAMERA = { angle: "", distance: "", lighting: "", style: "" };
const DEFAULT_USER = { clothing: "", action: "", position: "", role: "spectator" };
const DEFAULT_ENTITIES = { people: [], objects: [], brands: [] };
const DEFAULT_MOMENT = { key_action: "", timing: "", significance: "", description: "" };
const DEFAULT_GENERATION = { prompt_template: "", negative_prompt: "", background_image: "", insert_zone: "" };

function stringify(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, null, 2);
}

function parseJson(str: string, fieldName: string): Record<string, unknown> {
  try {
    return JSON.parse(str);
  } catch {
    throw new Error(`Invalid JSON in ${fieldName}`);
  }
}

export interface EventFormSaveData {
  body: Record<string, unknown>;
  thumbnailFile: File | null;
  backgroundFile: File | null;
  videoFile: File | null;
}

interface EventFormProps {
  event?: Event | null;
  onSave: (data: EventFormSaveData) => Promise<void>;
  onCancel?: () => void;
}

export default function EventForm({ event, onSave, onCancel }: EventFormProps) {
  const isEdit = !!event;
  const initializedRef = useRef<string | null>(null);
  const thumbPreviewRef = useRef<string | null>(null);
  const bgPreviewRef = useRef<string | null>(null);
  const videoPreviewRef = useRef<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "football" as string,
    event_type: "sports" as string,
    sceneStr: stringify(DEFAULT_SCENE),
    emotionStr: stringify(DEFAULT_EMOTION),
    cameraStr: stringify(DEFAULT_CAMERA),
    userStr: stringify(DEFAULT_USER),
    entitiesStr: stringify(DEFAULT_ENTITIES),
    momentStr: stringify(DEFAULT_MOMENT),
    generationStr: stringify(DEFAULT_GENERATION),
    thumbnailUrl: "",
    videoKey: "",
    status: "active" as "active" | "draft",
  });

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const initForm = useCallback((ev: Event | null | undefined) => {
    if (ev) {
      setForm({
        title: ev.title,
        category: ev.category,
        event_type: ev.event_type || "sports",
        sceneStr: stringify(ev.scene || (DEFAULT_SCENE as Record<string, unknown>)),
        emotionStr: stringify(ev.emotion || (DEFAULT_EMOTION as Record<string, unknown>)),
        cameraStr: stringify(ev.camera || (DEFAULT_CAMERA as Record<string, unknown>)),
        userStr: stringify(ev.user || (DEFAULT_USER as Record<string, unknown>)),
        entitiesStr: stringify(ev.entities || (DEFAULT_ENTITIES as Record<string, unknown>)),
        momentStr: stringify(ev.moment || (DEFAULT_MOMENT as Record<string, unknown>)),
        generationStr: stringify((ev.generation as unknown as Record<string, unknown>) || DEFAULT_GENERATION),
        thumbnailUrl: ev.thumbnailUrl || "",
        videoKey: ev.referenceVideo || "",
        status: ev.status as "active" | "draft",
      });
    } else {
      setForm({
        title: "",
        category: "football",
        event_type: "sports",
        sceneStr: stringify(DEFAULT_SCENE),
        emotionStr: stringify(DEFAULT_EMOTION),
        cameraStr: stringify(DEFAULT_CAMERA),
        userStr: stringify(DEFAULT_USER),
        entitiesStr: stringify(DEFAULT_ENTITIES),
        momentStr: stringify(DEFAULT_MOMENT),
        generationStr: stringify(DEFAULT_GENERATION),
        thumbnailUrl: "",
        videoKey: "",
        status: "active",
      });
    }
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setBackgroundFile(null);
    setBackgroundPreview(null);
    setVideoFile(null);
    setVideoPreview(null);
    setMsg(null);
    initializedRef.current = ev?.id ?? "__new__";
  }, []);

  useEffect(() => {
    if (initializedRef.current === (event?.id ?? "__new__")) return;
    initForm(event);
  }, [event, initForm]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (thumbPreviewRef.current) URL.revokeObjectURL(thumbPreviewRef.current);
      if (bgPreviewRef.current) URL.revokeObjectURL(bgPreviewRef.current);
      if (videoPreviewRef.current) URL.revokeObjectURL(videoPreviewRef.current);
    };
  }, []);

  const handleFileSelect = (file: File | undefined, name: string) => {
    if (!file) return;
    const url = URL.createObjectURL(file);

    if (name === "thumbnail") {
      if (thumbPreviewRef.current) URL.revokeObjectURL(thumbPreviewRef.current);
      thumbPreviewRef.current = url;
      setThumbnailFile(file);
      setThumbnailPreview(url);
    } else if (name === "background") {
      if (bgPreviewRef.current) URL.revokeObjectURL(bgPreviewRef.current);
      bgPreviewRef.current = url;
      setBackgroundFile(file);
      setBackgroundPreview(url);
    } else if (name === "reference") {
      if (videoPreviewRef.current) URL.revokeObjectURL(videoPreviewRef.current);
      videoPreviewRef.current = url;
      setVideoFile(file);
      setVideoPreview(url);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        category: form.category,
        event_type: form.event_type || undefined,
        scene: parseJson(form.sceneStr, "scene"),
        emotion: parseJson(form.emotionStr, "emotion"),
        camera: parseJson(form.cameraStr, "camera"),
        user: parseJson(form.userStr, "user"),
        entities: parseJson(form.entitiesStr, "entities"),
        moment: parseJson(form.momentStr, "moment"),
        generation: parseJson(form.generationStr, "generation"),
        thumbnailUrl: form.thumbnailUrl || undefined,
        referenceVideo: form.videoKey || undefined,
        status: form.status,
      };
      await onSave({ body, thumbnailFile, backgroundFile, videoFile });
      setMsg(isEdit ? "✅ Event updated" : "✅ Event created");
      if (!isEdit) initForm(null);
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/60 p-5">
      <h2 className="text-sm font-semibold text-white mb-4">
        {isEdit ? "Edit Event" : "New Event"}
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Basic fields */}
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white"
        />
        <select
          value={form.category}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white"
        >
          {CATEGORIES.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <select
          value={form.event_type}
          onChange={(e) => setForm((prev) => ({ ...prev, event_type: e.target.value }))}
          className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white"
        >
          {EVENT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
        <select
          value={form.status}
          onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as "active" | "draft" }))}
          className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white"
        >
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>

        {/* Thumbnail */}
        <div className="col-span-2 flex flex-col gap-2">
          <label className="flex items-center gap-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-gray-400 cursor-pointer hover:text-white hover:border-cyan-500/30 transition-colors">
            📁 Upload thumbnail
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0], "thumbnail")} />
          </label>
          {thumbnailPreview ? (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full max-h-64 object-contain" />
            </div>
          ) : form.thumbnailUrl ? (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img src={form.thumbnailUrl} alt="Current thumbnail" className="w-full max-h-64 object-contain" />
            </div>
          ) : null}
        </div>

        {/* Background Image */}
        <div className="col-span-2 flex flex-col gap-2">
          <label className="flex items-center gap-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-gray-400 cursor-pointer hover:text-white hover:border-cyan-500/30 transition-colors">
            🖼️ Upload background image
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0], "background")} />
          </label>
          {backgroundPreview ? (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img src={backgroundPreview} alt="Background preview" className="w-full max-h-64 object-contain" />
            </div>
          ) : (event?.generation as unknown as Record<string, unknown>)?.background_image ? (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img src={(event?.generation as unknown as Record<string, unknown>).background_image as string}
                alt="Current background" className="w-full max-h-64 object-contain" />
            </div>
          ) : null}
        </div>

        {/* Reference Video */}
        <div className="col-span-2 flex flex-col gap-2">
          <label className="flex items-center gap-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-gray-400 cursor-pointer hover:text-white hover:border-cyan-500/30 transition-colors">
            🎬 Upload reference video
            <input type="file" accept="video/*" className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0], "reference")} />
          </label>
          {videoPreview ? (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <video src={videoPreview} controls className="w-full max-h-64" />
            </div>
          ) : event?.referenceVideo ? (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <video src={event.referenceVideo} controls className="w-full max-h-64" />
            </div>
          ) : null}
        </div>

        {/* JSON Editor Fields */}
        <div className="col-span-2 mt-2">
          <p className="text-xs text-gray-500 mb-2">JSON Fields — edit as JSON objects</p>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">scene</label>
          <textarea value={form.sceneStr} onChange={(e) => setForm((prev) => ({ ...prev, sceneStr: e.target.value }))}
            rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">emotion</label>
          <textarea value={form.emotionStr} onChange={(e) => setForm((prev) => ({ ...prev, emotionStr: e.target.value }))}
            rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">camera</label>
          <textarea value={form.cameraStr} onChange={(e) => setForm((prev) => ({ ...prev, cameraStr: e.target.value }))}
            rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">user</label>
          <textarea value={form.userStr} onChange={(e) => setForm((prev) => ({ ...prev, userStr: e.target.value }))}
            rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">entities</label>
          <textarea value={form.entitiesStr} onChange={(e) => setForm((prev) => ({ ...prev, entitiesStr: e.target.value }))}
            rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">moment</label>
          <textarea value={form.momentStr} onChange={(e) => setForm((prev) => ({ ...prev, momentStr: e.target.value }))}
            rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-400 mb-1 block">generation</label>
          <textarea value={form.generationStr} onChange={(e) => setForm((prev) => ({ ...prev, generationStr: e.target.value }))}
            rows={6} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={saving || !form.title || !form.generationStr}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-300">Cancel</button>
        )}
      </div>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}
