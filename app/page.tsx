"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBackground } from "../lib/hooks/useBackground";
import { Toast } from "../components/Toast";
import { UserMenu } from "../components/UserMenu";
import { useSession } from "../components/SessionProvider";

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

  const reset = useCallback((nextPhase: Phase | null = null) => {
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
  }, [phase, lengths]);

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

  // Only reset remaining when phase actually changes (not when paused)
  useEffect(() => {
    setRemaining(phaseLength);
  }, [phaseLength]);

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
  }, [remaining, phase, cycles, reset]);

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
  const [showDashboard, setShowDashboard] = useState(false);
  const [totalUsageTime, setTotalUsageTime] = useState(0); // in seconds
  const [backgroundPrompt, setBackgroundPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Use the custom background hook
  const { currentBackground, setBackground, clearBackground } = useBackground();
  
  // Use session for auth state
  const { user } = useSession();
  
  const lengths = useMemo(
    () => ({ focus: durMins.focus * 60, short: durMins.short * 60, long: durMins.long * 60 }),
    [durMins]
  );
  const timer = usePomodoroTimer(lengths);

  // Track total usage time when ANY timer session completes
  useEffect(() => {
    if (timer.remaining === 0) {
      setTotalUsageTime(prev => prev + timer.phaseLength);
    }
  }, [timer.remaining, timer.phaseLength]);


  // Format total usage time for display
  const formatTotalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const generateBackground = async () => {
    if (!backgroundPrompt.trim() || backgroundPrompt.trim().length < 3) return;
    
    setIsGenerating(true);
    setShowToast(false);
    
    try {
      const response = await fetch('/api/generate-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: backgroundPrompt.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate background');
      }
      
      const data = await response.json();
      await setBackground(data.imageUrl);
    } catch {
      setToastMessage('Couldn\'t generate image. Try again.');
      setShowToast(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearBackground = () => {
    clearBackground();
    setBackgroundPrompt('');
    setShowToast(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-400"
        style={{ 
          backgroundImage: currentBackground ? `url(${currentBackground})` : undefined,
          opacity: currentBackground ? 1 : 0
        }}
      />
      {!currentBackground && (
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-100px,rgba(59,130,246,0.35),transparent),radial-gradient(800px_400px_at_80%_20%,rgba(236,72,153,0.25),transparent),linear-gradient(180deg,#0B1220,40%,#0a0f1c)]" />
      )}
      
      {/* Soft glows */}
      <div className="pointer-events-none absolute -z-10 inset-0">
        <div className="absolute left-[10%] top-[20%] h-56 w-56 bg-sky-400/20 blur-3xl rounded-full" />
        <div className="absolute right-[5%] bottom-[10%] h-64 w-64 bg-fuchsia-400/15 blur-3xl rounded-full" />
      </div>

      {/* User Menu */}
      <UserMenu onOpenStats={() => setShowDashboard(true)} />

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

          {/* Sign-in banner for logged out users */}
          {!user && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Sign in to sync settings and stats across devices</span>
              </div>
            </div>
          )}

          {/* Background generation input - hidden by default, shown on hover */}
          <div className="mb-6 opacity-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-100 group-hover:pointer-events-auto">
            <div className="flex items-center gap-3 max-w-md mx-auto">
              <input
                type="text"
                value={backgroundPrompt}
                onChange={(e) => setBackgroundPrompt(e.target.value)}
                placeholder="Describe your background..."
                className="flex-1 h-10 px-4 rounded-full bg-white/10 border border-white/20 text-white text-sm placeholder-white/60 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/40"
                disabled={isGenerating}
                onKeyPress={(e) => e.key === 'Enter' && generateBackground()}
              />
                  <button
                    onClick={generateBackground}
                    disabled={isGenerating || !backgroundPrompt.trim() || backgroundPrompt.trim().length < 3}
                    className="h-10 px-4 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition border border-white/20 backdrop-blur disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generating...</span>
                      </div>
                    ) : (
                      'Generate'
                    )}
                  </button>
              {currentBackground && (
                <button
                  onClick={handleClearBackground}
                  className="h-10 px-3 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition border border-white/10"
                  title="Clear background"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
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
          </div>
        </div>
      </div>

      {/* Stats Modal */}
      {showDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDashboard(false)}
          />
          <div className="relative w-full max-w-md bg-slate-900/95 border border-white/10 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Usage Stats</h2>
              <button
                onClick={() => setShowDashboard(false)}
                className="h-8 w-8 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Stats */}
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-6 border border-white/10 text-center">
                <div className="text-4xl font-bold text-white mb-2">
                  {formatTotalTime(totalUsageTime)}
                </div>
                <div className="text-sm text-white/60">Total Timer Usage</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-center">
                  <div className="text-2xl font-bold text-white">
                    {Math.floor(totalUsageTime / 3600)}
                  </div>
                  <div className="text-sm text-white/60">Hours</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-center">
                  <div className="text-2xl font-bold text-white">
                    {Math.floor((totalUsageTime % 3600) / 60)}
                  </div>
                  <div className="text-sm text-white/60">Minutes</div>
                </div>
              </div>

              <div className="text-center text-md text-white/50">
                All completed timer sessions (pomodoro, breaks) are tracked
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast for error messages */}
      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}