"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "focus" | "shortBreak" | "longBreak";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function usePomodoroTimer(lengths: { focus: number; short: number; long: number }) {
  const [phase, setPhase] = useState<Phase>("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [remaining, setRemaining] = useState(lengths.focus);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const phaseLength = useMemo(() => {
    if (phase === "focus") return lengths.focus;
    if (phase === "shortBreak") return lengths.short;
    return lengths.long;
  }, [phase, lengths.focus, lengths.short, lengths.long]);

  const reset = (nextPhase: Phase | null = null) => {
    const target = nextPhase ?? phase;
    setPhase(target);
    setRemaining(
      target === "focus"
        ? lengths.focus
        : target === "shortBreak"
        ? lengths.short
        : lengths.long
    );
    setIsRunning(false);
    lastTickRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const toggle = () => setIsRunning((v) => !v);

  useEffect(() => {
    if (!isRunning) return;

    const tick = (t: number) => {
      if (lastTickRef.current == null) {
        lastTickRef.current = t;
      }
      const deltaMs = t - lastTickRef.current;
      lastTickRef.current = t;
      setRemaining((prev) => {
        const next = Math.max(0, prev - deltaMs / 1000);
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTickRef.current = null;
    };
  }, [isRunning]);

  // Align remaining when lengths change (while paused)
  useEffect(() => {
    if (isRunning) return;
    setRemaining(phaseLength);
  }, [phaseLength, isRunning]);

  useEffect(() => {
    if (remaining > 0) return;
    // auto advance
    setIsRunning(false);
    setCycles((c) => c + (phase === "focus" ? 1 : 0));
    const nextPhase: Phase =
      phase === "focus"
        ? (cycles + 1) % 4 === 0
          ? "longBreak"
          : "shortBreak"
        : "focus";
    reset(nextPhase);
  }, [remaining]);

  const progress = 1 - remaining / phaseLength;

  return {
    phase,
    isRunning,
    remaining: Math.round(remaining),
    phaseLength,
    cycles,
    progress: Math.min(1, Math.max(0, progress)),
    start,
    pause,
    toggle,
    reset,
  };
}

export default function Home() {
  const [durMins, setDurMins] = useState({ focus: 50, short: 5, long: 15 });
  const lengths = useMemo(
    () => ({ focus: durMins.focus * 60, short: durMins.short * 60, long: durMins.long * 60 }),
    [durMins]
  );
  const timer = usePomodoroTimer(lengths);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-100px,rgba(59,130,246,0.35),transparent),radial-gradient(800px_400px_at_80%_20%,rgba(236,72,153,0.25),transparent),linear-gradient(180deg,#0B1220,40%,#0a0f1c)]" />
      {/* Soft glows */}
      <div className="pointer-events-none absolute -z-10 inset-0">
        <div className="absolute left-[10%] top-[20%] h-56 w-56 bg-sky-400/20 blur-3xl rounded-full" />
        <div className="absolute right-[5%] bottom-[10%] h-64 w-64 bg-fuchsia-400/15 blur-3xl rounded-full" />
      </div>

      {/* Centered content */}
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="relative w-full max-w-2xl group">
          <div className="flex items-center justify-between mb-6 opacity-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-60 group-hover:pointer-events-auto">
            <span className="text-xs uppercase tracking-widest text-white/60">AIPomodoro</span>
            <span className="text-xs text-white/60">{timer.cycles} cycles</span>
          </div>

          {/* Duration inputs (minutes) */}
          <div className="flex items-center gap-3 mb-8 opacity-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-100 group-hover:pointer-events-auto">
            <label className="text-[11px] text-white/50">focus
              <input
                type="number"
                min={1}
                max={180}
                value={durMins.focus}
                onChange={(e) => setDurMins((d) => ({ ...d, focus: Number(e.target.value) || 0 }))}
                className="ml-2 w-16 h-8 rounded-md bg-white/5 border border-white/10 px-2 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </label>
            <label className="text-[11px] text-white/50">short
              <input
                type="number"
                min={1}
                max={60}
                value={durMins.short}
                onChange={(e) => setDurMins((d) => ({ ...d, short: Number(e.target.value) || 0 }))}
                className="ml-2 w-16 h-8 rounded-md bg-white/5 border border-white/10 px-2 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </label>
            <label className="text-[11px] text-white/50">long
              <input
                type="number"
                min={1}
                max={180}
                value={durMins.long}
                onChange={(e) => setDurMins((d) => ({ ...d, long: Number(e.target.value) || 0 }))}
                className="ml-2 w-16 h-8 rounded-md bg-white/5 border border-white/10 px-2 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </label>
          </div>

          {/* Phase tabs */}
          <div className="flex items-center gap-3 mb-6 opacity-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-70 group-hover:pointer-events-auto">
            <button
              onClick={() => timer.reset("focus")}
              className={`h-10 px-4 rounded-full text-sm transition backdrop-blur border ${
                timer.phase === "focus"
                  ? "bg-white/6 text-white border-white/15"
                  : "bg-transparent text-white/60 hover:text-white border-white/10 hover:bg-white/4"
              }`}
            >
              pomodoro
            </button>
            <button
              onClick={() => timer.reset("shortBreak")}
              className={`h-10 px-4 rounded-full text-sm transition backdrop-blur border ${
                timer.phase === "shortBreak"
                  ? "bg-white/6 text-white border-white/15"
                  : "bg-transparent text-white/60 hover:text-white border-white/10 hover:bg-white/4"
              }`}
            >
              short break
            </button>
            <button
              onClick={() => timer.reset("longBreak")}
              className={`h-10 px-4 rounded-full text-sm transition backdrop-blur border ${
                timer.phase === "longBreak"
                  ? "bg-white/6 text-white border-white/15"
                  : "bg-transparent text-white/60 hover:text-white border-white/10 hover:bg-white/4"
              }`}
            >
              long break
            </button>
          </div>

          {/* Big time */}
          <div className="mb-8 text-center select-none">
            <div className={`text-[96px] sm:text-[116px] font-extralight leading-none tracking-tight text-white/85 drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]`}
              style={{ animation: !timer.isRunning ? "subtlePulse 3.5s ease-in-out infinite" : undefined }}>
              {formatTime(timer.remaining)}
            </div>
            <div className="mt-2 text-xs text-white/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">hover to show controls</div>
          </div>

          {/* Controls */}
          <div className={`flex items-center gap-4 justify-center opacity-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-100 group-hover:pointer-events-auto`}>
            <button
              className={`w-44 h-12 rounded-full bg-white/6 text-white font-semibold hover:bg-white/12 transition border border-white/10 backdrop-blur`}
              onClick={timer.toggle}
            >
              {timer.isRunning ? "Pause" : "Start"}
            </button>
            <button
              className="h-12 px-5 rounded-full text-white/90 hover:text-white transition border border-white/10 hover:bg-white/5"
              onClick={() => timer.reset(null)}
            >
              {/* Reset icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12a9 9 0 1 0 3-6.708" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 4v4h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className="h-12 px-5 rounded-full text-white/90 hover:text-white transition border border-white/10 hover:bg-white/5"
              onClick={() => { /* TODO: open settings */ }}
              aria-label="Settings"
            >
              {/* Gear icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.75"/>
                <path d="M19.4 15a7.96 7.96 0 0 0 .06-6l1.46-1.46-1.94-1.94L17.5 5.6a7.96 7.96 0 0 0-6-.06L10.6 3H7.4l-.9 2.54a7.96 7.96 0 0 0-2.94 2.94L1 9.4v3.2l2.56.9a7.96 7.96 0 0 0 2.94 2.94L7.4 19h3.2l.9-2.56a7.96 7.96 0 0 0 2.94-2.94L19 16.6l1.94-1.94L19.4 15Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}