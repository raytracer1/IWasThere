"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { fetchEvent, triggerGenerate } from "@/lib/api";
import type { Event } from "@/lib/types";
import { UploadSelfie } from "@/components/UploadSelfie";

const CATEGORY_ICON: Record<string, string> = {
  football: "⚽", basketball: "🏀", tennis: "🎾", athletics: "🏃",
  cricket: "🏏", boxing: "🥊", american_football: "🏈", other: "🏟️",
};

// ─── 2026 FIFA World Cup teams with country codes ─────────
const WORLD_CUP_TEAMS: { name: string; code: string }[] = [
  // AFC — Asia
  { name: "Australia", code: "au" }, { name: "Iran", code: "ir" },
  { name: "Iraq", code: "iq" }, { name: "Japan", code: "jp" },
  { name: "Jordan", code: "jo" }, { name: "Qatar", code: "qa" },
  { name: "Saudi Arabia", code: "sa" }, { name: "South Korea", code: "kr" },
  { name: "Uzbekistan", code: "uz" },
  // CAF — Africa
  { name: "Algeria", code: "dz" }, { name: "Cape Verde", code: "cv" },
  { name: "DR Congo", code: "cd" }, { name: "Egypt", code: "eg" },
  { name: "Ghana", code: "gh" }, { name: "Ivory Coast", code: "ci" },
  { name: "Morocco", code: "ma" }, { name: "Senegal", code: "sn" },
  { name: "South Africa", code: "za" }, { name: "Tunisia", code: "tn" },
  // CONCACAF
  { name: "Canada", code: "ca" }, { name: "Mexico", code: "mx" },
  { name: "United States", code: "us" }, { name: "Curaçao", code: "cw" },
  { name: "Haiti", code: "ht" }, { name: "Panama", code: "pa" },
  // CONMEBOL — South America
  { name: "Argentina", code: "ar" }, { name: "Brazil", code: "br" },
  { name: "Colombia", code: "co" }, { name: "Ecuador", code: "ec" },
  { name: "Paraguay", code: "py" }, { name: "Uruguay", code: "uy" },
  // OFC — Oceania
  { name: "New Zealand", code: "nz" },
  // UEFA — Europe
  { name: "Austria", code: "at" }, { name: "Belgium", code: "be" },
  { name: "Bosnia and Herzegovina", code: "ba" }, { name: "Croatia", code: "hr" },
  { name: "Czechia", code: "cz" }, { name: "England", code: "gb-eng" },
  { name: "France", code: "fr" }, { name: "Germany", code: "de" },
  { name: "Netherlands", code: "nl" }, { name: "Norway", code: "no" },
  { name: "Portugal", code: "pt" }, { name: "Scotland", code: "gb-sct" },
  { name: "Spain", code: "es" }, { name: "Sweden", code: "se" },
  { name: "Switzerland", code: "ch" }, { name: "Türkiye", code: "tr" },
];

/** Render a flag <img> for a country code */
function flagUrl(code: string) {
  return `https://flagcdn.com/w80/${code}.png`;
}

const MOODS: { value: string; label: string; emoji: string }[] = [
  { value: "euphoria", label: "Euphoria", emoji: "😄" },
  { value: "shock", label: "Shock", emoji: "😱" },
  { value: "tension", label: "Tension", emoji: "😤" },
  { value: "pride", label: "Pride", emoji: "🥹" },
  { value: "nervous", label: "Nervous", emoji: "😰" },
  { value: "awe", label: "Awe", emoji: "🤩" },
];

