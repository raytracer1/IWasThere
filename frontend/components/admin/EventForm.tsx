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
}

interface EventFormProps {
  event?: Event | null;
  onSave: (data: EventFormSaveData) => Promise<void>;
  onCancel?: () => void;
}

export default function EventForm({ event, onSave, onCancel }: EventFormProps) {
  const isEdit = !!event;
  const initializedRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

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
    status: "active" as "active" | "draft",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Initialize form when event prop changes
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
        status: "active",
      });
    }
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setBackgroundFile(null);
    setBackgroundPreview(null);
    setMsg(null);
    initializedRef.current = ev?.id ?? "__new__";
  }, []);

  useEffect(() => {
    if (initializedRef.current === (event?.id ?? "__new__")) return;
    initForm(event);
  }, [event, initForm]);

  const bgPreviewRef = useRef<string | null>(null);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (bgPreviewRef.current) URL.revokeObjectURL(bgPreviewRef.current);
    };
  }, []);

  const handleThumbnailChange = (file: File | undefined) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (file) {
      setThumbnailFile(file);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setThumbnailPreview(url);
    }
  };

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
        status: form.status,
      };
      await onSave({ body, thumbnailFile, backgroundFile });
      setMsg(isEdit ? "✅ Event updated" : "✅ Event created");
      if (!isEdit) {
        initForm(null);
      }
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
          onChange={(e) => setField("title", e.target.value)}
          className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white"
        />
        <select
          value={form.category}
          onChange={(e) => setField("category", e.target.value)}
          className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white"
        >
          {CATEGORIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={form.event_type}
          onChange={(e) => setField("event_type", e.target.value)}
          className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={form.status}
          onChange={(e) => setField("status", e.target.value)}
          className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white"
        >
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>

        {/* Thumbnail */}
        <div className="col-span-2 flex flex-col gap-2">
          <label className="flex items-center gap-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-gray-400 cursor-pointer hover:text-white hover:border-cyan-500/30 transition-colors">
            📁 Upload thumbnail
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleThumbnailChange(e.target.files?.[0])}
            />
          </label>
          {thumbnailPreview ? (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="w-full max-h-48 object-cover"
              />
            </div>
          ) : form.thumbnailUrl ? (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img
                src={form.thumbnailUrl}
                alt="Current thumbnail"
                className="w-full max-h-48 object-cover"
              />
            </div>
          ) : null}
        </div>

        {/* Background Image */}
        <div className="col-span-2 flex flex-col gap-2">
          <label className="flex items-center gap-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-gray-400 cursor-pointer hover:text-white hover:border-cyan-500/30 transition-colors">
            🖼️ Upload background image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (bgPreviewRef.current) {
                  URL.revokeObjectURL(bgPreviewRef.current);
                  bgPreviewRef.current = null;
                }
                if (file) {
                  setBackgroundFile(file);
                  const url = URL.createObjectURL(file);
                  bgPreviewRef.current = url;
                  setBackgroundPreview(url);
                }
              }}
            />
          </label>
          {backgroundPreview ? (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img
                src={backgroundPreview}
                alt="Background preview"
                className="w-full max-h-48 object-cover"
              />
            </div>
          ) : (event?.generation as unknown as Record<string, unknown>)?.background_image ? (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img
                src={(event?.generation as unknown as Record<string, unknown>).background_image as string}
                alt="Current background"
                className="w-full max-h-48 object-cover"
              />
            </div>
          ) : null}
        </div>

        {/* JSON Editor Fields */}
        <div className="col-span-2 mt-2">
          <p className="text-xs text-gray-500 mb-2">JSON Fields — edit as JSON objects</p>
        </div>

        {/* Scene + Emotion */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">scene</label>
          <textarea
            value={form.sceneStr}
            onChange={(e) => setField("sceneStr", e.target.value)}
            rows={5}
            className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">emotion</label>
          <textarea
            value={form.emotionStr}
            onChange={(e) => setField("emotionStr", e.target.value)}
            rows={5}
            className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono"
          />
        </div>

        {/* Camera + User */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">camera</label>
          <textarea
            value={form.cameraStr}
            onChange={(e) => setField("cameraStr", e.target.value)}
            rows={5}
            className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">user</label>
          <textarea
            value={form.userStr}
            onChange={(e) => setField("userStr", e.target.value)}
            rows={5}
            className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono"
          />
        </div>

        {/* Entities + Moment */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">entities</label>
          <textarea
            value={form.entitiesStr}
            onChange={(e) => setField("entitiesStr", e.target.value)}
            rows={5}
            className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">moment</label>
          <textarea
            value={form.momentStr}
            onChange={(e) => setField("momentStr", e.target.value)}
            rows={5}
            className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono"
          />
        </div>

        {/* Generation */}
        <div className="col-span-2">
          <label className="text-xs text-gray-400 mb-1 block">generation</label>
          <textarea
            value={form.generationStr}
            onChange={(e) => setField("generationStr", e.target.value)}
            rows={6}
            className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={saving || !form.title || !form.generationStr}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-300">
            Cancel
          </button>
        )}
      </div>

      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}
