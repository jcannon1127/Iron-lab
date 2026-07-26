/**
 * Iron Lab — Bench Press Tracker
 * Works for everyone without login (localStorage).
 * Optional sign-in syncs data to the cloud across devices.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Dumbbell,
  Plus,
  Trash2,
  RotateCcw,
  TrendingUp,
  Target,
  Flame,
  ChevronDown,
  ChevronUp,
  Trophy,
  Calendar,
  BarChart3,
  Cloud,
  CloudOff,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LocalSet {
  id: string;
  weight: number;
  reps: number;
  volume: number;
  performedAt: number;
}

interface LocalSession {
  date: string;
  label: string;
  sets: LocalSet[];
  totalReps: number;
  totalVolume: number;
  completed: boolean;
  goal: number;
}

interface LocalStore {
  sessions: LocalSession[];
}

// DB types (for cloud mode)
interface DbSet {
  id: number;
  sessionId: number;
  userId: number;
  weight: number;
  reps: number;
  volume: number;
  performedAt: number;
}

interface DbSession {
  id: number;
  userId: number;
  date: string;
  label: string;
  goal: number;
  totalReps: number;
  totalVolume: number;
  completed: boolean;
  sets: DbSet[];
}

const REP_GOAL = 100;
const STORAGE_KEY = "ironlab_sessions";

// ─── localStorage helpers ─────────────────────────────────────────────────────
function loadStore(): LocalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LocalStore;
  } catch {}
  return { sessions: [] };
}

function saveStore(store: LocalStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Animated Number ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (start === end) return;
    const duration = 400;
    const startTime = performance.now();
    const raf = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(raf);
      else prevRef.current = end;
    };
    requestAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{display.toLocaleString()}</span>;
}

// ─── Set Card ─────────────────────────────────────────────────────────────────
function SetCard({
  weight,
  reps,
  volume,
  index,
  onDelete,
  isNew,
}: {
  weight: number;
  reps: number;
  volume: number;
  index: number;
  onDelete: () => void;
  isNew: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg border border-border bg-card group transition-all duration-200 hover:border-primary/40 hover:bg-card/80 ${
        isNew ? "animate-slide-in" : ""
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
        <span className="font-display text-sm font-semibold text-primary">{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-2xl font-bold text-foreground">{weight}</span>
          <span className="text-xs text-muted-foreground font-medium">lbs</span>
        </div>
        <div className="text-xs text-muted-foreground">weight</div>
      </div>
      <div className="flex-1 min-w-0 text-center">
        <div className="flex items-baseline gap-1 justify-center">
          <span className="font-display text-2xl font-bold text-foreground">{reps}</span>
          <span className="text-xs text-muted-foreground font-medium">reps</span>
        </div>
        <div className="text-xs text-muted-foreground">reps</div>
      </div>
      <div className="flex-1 min-w-0 text-right">
        <div className="flex items-baseline gap-1 justify-end">
          <span className="font-display text-2xl font-bold text-primary">{volume.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground font-medium">lbs</span>
        </div>
        <div className="text-xs text-muted-foreground">volume</div>
      </div>
      <button
        onClick={onDelete}
        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Remove set"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Session History Card ─────────────────────────────────────────────────────
function SessionHistoryCard({
  label,
  totalReps,
  totalVolume,
  goal,
  completed,
  sets,
  isActive,
  compareReps,
  compareVolume,
}: {
  label: string;
  totalReps: number;
  totalVolume: number;
  goal: number;
  completed: boolean;
  sets: { weight: number; reps: number; volume: number }[];
  isActive: boolean;
  compareReps: number | null;
  compareVolume: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const volumeDiff = compareVolume !== null ? totalVolume - compareVolume : null;
  const repsDiff = compareReps !== null ? totalReps - compareReps : null;

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        isActive ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:border-border/80"
      }`}
    >
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isActive && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary animate-pulse" />}
            <div>
              <div className="font-display text-sm font-semibold text-foreground">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{sets.length} sets</div>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="font-display text-lg font-bold text-foreground leading-none">
                {totalReps}
                <span className="text-xs font-normal text-muted-foreground ml-1">reps</span>
              </div>
              {repsDiff !== null && repsDiff !== 0 && (
                <div className={`text-xs font-medium mt-0.5 ${repsDiff > 0 ? "text-green-400" : "text-red-400"}`}>
                  {repsDiff > 0 ? "+" : ""}{repsDiff}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-display text-lg font-bold text-primary leading-none">
                {totalVolume.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">lbs</span>
              </div>
              {volumeDiff !== null && volumeDiff !== 0 && (
                <div className={`text-xs font-medium mt-0.5 ${volumeDiff > 0 ? "text-green-400" : "text-red-400"}`}>
                  {volumeDiff > 0 ? "+" : ""}{volumeDiff.toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {completed ? (
                <Trophy className="w-4 h-4 text-yellow-400" />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {Math.round((totalReps / goal) * 100)}%
                </span>
              )}
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((totalReps / goal) * 100, 100)}%`,
                backgroundColor: completed ? "oklch(0.68 0.18 145)" : "oklch(0.72 0.18 45)",
              }}
            />
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1">
              <span className="text-muted-foreground font-medium">Set {i + 1}</span>
              <span className="text-foreground">
                <span className="font-display font-semibold">{s.weight}</span>
                <span className="text-muted-foreground text-xs"> lbs × </span>
                <span className="font-display font-semibold">{s.reps}</span>
                <span className="text-muted-foreground text-xs"> reps</span>
              </span>
              <span className="font-display font-semibold text-primary text-sm">
                {s.volume.toLocaleString()} lbs
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Guest Mode Hook (localStorage) ──────────────────────────────────────────
function useGuestTracker() {
  const [store, setStore] = useState<LocalStore>(() => loadStore());

  const today = todayIso();

  const todaySession = useMemo((): LocalSession => {
    const existing = store.sessions.find((s) => s.date === today);
    if (existing) return existing;
    return {
      date: today,
      label: formatLabel(today),
      sets: [],
      totalReps: 0,
      totalVolume: 0,
      completed: false,
      goal: REP_GOAL,
    };
  }, [store, today]);

  const pastSessions = useMemo(
    () => store.sessions.filter((s) => s.date !== today).sort((a, b) => b.date.localeCompare(a.date)),
    [store, today]
  );

  const updateSession = useCallback((updated: LocalSession) => {
    setStore((prev) => {
      const sessions = prev.sessions.filter((s) => s.date !== updated.date);
      const next = { sessions: [...sessions, updated] };
      saveStore(next);
      return next;
    });
  }, []);

  const addSet = useCallback(
    (weight: number, reps: number) => {
      const volume = weight * reps;
      const newSet: LocalSet = { id: nanoid(), weight, reps, volume, performedAt: Date.now() };
      const sets = [...todaySession.sets, newSet];
      const totalReps = sets.reduce((s, x) => s + x.reps, 0);
      const totalVolume = sets.reduce((s, x) => s + x.volume, 0);
      const updated: LocalSession = {
        ...todaySession,
        sets,
        totalReps,
        totalVolume,
        completed: totalReps >= REP_GOAL,
      };
      updateSession(updated);
      return newSet.id;
    },
    [todaySession, updateSession]
  );

  const deleteSet = useCallback(
    (id: string) => {
      const sets = todaySession.sets.filter((s) => s.id !== id);
      const totalReps = sets.reduce((s, x) => s + x.reps, 0);
      const totalVolume = sets.reduce((s, x) => s + x.volume, 0);
      updateSession({ ...todaySession, sets, totalReps, totalVolume, completed: totalReps >= REP_GOAL });
    },
    [todaySession, updateSession]
  );

  const resetToday = useCallback(() => {
    setStore((prev) => {
      const next = { sessions: prev.sessions.filter((s) => s.date !== today) };
      saveStore(next);
      return next;
    });
  }, [today]);

  return { todaySession, pastSessions, addSet, deleteSet, resetToday, isLoading: false };
}

// ─── Cloud Mode Hook (tRPC) ───────────────────────────────────────────────────
function useCloudTracker() {
  const utils = trpc.useUtils();

  const { data: todayData, isLoading: todayLoading } = trpc.workout.getTodaySession.useQuery(undefined);
  const { data: allSessions, isLoading: sessionsLoading } = trpc.workout.getSessions.useQuery(undefined);

  const addSetMutation = trpc.workout.addSet.useMutation({
    onSuccess: () => {
      utils.workout.getTodaySession.invalidate();
      utils.workout.getSessions.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteSetMutation = trpc.workout.deleteSet.useMutation({
    onSuccess: () => {
      utils.workout.getTodaySession.invalidate();
      utils.workout.getSessions.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetMutation = trpc.workout.resetToday.useMutation({
    onSuccess: () => {
      utils.workout.getTodaySession.invalidate();
      utils.workout.getSessions.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const today = todayIso();

  const todaySession: LocalSession = useMemo(() => {
    if (!todayData) return { date: today, label: formatLabel(today), sets: [], totalReps: 0, totalVolume: 0, completed: false, goal: REP_GOAL };
    return {
      date: todayData.date,
      label: todayData.label,
      sets: todayData.sets.map((s) => ({ id: String(s.id), weight: s.weight, reps: s.reps, volume: s.volume, performedAt: s.performedAt })),
      totalReps: todayData.totalReps,
      totalVolume: todayData.totalVolume,
      completed: todayData.completed,
      goal: todayData.goal,
    };
  }, [todayData, today]);

  const pastSessions: LocalSession[] = useMemo(() => {
    if (!allSessions) return [];
    return allSessions
      .filter((s) => s.date !== today)
      .map((s) => ({
        date: s.date,
        label: s.label,
        sets: s.sets.map((x) => ({ id: String(x.id), weight: x.weight, reps: x.reps, volume: x.volume, performedAt: x.performedAt })),
        totalReps: s.totalReps,
        totalVolume: s.totalVolume,
        completed: s.completed,
        goal: s.goal,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allSessions, today]);

  const [pendingId, setPendingId] = useState<string | null>(null);

  const addSet = useCallback(
    (weight: number, reps: number) => {
      const tempId = nanoid();
      setPendingId(tempId);
      addSetMutation.mutate({ weight, reps }, { onSettled: () => setPendingId(null) });
      return tempId;
    },
    [addSetMutation]
  );

  const deleteSet = useCallback(
    (id: string) => {
      deleteSetMutation.mutate({ setId: parseInt(id, 10) });
    },
    [deleteSetMutation]
  );

  const resetToday = useCallback(() => {
    resetMutation.mutate();
  }, [resetMutation]);

  return {
    todaySession,
    pastSessions,
    addSet,
    deleteSet,
    resetToday,
    isLoading: todayLoading || sessionsLoading,
    isMutating: addSetMutation.isPending || deleteSetMutation.isPending || resetMutation.isPending,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();

  // Always call both hooks — use the right one based on auth state
  const guest = useGuestTracker();
  const cloud = useCloudTracker();

  const tracker = isAuthenticated ? cloud : guest;
  const { todaySession, pastSessions, addSet, deleteSet, resetToday, isLoading } = tracker;
  const isMutating: boolean = "isMutating" in tracker ? (tracker.isMutating as boolean) : false;

  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [newSetId, setNewSetId] = useState<string | null>(null);
  const weightRef = useRef<HTMLInputElement>(null);

  const { totalReps, totalVolume, sets, goal, completed: goalAchieved } = todaySession;
  const setCount = sets.length;
  const progressPct = Math.min((totalReps / goal) * 100, 100);
  const repsRemaining = Math.max(goal - totalReps, 0);
  const compareSession = pastSessions[0] ?? null;
  const volumeDiff = compareSession ? totalVolume - compareSession.totalVolume : null;
  const repsDiff = compareSession ? totalReps - compareSession.totalReps : null;

  const prevGoalRef = useRef(false);
  useEffect(() => {
    if (goalAchieved && !prevGoalRef.current) {
      toast.success("🏆 100 reps achieved! Goal crushed!");
    }
    prevGoalRef.current = goalAchieved;
  }, [goalAchieved]);

  const handleAddSet = useCallback(() => {
    const weight = parseFloat(weightInput);
    const reps = parseInt(repsInput, 10);
    if (!weight || weight <= 0 || isNaN(weight)) {
      toast.error("Enter a valid weight");
      weightRef.current?.focus();
      return;
    }
    if (!reps || reps <= 0 || isNaN(reps)) {
      toast.error("Enter valid reps");
      return;
    }
    const id = addSet(weight, reps);
    setNewSetId(id);
    setTimeout(() => setNewSetId(null), 600);
    setWeightInput("");
    setRepsInput("");
    weightRef.current?.focus();
  }, [weightInput, repsInput, addSet]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddSet();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-base font-semibold text-foreground leading-none tracking-wide uppercase">
                  Bench Press
                </h1>
                <p className="text-xs text-muted-foreground leading-none mt-0.5">
                  Iron Lab
                  {isAuthenticated && user?.name ? ` · ${user.name}` : " · Guest"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="font-display text-xl font-bold text-foreground leading-none">
                  <AnimatedNumber value={totalReps} />
                  <span className="text-xs font-normal text-muted-foreground ml-1">/ {goal} reps</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{setCount} sets today</div>
              </div>
              <div className="text-right hidden md:block">
                <div className="font-display text-xl font-bold text-primary leading-none">
                  <AnimatedNumber value={totalVolume} />
                  <span className="text-xs font-normal text-muted-foreground ml-1">lbs</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">total volume</div>
              </div>
              {goalAchieved && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-display text-xs">
                  <Trophy className="w-3 h-3 mr-1" /> GOAL MET
                </Badge>
              )}
              {/* Cloud sync button */}
              {isAuthenticated ? (
                <button
                  onClick={() => logout()}
                  title="Signed in — data synced to cloud. Click to sign out."
                  className="flex items-center gap-1.5 text-xs text-green-400 hover:text-muted-foreground transition-colors"
                >
                  <Cloud className="w-4 h-4" />
                  <span className="hidden sm:inline">Synced</span>
                </button>
              ) : (
                <button
                  onClick={() => startLogin()}
                  title="Sign in to sync across devices"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <CloudOff className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign in to sync</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Progress Bar ── */}
      <div className="border-b border-border bg-card/50">
        <div className="container py-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                100-Rep Goal
              </span>
            </div>
            <span className="font-display text-sm font-semibold text-foreground">
              {Math.round(progressPct)}%
              {repsRemaining > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  {repsRemaining} to go
                </span>
              )}
            </span>
          </div>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: goalAchieved
                  ? "oklch(0.68 0.18 145)"
                  : "linear-gradient(90deg, oklch(0.65 0.18 45), oklch(0.72 0.18 45))",
                boxShadow: goalAchieved
                  ? "0 0 12px oklch(0.68 0.18 145 / 0.5)"
                  : "0 0 12px oklch(0.72 0.18 45 / 0.4)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* ── Left: Current Session ── */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">
                  Today's Session
                </h2>
                <span className="text-xs text-muted-foreground">{todaySession.label}</span>
              </div>
              {setCount > 0 && (
                <button
                  onClick={() => { resetToday(); toast.info("Today's session cleared"); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Reps", value: totalReps, suffix: "reps", icon: <Target className="w-4 h-4" />, color: "text-foreground", diff: repsDiff },
                { label: "Total Volume", value: totalVolume, suffix: "lbs", icon: <TrendingUp className="w-4 h-4" />, color: "text-primary", diff: volumeDiff },
                { label: "Sets Done", value: setCount, suffix: "sets", icon: <BarChart3 className="w-4 h-4" />, color: "text-foreground", diff: null },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                    {stat.icon}
                    <span className="text-xs font-medium uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <div className={`font-display text-3xl font-bold ${stat.color} leading-none`}>
                    <AnimatedNumber value={stat.value} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.suffix}</div>
                  {stat.diff !== null && stat.diff !== 0 && (
                    <div className={`text-xs font-medium mt-1 ${stat.diff > 0 ? "text-green-400" : "text-red-400"}`}>
                      {stat.diff > 0 ? "▲" : "▼"} {Math.abs(stat.diff).toLocaleString()} vs last
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Set Form */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-display text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                Log a Set
              </h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Weight (lbs)</label>
                  <Input
                    ref={weightRef}
                    type="number"
                    placeholder="e.g. 135"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-input border-border text-foreground font-display text-lg h-11 placeholder:text-muted-foreground/50"
                    min="1"
                    step="5"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Reps</label>
                  <Input
                    type="number"
                    placeholder="e.g. 10"
                    value={repsInput}
                    onChange={(e) => setRepsInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-input border-border text-foreground font-display text-lg h-11 placeholder:text-muted-foreground/50"
                    min="1"
                  />
                </div>
                <Button
                  onClick={handleAddSet}
                  disabled={isMutating}
                  className="h-11 px-5 bg-primary text-primary-foreground font-display font-semibold uppercase tracking-wide hover:bg-primary/90 active:scale-[0.96] transition-all duration-150 disabled:opacity-70"
                >
                  {isMutating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Set
                    </>
                  )}
                </Button>
              </div>
              {weightInput && repsInput && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Volume preview:{" "}
                  <span className="font-display font-semibold text-primary">
                    {(parseFloat(weightInput) * parseInt(repsInput, 10) || 0).toLocaleString()} lbs
                  </span>
                </div>
              )}
            </div>

            {/* Set list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : sets.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Sets Logged
                  </h3>
                  <span className="text-xs text-muted-foreground">{setCount} total</span>
                </div>
                {sets.map((set, i) => (
                  <SetCard
                    key={set.id}
                    weight={set.weight}
                    reps={set.reps}
                    volume={set.volume}
                    index={i}
                    onDelete={() => deleteSet(set.id)}
                    isNew={set.id === newSetId}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Dumbbell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No sets logged yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Enter weight and reps above to get started.
                </p>
              </div>
            )}

            {setCount > 0 && (
              <Button
                variant="outline"
                className="w-full font-display font-semibold uppercase tracking-wide border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
                onClick={() =>
                  toast.success(
                    `Session saved! ${totalReps} reps · ${totalVolume.toLocaleString()} lbs total volume. Come back to compare!`
                  )
                }
              >
                <Trophy className="w-4 h-4 mr-2" />
                Done for Today
              </Button>
            )}

            {/* Guest sync nudge */}
            {!isAuthenticated && setCount > 0 && (
              <div className="rounded-lg border border-border bg-card/50 p-4 flex items-start gap-3">
                <CloudOff className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Your data is saved on this device only.{" "}
                    <button
                      onClick={() => startLogin()}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>{" "}
                    to sync across all your devices.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Session History ── */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">
                Session History
              </h2>
            </div>

            {compareSession && (
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                  vs. Last Session ({compareSession.label})
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Volume</div>
                    <div className={`font-display text-xl font-bold ${volumeDiff !== null && volumeDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {volumeDiff !== null ? `${volumeDiff >= 0 ? "+" : ""}${volumeDiff.toLocaleString()}` : "—"}
                      <span className="text-xs font-normal text-muted-foreground ml-1">lbs</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Reps</div>
                    <div className={`font-display text-xl font-bold ${repsDiff !== null && repsDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {repsDiff !== null ? `${repsDiff >= 0 ? "+" : ""}${repsDiff}` : "—"}
                      <span className="text-xs font-normal text-muted-foreground ml-1">reps</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Today's session card */}
            <SessionHistoryCard
              label={todaySession.label}
              totalReps={totalReps}
              totalVolume={totalVolume}
              goal={goal}
              completed={goalAchieved}
              sets={sets}
              isActive={true}
              compareReps={compareSession?.totalReps ?? null}
              compareVolume={compareSession?.totalVolume ?? null}
            />

            <Separator className="bg-border/50" />

            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : pastSessions.length > 0 ? (
              <div className="space-y-3">
                {pastSessions.map((session, i) => (
                  <SessionHistoryCard
                    key={session.date}
                    label={session.label}
                    totalReps={session.totalReps}
                    totalVolume={session.totalVolume}
                    goal={session.goal}
                    completed={session.completed}
                    sets={session.sets}
                    isActive={false}
                    compareReps={i < pastSessions.length - 1 ? pastSessions[i + 1].totalReps : null}
                    compareVolume={i < pastSessions.length - 1 ? pastSessions[i + 1].totalVolume : null}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <TrendingUp className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No past sessions yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Come back later this week to compare sessions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