export default function CreatePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // ─── Football customization state ──────────────────────────
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [scoreA, setScoreA] = useState<number | null>(null);
  const [scoreB, setScoreB] = useState<number | null>(null);
  const [userTeam, setUserTeam] = useState("");
  const [mood, setMood] = useState("euphoria");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchEvent(eventId);
        if (res.data) setEvent(res.data);
        else setError("Event not found");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  const handleSelfieUpload = async (file: File) => {
    setConverting(true);
    setGenError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setSelfiePreview(reader.result as string);
      setImageBase64(reader.result as string);
      setConverting(false);
    };
    reader.onerror = () => { setGenError("Failed to read image"); setConverting(false); };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!imageBase64) return;
    setGenerating(true);
    setGenError(null);
    try {
      const football =
        event?.category === "football" && teamA && teamB && scoreA !== null && scoreB !== null
          ? { teamA, teamB, score: `${scoreA}-${scoreB}`, mood, userTeam: userTeam || teamA }
          : undefined;

      const res = await triggerGenerate({ eventId, imageBase64, football });
      if (res.data?.generationId) {
        router.push(`/result/${res.data.generationId}`);
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-gray-800 rounded w-3/4" />
        <div className="aspect-video bg-gray-800 rounded-xl" />
        <div className="h-4 bg-gray-800 rounded w-full" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <span className="text-5xl">😔</span>
        <p className="mt-4 text-gray-400">{error || "Event not found"}</p>
        <button onClick={() => router.push("/")} className="mt-3 text-sm text-cyan-400 hover:underline">
          Back to events
        </button>
      </div>
    );
  }

  const categoryIcon = CATEGORY_ICON[event.category] || "🏟️";
  const timePeriod = event.scene?.time_period || "";
  const location = event.scene?.location || "";
  const momentDesc = event.scene?.description || "";
  const atmosphere = event.scene?.atmosphere || "";
  const isFootball = event.category === "football";

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-20">
      {/* Event Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs text-cyan-300 mb-3">
          {categoryIcon} {event.category.replace("_", " ")} · {timePeriod}
        </div>
        <h1 className="text-xl font-bold text-white">{event.title}</h1>
        {location && (
          <p className="text-sm text-gray-400 mt-1">📍 {location}</p>
        )}
        {momentDesc && (
          <div className="mt-4 rounded-xl bg-gray-900/60 border border-white/10 overflow-hidden text-left">
            {event.thumbnailUrl && (
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={event.thumbnailUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">The Moment</p>
              <p className="text-sm text-gray-200 leading-relaxed">{momentDesc}</p>
              {atmosphere && (
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{atmosphere}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🆕 Football Scoreboard — TV broadcast style */}
      {isFootball && (
        <div className="mb-6 rounded-xl bg-gray-900/60 border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">
            ⚽ Customize Your Match
          </h2>

          {/* Live Scoreboard */}
          <div className="rounded-xl bg-gradient-to-b from-gray-800 to-gray-900 border border-white/10 overflow-hidden mb-4">
            {/* Top bar — league label */}
            <div className="bg-gray-800/50 border-b border-white/5 px-4 py-1.5 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-gray-400 uppercase tracking-widest">Live</span>
            </div>

            {/* Score Row */}
            <div className="flex items-center justify-center px-4 py-5 gap-3">
              {/* Team A */}
              <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
                {teamA ? (() => { const t = WORLD_CUP_TEAMS.find(t => t.name === teamA); return (<>
                  <img src={flagUrl(t!.code)} alt={teamA} className="w-10 h-7 rounded shadow-md object-cover" />
                  <span className="text-sm font-bold text-white text-center leading-tight truncate max-w-full">{teamA}</span>
                </>); })() : (
                  <span className="text-xs text-gray-600">Team A</span>
                )}
              </div>

              {/* Score — big numbers */}
              <div className="shrink-0 flex items-center gap-1.5">
                <span className="text-4xl font-black text-white tabular-nums w-12 text-center">
                  {scoreA ?? "-"}
                </span>
                <span className="text-2xl text-gray-500 font-light">:</span>
                <span className="text-4xl font-black text-white tabular-nums w-12 text-center">
                  {scoreB ?? "-"}
                </span>
              </div>

              {/* Team B */}
              <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
                {teamB ? (() => { const t = WORLD_CUP_TEAMS.find(t => t.name === teamB); return (<>
                  <img src={flagUrl(t!.code)} alt={teamB} className="w-10 h-7 rounded shadow-md object-cover" />
                  <span className="text-sm font-bold text-white text-center leading-tight truncate max-w-full">{teamB}</span>
                </>); })() : (
                  <span className="text-xs text-gray-600">Team B</span>
                )}
              </div>
            </div>
          </div>

          {/* Team Selectors */}
          <div className="flex items-end justify-center gap-3 mb-4">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Team A</label>
              <select
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-white/10 px-2 py-2 text-sm text-white"
              >
                <option value="">Select team...</option>
                {WORLD_CUP_TEAMS.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="shrink-0 text-center">
              <label className="text-xs text-gray-400 mb-1 block">Score</label>
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={99}
                  value={scoreA ?? ""}
                  onChange={(e) => setScoreA(e.target.value === "" ? null : parseInt(e.target.value))}
                  placeholder="0"
                  className="w-11 rounded-lg bg-gray-800 border border-white/10 px-0 py-2 text-center text-sm text-white"
                />
                <span className="text-gray-500">:</span>
                <input type="number" min={0} max={99}
                  value={scoreB ?? ""}
                  onChange={(e) => setScoreB(e.target.value === "" ? null : parseInt(e.target.value))}
                  placeholder="0"
                  className="w-11 rounded-lg bg-gray-800 border border-white/10 px-0 py-2 text-center text-sm text-white"
                />
              </div>
            </div>

            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Team B</label>
              <select
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-white/10 px-2 py-2 text-sm text-white"
              >
                <option value="">Select team...</option>
                {WORLD_CUP_TEAMS.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* My Team — toggle between Team A and Team B for jersey */}
          {teamA && teamB && (
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-2 block">
                👕 My Team <span className="text-gray-600">(jersey worn in video)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[teamA, teamB].map((t) => {
                  const info = WORLD_CUP_TEAMS.find(x => x.name === t);
                  const active = (userTeam || teamA) === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setUserTeam(t)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                        active
                          ? "border-cyan-500 bg-cyan-500/10 text-white"
                          : "border-white/10 bg-gray-800 text-gray-400 hover:border-white/20"
                      }`}
                    >
                      {info && <img src={flagUrl(info.code)} alt={t} className="w-6 h-4 rounded shadow" />}
                      <span className="truncate">{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mood */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Your Mood</label>
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                    mood === m.value
                      ? "border-cyan-500 bg-cyan-500/10 text-white"
                      : "border-white/10 bg-gray-800 text-gray-400 hover:border-white/20"
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selfie Upload */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">
          📸 Upload your selfie
        </h2>
        <UploadSelfie
          onUpload={handleSelfieUpload}
          uploading={converting}
        />
        {selfiePreview && !converting && (
          <p className="mt-2 text-xs text-green-400">✅ Photo ready</p>
        )}
        {converting && (
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-cyan-400">
            <span className="animate-spin">⏳</span>
            Reading photo...
          </div>
        )}
      </div>

      {/* Error */}
      {genError && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {genError}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!imageBase64 || generating}
        className={`w-full rounded-xl py-3.5 text-sm font-bold transition-all ${
          imageBase64 && !generating
            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-cyan-500/25"
            : "bg-gray-800 text-gray-500 cursor-not-allowed"
        }`}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            Generating...
          </span>
        ) : imageBase64 ? (
          `⚡ Step Into ${timePeriod}`
        ) : (
          "Upload a selfie to continue"
        )}
      </button>
    </div>
  );
}
