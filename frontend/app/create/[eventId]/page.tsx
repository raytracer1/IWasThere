"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { fetchEvent, triggerGenerate } from "@/lib/api";
import type { Event } from "@/lib/types";

import { useUserStore } from "@/store/user";
import { UploadSelfie } from "@/components/UploadSelfie";

const CATEGORY_ICON: Record<string, string> = {
  football: "⚽", basketball: "🏀", tennis: "🎾", athletics: "🏃",
  cricket: "🏏", boxing: "🥊", american_football: "🏈", other: "🏟️",
};

/** Render a flag <img> for a country code */
function flagUrl(code: string) {
  return `https://flagcdn.com/w80/${code}.png`;
}

function TeamPicker({ value, onChange, teams, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  teams: { name: string; code: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = teams.find(t => t.name === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-lg bg-gray-800 border border-gray-300 dark:border-white/10 px-4 py-2.5 text-sm text-white flex items-center gap-2"
      >
        {selected ? (
          <>
            <img src={flagUrl(selected.code)} alt="" className="w-5 h-3.5 rounded-sm shrink-0" />
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 z-20 max-h-48 overflow-y-auto rounded-lg bg-gray-800 border border-gray-300 dark:border-white/10 shadow-xl">
            {teams.map(t => (
              <button
                key={t.name}
                type="button"
                onClick={() => { onChange(t.name); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
              >
                <img src={flagUrl(t.code)} alt="" className="w-5 h-3.5 rounded-sm shrink-0" />
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
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
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

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
  const [scoreA, setScoreA] = useState<number | null>(0);
  const [scoreB, setScoreB] = useState<number | null>(0);
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
      const teamAInfo = teamList.find(t => t.name === teamA);
      const teamBInfo = teamList.find(t => t.name === teamB);
      const football =
        isTeamSport && teamA && teamB && scoreA !== null && scoreB !== null
          ? { teamA, teamB, score: `${scoreA}-${scoreB}`, mood, userTeam: userTeam || teamA, codeA: teamAInfo?.code || '', codeB: teamBInfo?.code || '' }
          : undefined;

      const res = await triggerGenerate({ eventId, imageBase64, football }, accessToken);
      if (res.data?.generationId) {
        useUserStore.getState().refreshCredits(accessToken!);
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
  const momentDesc = event.scene?.description || "";
  const atmosphere = Array.isArray(event.scene?.atmosphere)
    ? event.scene.atmosphere.join(', ')
    : (event.scene?.atmosphere as string) || "";
  const isFootball = event.category === "football";
  const isBasketball = event.category === "basketball";
  const isTeamSport = isFootball || isBasketball;
  const teamList = event.teams || [];

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-20">
      {/* Event Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs text-cyan-300 mb-3">
          {categoryIcon} {event.category.replace("_", " ")} · {timePeriod}
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{event.title}</h1>
        {momentDesc && (
          <div className="mt-4 rounded-xl bg-gray-900/60 border border-gray-300 dark:border-white/10 overflow-hidden text-left">
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={event.thumbnailUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
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
      {isTeamSport && (
        <div className="mb-6 rounded-xl bg-gray-900/60 border border-gray-300 dark:border-white/10 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            ⚽ Customize Your Match
          </h2>

          {/* Live Scoreboard Display */}
          <div className="rounded-xl bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-300 dark:border-white/10 overflow-hidden mb-4">
            <div className="bg-gray-800/50 border-b border-gray-200 dark:border-white/5 px-4 py-1.5 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-gray-400 uppercase tracking-widest">Live</span>
            </div>
            <div className="flex items-center justify-center px-4 py-5 gap-3">
              <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
                {teamA ? (() => { const t = teamList.find(t => t.name === teamA); return (<>
                  <img src={flagUrl(t!.code)} alt={teamA} className="w-10 h-7 rounded shadow-md object-cover" />
                  <span className="text-sm font-bold text-white text-center leading-tight truncate max-w-full">{teamA}</span>
                </>); })() : (
                  <span className="text-xs text-gray-600">Team A</span>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <span className="text-4xl font-black text-white tabular-nums w-12 text-center">{scoreA ?? "-"}</span>
                <span className="text-2xl text-gray-500 font-light">:</span>
                <span className="text-4xl font-black text-white tabular-nums w-12 text-center">{scoreB ?? "-"}</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
                {teamB ? (() => { const t = teamList.find(t => t.name === teamB); return (<>
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
              <TeamPicker value={teamA} onChange={setTeamA} teams={teamList} placeholder="Select team..." />
            </div>
            <div className="shrink-0 text-center">
              <label className="text-xs text-gray-400 mb-1 block">Score</label>
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={99} value={scoreA ?? ""} onChange={(e) => setScoreA(e.target.value === "" ? null : parseInt(e.target.value))} placeholder="0" className="w-11 rounded-lg bg-gray-800 border border-gray-300 dark:border-white/10 px-0 py-2 text-center text-sm text-white" />
                <span className="text-gray-500">:</span>
                <input type="number" min={0} max={99} value={scoreB ?? ""} onChange={(e) => setScoreB(e.target.value === "" ? null : parseInt(e.target.value))} placeholder="0" className="w-11 rounded-lg bg-gray-800 border border-gray-300 dark:border-white/10 px-0 py-2 text-center text-sm text-white" />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Team B</label>
              <TeamPicker value={teamB} onChange={setTeamB} teams={teamList} placeholder="Select team..." />
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
                  const info = teamList.find(x => x.name === t);
                  const active = (userTeam || teamA) === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setUserTeam(t)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                        active
                          ? "border-cyan-500 bg-cyan-500/10 text-white"
                          : "border-white/10 bg-gray-800 text-gray-400 hover:border-gray-300 dark:border-white/20"
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
                      : "border-white/10 bg-gray-800 text-gray-400 hover:border-gray-300 dark:border-white/20"
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
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
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
      {(() => {
        const needsAuth = !accessToken;
        const needsSelfie = !imageBase64;
        const needsFootball = isFootball && (!teamA || !teamB || scoreA === null || scoreB === null);
        const canGenerate = !needsAuth && !needsSelfie && !needsFootball && !generating;

        let label = "Generate";
        if (generating) label = "Generating...";
        else if (needsAuth) label = "Sign in to generate";
        else if (needsSelfie) label = "Upload a selfie to continue";
        else if (needsFootball) label = "Select teams and score";
        else label = "⚡ Step Into";

        return (
          <button
            onClick={needsAuth ? () => signIn("google") : handleGenerate}
            disabled={!canGenerate && !needsAuth}
            className={`w-full rounded-xl py-3.5 text-sm font-bold transition-all ${
              canGenerate
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-cyan-500/25"
                : needsAuth
                ? "bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {generating && <span className="animate-spin mr-2">⏳</span>}
            {label}
          </button>
        );
      })()}
    </div>
  );
}
