"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Event, SportType } from "@/lib/types";
import { SPORT_TYPES } from "@/lib/types";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";

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

  // Form state
  const [form, setForm] = useState({
    id: "", title: "", year: new Date().getFullYear(), location: "",
    sportType: "football" as SportType, description: "", keyMoment: "",
    eraClothing: "", imagePrompt: "", captionTemplates: "[]", hashtags: "",
    viralScore: 5.0, thumbnailUrl: "", status: "active" as "active" | "draft",
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
    setForm({ id: "", title: "", year: new Date().getFullYear(), location: "", sportType: "football", description: "", keyMoment: "", eraClothing: "", imagePrompt: "", captionTemplates: "[]", hashtags: "", viralScore: 5.0, thumbnailUrl: "", status: "active" });
  };

  const startEdit = (ev: Event) => {
    setEditing(ev);
    setForm({
      id: ev.id, title: ev.title, year: ev.year, location: ev.location || "",
      sportType: ev.sportType, description: ev.description || "",
      keyMoment: ev.keyMoment || "", eraClothing: ev.eraClothing || "",
      imagePrompt: ev.imagePrompt, captionTemplates: ev.captionTemplates || "[]",
      hashtags: ev.hashtags || "", viralScore: ev.viralScore,
      thumbnailUrl: ev.thumbnailUrl || "",
      status: ev.status as "active" | "draft",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      if (thumbnailFile) {
        // Create or update with file upload
        const fd = new FormData();
        fd.append("thumbnail", thumbnailFile);
        fd.append("metadata", JSON.stringify(form));
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
        // No file — send JSON
        if (editing) {
          await adminFetch(`/admin/events/${editing.id}`, session, {
            method: "PUT", body: JSON.stringify(form),
          });
          setMsg("✅ Event updated");
        } else {
          await adminFetch("/admin/events", session, {
            method: "POST", body: JSON.stringify(form),
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
    <div className="mx-auto max-w-2xl px-4 py-6">
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
          <input placeholder="ID (slug)" value={form.id} onChange={e => setForm({...form, id: e.target.value})} className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" disabled={!!editing} />
          <input placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" />
          <input placeholder="Year" type="number" value={form.year} onChange={e => setForm({...form, year: +e.target.value})} className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" />
          <select value={form.sportType} onChange={e => setForm({...form, sportType: e.target.value as SportType})} className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white">
            {SPORT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" />
          <input placeholder="Viral Score" type="number" step="0.1" min="1" max="10" value={form.viralScore} onChange={e => setForm({...form, viralScore: +e.target.value})} className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" />
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value as "active"|"draft"})} className="rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white">
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
          <input placeholder="Key Moment" value={form.keyMoment} onChange={e => setForm({...form, keyMoment: e.target.value})} className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" />
          <input placeholder="Era Clothing" value={form.eraClothing} onChange={e => setForm({...form, eraClothing: e.target.value})} className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" />
          <textarea placeholder="Image Prompt (img2img)" value={form.imagePrompt} onChange={e => setForm({...form, imagePrompt: e.target.value})} rows={4} className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white font-mono" />
          <textarea placeholder='Caption Templates (JSON array)' value={form.captionTemplates} onChange={e => setForm({...form, captionTemplates: e.target.value})} rows={2} className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white font-mono" />
          <input placeholder="Hashtags" value={form.hashtags} onChange={e => setForm({...form, hashtags: e.target.value})} className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" />
          <label className="col-span-2 flex items-center gap-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-gray-400 cursor-pointer hover:text-white hover:border-cyan-500/30 transition-colors">
            📁 {form.thumbnailUrl ? "Change thumbnail" : "Upload thumbnail"}
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0];
              if (f) setThumbnailFile(f);
            }} />
          </label>
          {thumbnailFile && <p className="col-span-2 text-xs text-green-400">📎 {thumbnailFile.name} ({(thumbnailFile.size / 1024).toFixed(0)} KB) — will be uploaded on save</p>}
          {form.thumbnailUrl && !thumbnailFile && (
            <p className="col-span-2 text-xs text-gray-500">Current: {form.thumbnailUrl}</p>
          )}
          <input placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="col-span-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving || !form.title || !form.imagePrompt}
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
                <p className="text-xs text-gray-400">{ev.sportType} · {ev.year} · Viral: {ev.viralScore} · <span className={ev.status === "active" ? "text-green-400" : "text-yellow-400"}>{ev.status}</span></p>
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
