"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Event } from "@/lib/types";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";

const CATEGORIES = [
  'football', 'basketball', 'tennis', 'athletics',
  'cricket', 'boxing', 'american_football', 'other',
] as const;

const EVENT_TYPES = ['sports', 'music', 'movies', 'news', 'other'] as const;

async function adminFetch<T>(path: string, session: ReturnType<typeof useSession>["data"], options: RequestInit = {}): Promise<T> {
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const resp = await fetch(`${WORKER_URL}${path}`, { ...options, headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `HTTP ${resp.status}`);
  }
  return resp.json();
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    id: "",
    title: "",
    category: "football" as string,
    event_type: "sports" as string,
    // Nested objects as JSON strings for easy textarea editing
    sceneStr: JSON.stringify({ location: "", time_period: "", atmosphere: "", description: "" }, null, 2),
    emotionStr: JSON.stringify({ primary: "", intensity: "", description: "" }, null, 2),
    cameraStr: JSON.stringify({ angle: "", distance: "", lighting: "", style: "" }, null, 2),
    userStr: JSON.stringify({ clothing: "", action: "", position: "", role: "spectator" }, null, 2),
    entitiesStr: JSON.stringify({ people: [], objects: [], brands: [] }, null, 2),
    momentStr: JSON.stringify({ key_action: "", timing: "", significance: "", description: "" }, null, 2),
    generationStr: JSON.stringify({ prompt_template: "", negative_prompt: "", background_image: "", insert_zone: "" }, null, 2),
    thumbnailUrl: "",
    status: "active" as "active" | "draft",
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{ success: boolean; data: Event[] }>("/admin/events", session);
      setEvents(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === "authenticated") loadEvents();
  }, [status, loadEvents]);

  // --- Not logged in ---
  if (status === "loading") {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center"><p className="text-gray-400">Loading...</p></div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-3">⚡ IfIWasThere Admin</h1>
        <p className="text-sm text-gray-400 mb-6">Sign in with an admin Google account.</p>
        <button
          onClick={() => signIn("google")}
          className="inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3 text-gray-900 font-semibold hover:bg-gray-100 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  // --- Logged in ---
  const resetForm = () => {
    setEditing(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setForm({
      id: "", title: "", category: "football", event_type: "sports",
      sceneStr: JSON.stringify({ location: "", time_period: "", atmosphere: "", description: "" }, null, 2),
      emotionStr: JSON.stringify({ primary: "", intensity: "", description: "" }, null, 2),
      cameraStr: JSON.stringify({ angle: "", distance: "", lighting: "", style: "" }, null, 2),
      userStr: JSON.stringify({ clothing: "", action: "", position: "", role: "spectator" }, null, 2),
      entitiesStr: JSON.stringify({ people: [], objects: [], brands: [] }, null, 2),
      momentStr: JSON.stringify({ key_action: "", timing: "", significance: "", description: "" }, null, 2),
      generationStr: JSON.stringify({ prompt_template: "", negative_prompt: "", background_image: "", insert_zone: "" }, null, 2),
      thumbnailUrl: "", status: "active",
    });
  };

  const startEdit = (ev: Event) => {
    setEditing(ev);
    setForm({
      id: ev.id,
      title: ev.title,
      category: ev.category,
      event_type: ev.event_type || "",
      sceneStr: JSON.stringify(ev.scene || {}, null, 2),
      emotionStr: JSON.stringify(ev.emotion || {}, null, 2),
      cameraStr: JSON.stringify(ev.camera || {}, null, 2),
      userStr: JSON.stringify(ev.user || {}, null, 2),
      entitiesStr: JSON.stringify(ev.entities || {}, null, 2),
      momentStr: JSON.stringify(ev.moment || {}, null, 2),
      generationStr: JSON.stringify(ev.generation || {}, null, 2),
      thumbnailUrl: ev.thumbnailUrl || "",
      status: ev.status as "active" | "draft",
    });
  };

  const parseJsonField = (str: string, fieldName: string): Record<string, unknown> => {
    try {
      return JSON.parse(str);
    } catch {
      throw new Error(`Invalid JSON in ${fieldName}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      // Build the request body with parsed JSON objects
      const body = {
        id: form.id || undefined,
        title: form.title,
        category: form.category,
        event_type: form.event_type || undefined,
        scene: parseJsonField(form.sceneStr, "scene"),
        emotion: parseJsonField(form.emotionStr, "emotion"),
        camera: parseJsonField(form.cameraStr, "camera"),
        user: parseJsonField(form.userStr, "user"),
        entities: parseJsonField(form.entitiesStr, "entities"),
        moment: parseJsonField(form.momentStr, "moment"),
        generation: parseJsonField(form.generationStr, "generation"),
        thumbnailUrl: form.thumbnailUrl || undefined,
        status: form.status,
      };

      if (thumbnailFile) {
        const fd = new FormData();
        fd.append("thumbnail", thumbnailFile);
        fd.append("metadata", JSON.stringify(body));
        if (editing) {
          await adminFetch(`/admin/events/${editing.id}`, session, {
            method: "PUT", body: fd,
          });
          setMsg("✅ Event updated with new thumbnail");
        } else {
          await adminFetch("/admin/events", session, {
            method: "POST", body: fd,
          });
          setMsg("✅ Event created with thumbnail");
        }
      } else {
        if (editing) {
          await adminFetch(`/admin/events/${editing.id}`, session, {
            method: "PUT", body: JSON.stringify(body),
          });
          setMsg("✅ Event updated");
        } else {
          await adminFetch("/admin/events", session, {
            method: "POST", body: JSON.stringify(body),
          });
          setMsg("✅ Event created");
        }
      }
      resetForm();
      setThumbnailFile(null);
      loadEvents();
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await adminFetch(`/admin/events/${id}`, session, { method: "DELETE" });
      loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">⚙️ Event Admin</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{session?.user?.email}</span>
          <button onClick={() => signOut()} className="text-xs text-red-400 hover:underline">Sign out</button>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-white/10 bg-gray-900/60 p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">{editing ? "Edit Event" : "New Event"}</h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Basic fields */}
          <input placeholder="ID (slug)" value={form.id} onChange={e => setForm({...form, id: e.target.value})} className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" disabled={!!editing} />
          <input placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" />
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white">
            {CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={form.event_type} onChange={e => setForm({...form, event_type: e.target.value})} className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white">
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value as "active"|"draft"})} className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white">
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>

          {/* Thumbnail */}
          <div className="col-span-2 flex flex-col gap-2">
            <input placeholder="Thumbnail URL (or upload below)" value={form.thumbnailUrl} onChange={e => setForm({...form, thumbnailUrl: e.target.value})} className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" />
            <label className="flex items-center gap-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-gray-400 cursor-pointer hover:text-white hover:border-cyan-500/30 transition-colors">
              📁 Upload thumbnail
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  setThumbnailFile(f);
                  setThumbnailPreview(URL.createObjectURL(f));
                }
              }} />
            </label>
            {thumbnailPreview && (
              <div className="rounded-lg overflow-hidden border border-white/10">
                <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full max-h-48 object-cover" />
              </div>
            )}
          </div>

          {/* JSON Editor Fields */}
          <div className="col-span-2 mt-2">
            <p className="text-xs text-gray-500 mb-2">JSON Fields — edit as JSON objects</p>
          </div>

          {/* Scene */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-gray-400 mb-1 block">scene</label>
            <textarea value={form.sceneStr} onChange={e => setForm({...form, sceneStr: e.target.value})}
              rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
          </div>

          {/* Emotion */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-gray-400 mb-1 block">emotion</label>
            <textarea value={form.emotionStr} onChange={e => setForm({...form, emotionStr: e.target.value})}
              rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
          </div>

          {/* Camera */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-gray-400 mb-1 block">camera</label>
            <textarea value={form.cameraStr} onChange={e => setForm({...form, cameraStr: e.target.value})}
              rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
          </div>

          {/* User */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-gray-400 mb-1 block">user</label>
            <textarea value={form.userStr} onChange={e => setForm({...form, userStr: e.target.value})}
              rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
          </div>

          {/* Entities */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-gray-400 mb-1 block">entities</label>
            <textarea value={form.entitiesStr} onChange={e => setForm({...form, entitiesStr: e.target.value})}
              rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
          </div>

          {/* Moment */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-gray-400 mb-1 block">moment</label>
            <textarea value={form.momentStr} onChange={e => setForm({...form, momentStr: e.target.value})}
              rows={5} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
          </div>

          {/* Generation */}
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">generation</label>
            <textarea value={form.generationStr} onChange={e => setForm({...form, generationStr: e.target.value})}
              rows={6} className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-xs text-white font-mono" />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving || !form.title || !form.generationStr}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50">
            {saving ? "Saving..." : editing ? "Update" : "Create"}
          </button>
          {editing && <button onClick={resetForm} className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-300">Cancel</button>}
        </div>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
      </div>

      {/* Event List */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <div key={ev.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-gray-900/60 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                <p className="text-xs text-gray-400">
                  {ev.category} · {ev.event_type || ""} · {ev.scene?.time_period || ""} · <span className={ev.status === "active" ? "text-green-400" : "text-yellow-400"}>{ev.status}</span>
                </p>
              </div>
              <button onClick={() => startEdit(ev)} className="text-xs text-cyan-400 hover:underline">Edit</button>
              <button onClick={() => handleDelete(ev.id)} className="text-xs text-red-400 hover:underline">Del</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
