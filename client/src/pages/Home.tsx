/**
 * Iron Lab — Bench Press Tracker (Full-Stack)
 * Data is stored in the cloud database via tRPC.
 * Users must be logged in to track their sessions.
 */

import { useState, useRef, useCallback, useEffect } from "react";
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
  LogIn,
  Loader2,
} from "lucide-react";

// ─── Types (from DB) ──────────────────────────────────────────────────────────
interface WorkoutSet {
  id: number;
  sessionId: number;
  userId: number;
  weight: number;
  reps: number;
  volume: number;
  performedAt: number;
}

interface WorkoutSession {
  id: number;
  userId: number;
  date: string;
  label: string;
  goal: number;
  totalReps: number;
  totalVolume: number;
  completed: boolean;
  sets: WorkoutSet[];
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
  set,
  index,
  onDelete,
  isNew,
  isDeleting,
}: {
  set: WorkoutSet;
  index: number;
  onDelete: (id: number) => void;
  isNew: boolean;
  isDeleting: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg border border-border bg-card group transition-all duration-200 hover:border-primary/40 hover:bg-card/80 ${
        isNew ? "animate-slide-in animate-clank" : ""
      } ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
        <span className="font-display text-sm font-semibold text-primary">{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-2xl font-bold text-foreground">{set.weight}</span>
          <span className="text-xs text-muted-foreground font-medium">lbs</span>
        </div>
        <div className="text-xs text-muted-foreground">weight</div>
      </div>
      <div className="flex-1 min-w-0 text-center">
        <div className="flex items-baseline gap-1 justify-center">
          <span className="font-display text-2xl font-bold text-foreground">{set.reps}</span>
          <span className="text-xs text-muted-foreground font-medium">reps</span>
        </div>
        <div className="text-xs text-muted-foreground">reps</div>
      </div>
      <div className="flex-1 min-w-0 text-right">
        <div className="flex items-baseline gap-1 justify-end">
          <span className="font-display text-2xl font-bold text-primary">{set.volume.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground font-medium">lbs</span>
        </div>
        <div className="text-xs text-muted-foreground">volume</div>
      </div>
      <button
        onClick={() => onDelete(set.id)}
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
  session,
  isActive,
  compareSession,
}: {
  session: WorkoutSession;
  isActive: boolean;
  compareSession: WorkoutSession | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const volumeDiff = compareSession ? session.totalVolume - compareSession.totalVolume : null;
  const repsDiff = compareSession ? session.totalReps - compareSession.totalReps : null;

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
              <div className="font-display text-sm font-semibold text-foreground">{session.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{session.sets.length} sets</div>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="font-display text-lg font-bold text-foreground leading-none">
                {session.totalReps}
                <span className="text-xs font-normal text-muted-foreground ml-1">reps</span>
              </div>
              {repsDiff !== null && repsDiff !== 0 && (
                <div className={`text-xs font-medium mt-0.5 ${repsDiff > 0 ? "text-success" : "text-destructive"}`}>
                  {repsDiff > 0 ? "+" : ""}{repsDiff}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-display text-lg font-bold text-primary leading-none">
                {session.totalVolume.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">lbs</span>
              </div>
              {volumeDiff !== null && volumeDiff !== 0 && (
                <div className={`text-xs font-medium mt-0.5 ${volumeDiff > 0 ? "text-success" : "text-destructive"}`}>
                  {volumeDiff > 0 ? "+" : ""}{volumeDiff.toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {session.completed ? (
                <Trophy className="w-4 h-4 text-yellow-400" />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {Math.round((session.totalReps / session.goal) * 100)}%
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
                width: `${Math.min((session.totalReps / session.goal) * 100, 100)}%`,
                backgroundColor: session.completed ? "oklch(0.68 0.18 145)" : "oklch(0.72 0.18 45)",
              }}
            />
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2">
          {session.sets.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between text-sm py-1">
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

// ─── Login Gate ───────────────────────────────────────────────────────────────
function LoginGate() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-6">
          <Dumbbell className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground uppercase tracking-wide mb-2">
          Iron Lab
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Track your bench press sessions and compare your progress across the week. Sign in to save your data to the cloud.
        </p>
        <Button
          onClick={() => startLogin()}
          className="w-full h-12 bg-primary text-primary-foreground font-display font-semibold uppercase tracking-wide hover:bg-primary/90 active:scale-[0.96] transition-all"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Sign In to Start Tracking
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const REP_GOAL = 100;
  const { isAuthenticated, loading: authLoading, user } = useAuth();

  const utils = trpc.useUtils();

  // Queries
  const { data: todaySession, isLoading: todayLoading } = trpc.workout.getTodaySession.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: allSessions, isLoading: sessionsLoading } = trpc.workout.getSessions.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Mutations
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
      toast.info("Today's session cleared");
    },
    onError: (e) => toast.error(e.message),
  });

  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [newSetIdState, setNewSetIdState] = useState<number | null>(null);
  const [deletingSetId, setDeletingSetId] = useState<number | null>(null);
  const weightRef = useRef<HTMLInputElement>(null);

  // Derived data
  const todayIso = new Date().toISOString().slice(0, 10);
  const pastSessions = (allSessions ?? [])
    .filter((s) => s.date !== todayIso)
    .sort((a, b) => b.date.localeCompare(a.date));
  const compareSession = pastSessions[0] ?? null;

  const totalReps = todaySession?.totalReps ?? 0;
  const totalVolume = todaySession?.totalVolume ?? 0;
  const setCount = todaySession?.sets.length ?? 0;
  const progressPct = Math.min((totalReps / REP_GOAL) * 100, 100);
  const repsRemaining = Math.max(REP_GOAL - totalReps, 0);
  const goalAchieved = totalReps >= REP_GOAL;
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
    addSetMutation.mutate(
      { weight, reps },
      {
        onSuccess: (data) => {
          setNewSetIdState(data.set.id);
          setTimeout(() => setNewSetIdState(null), 600);
          setWeightInput("");
          setRepsInput("");
          weightRef.current?.focus();
        },
      }
    );
  }, [weightInput, repsInput, addSetMutation]);

  const handleDeleteSet = useCallback(
    (setId: number) => {
      setDeletingSetId(setId);
      deleteSetMutation.mutate(
        { setId },
        { onSettled: () => setDeletingSetId(null) }
      );
    },
    [deleteSetMutation]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddSet();
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!isAuthenticated) {
    return <LoginGate />;
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
                  Iron Lab · {user?.name ?? "Tracker"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <div className="font-display text-xl font-bold text-foreground leading-none">
                  <AnimatedNumber value={totalReps} />
                  <span className="text-xs font-normal text-muted-foreground ml-1">/ {REP_GOAL} reps</span>
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
                <span className="text-xs text-muted-foreground">
                  {todaySession?.label ?? ""}
                </span>
              </div>
              {setCount > 0 && (
                <button
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
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
                    <div className={`text-xs font-medium mt-1 ${stat.diff > 0 ? "text-success" : "text-destructive"}`}>
                      {stat.diff > 0 ? "▲" : "▼"} {Math.abs(stat.diff).toLocaleString()} vs last
                    </div>
                  )}
                  {stat.diff === 0 && compareSession && (
                    <div className="text-xs text-muted-foreground mt-1">= same as last</div>
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
                  disabled={addSetMutation.isPending}
                  className="h-11 px-5 bg-primary text-primary-foreground font-display font-semibold uppercase tracking-wide hover:bg-primary/90 active:scale-[0.96] transition-all duration-150 disabled:opacity-70"
                >
                  {addSetMutation.isPending ? (
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
            {todayLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : todaySession && todaySession.sets.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Sets Logged
                  </h3>
                  <span className="text-xs text-muted-foreground">{setCount} total</span>
                </div>
                {todaySession.sets.map((set, i) => (
                  <SetCard
                    key={set.id}
                    set={set}
                    index={i}
                    onDelete={handleDeleteSet}
                    isNew={set.id === newSetIdState}
                    isDeleting={set.id === deletingSetId}
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
                    `Session saved! ${totalReps} reps, ${totalVolume.toLocaleString()} lbs total volume. Come back tomorrow to compare!`
                  )
                }
              >
                <Trophy className="w-4 h-4 mr-2" />
                Done for Today
              </Button>
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
                    <div className={`font-display text-xl font-bold ${volumeDiff !== null && volumeDiff >= 0 ? "text-success" : "text-destructive"}`}>
                      {volumeDiff !== null ? `${volumeDiff >= 0 ? "+" : ""}${volumeDiff.toLocaleString()}` : "—"}
                      <span className="text-xs font-normal text-muted-foreground ml-1">lbs</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Reps</div>
                    <div className={`font-display text-xl font-bold ${repsDiff !== null && repsDiff >= 0 ? "text-success" : "text-destructive"}`}>
                      {repsDiff !== null ? `${repsDiff >= 0 ? "+" : ""}${repsDiff}` : "—"}
                      <span className="text-xs font-normal text-muted-foreground ml-1">reps</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {todaySession && (
              <SessionHistoryCard session={todaySession} isActive={true} compareSession={compareSession} />
            )}

            <Separator className="bg-border/50" />

            {sessionsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : pastSessions.length > 0 ? (
              <div className="space-y-3">
                {pastSessions.map((session, i) => (
                  <SessionHistoryCard
                    key={session.id}
                    session={session}
                    isActive={false}
                    compareSession={i < pastSessions.length - 1 ? pastSessions[i + 1] : null}
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
