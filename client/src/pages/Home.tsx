/**
 * Iron Lab — Bench Press Tracker
 * Features: inline set editing, custom rep goal, rest timer, share session
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
// Standalone auth — no Manus OAuth dependency
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
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
  LogOut,
  Loader2,
  LogIn,
  Pencil,
  Check,
  X,
  Timer,
  Share2,
  Settings2,
  BookMarked,
  Zap,
} from "lucide-react";

// ─── Animated Number ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (start === end) return;
    const dur = 400;
    const t0 = performance.now();
    const raf = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * e));
      if (p < 1) requestAnimationFrame(raf);
      else prevRef.current = end;
    };
    requestAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{display.toLocaleString()}</span>;
}

// ─── Rest Timer ───────────────────────────────────────────────────────────────
function RestTimer({ duration, onDone }: { duration: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(duration);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setRemaining(duration);
  }, [duration]);

  useEffect(() => {
    if (remaining <= 0) {
      doneRef.current();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  const pct = ((duration - remaining) / duration) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-primary" />
          <span className="font-display text-sm font-semibold text-foreground uppercase tracking-wide">
            Rest Timer
          </span>
        </div>
        <button onClick={() => doneRef.current()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Skip
        </button>
      </div>
      <div className="text-center mb-3">
        <span className="font-display text-5xl font-bold text-primary tabular-nums">
          {mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : secs}
        </span>
        {mins === 0 && <span className="text-sm text-muted-foreground ml-1">sec</span>}
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, oklch(0.65 0.18 45), oklch(0.72 0.18 45))",
          }}
        />
      </div>
    </div>
  );
}

// ─── Set Card ─────────────────────────────────────────────────────────────────
function SetCard({
  id,
  weight,
  reps,
  volume,
  index,
  onDelete,
  onEdit,
  isNew,
  prLabels = [],
}: {
  id: number;
  weight: number;
  reps: number;
  volume: number;
  index: number;
  onDelete: () => void;
  onEdit: (weight: number, reps: number) => void;
  isNew: boolean;
  prLabels?: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [editWeight, setEditWeight] = useState(String(weight));
  const [editReps, setEditReps] = useState(String(reps));
  const weightInputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setEditWeight(String(weight));
    setEditReps(String(reps));
    setEditing(true);
    setTimeout(() => weightInputRef.current?.focus(), 50);
  };

  const commitEdit = () => {
    const w = parseFloat(editWeight);
    const r = parseInt(editReps, 10);
    if (!w || w <= 0 || isNaN(w) || !r || r <= 0 || isNaN(r)) {
      toast.error("Enter valid weight and reps");
      return;
    }
    onEdit(w, r);
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") cancelEdit();
  };

  if (editing) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/60 bg-primary/5">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <span className="font-display text-sm font-semibold text-primary">{index + 1}</span>
        </div>
        <div className="flex-1 flex gap-2 items-center">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Weight</label>
            <Input
              ref={weightInputRef}
              type="number"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 text-sm font-display bg-input border-border"
              min="1"
              step="5"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Reps</label>
            <Input
              type="number"
              value={editReps}
              onChange={(e) => setEditReps(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 text-sm font-display bg-input border-border"
              min="1"
            />
          </div>
          {editWeight && editReps && (
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-muted-foreground mb-1">Vol</div>
              <div className="font-display text-sm font-bold text-primary">
                {(parseFloat(editWeight) * parseInt(editReps, 10) || 0).toLocaleString()}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={commitEdit}
            className="p-2 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            title="Save"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={cancelEdit}
            className="p-2 rounded bg-border text-muted-foreground hover:text-foreground transition-colors"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg border bg-card group transition-all duration-200 hover:bg-card/80 ${
        prLabels.length > 0 ? "border-yellow-500/60 hover:border-yellow-500" : "border-border hover:border-primary/40"
      } ${isNew ? "animate-slide-in" : ""}`}
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
        {prLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end mt-1">
            {prLabels.map((label) => (
              <span key={label} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wide bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                <Trophy className="w-2.5 h-2.5" />{label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="ml-2 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={startEdit}
          className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Edit set"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Remove set"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Session History Card ─────────────────────────────────────────────────────
function SessionHistoryCard({
  label, totalReps, totalVolume, goal, completed, sets, isActive, compareReps, compareVolume,
}: {
  label: string; totalReps: number; totalVolume: number; goal: number; completed: boolean;
  sets: { weight: number; reps: number; volume: number }[];
  isActive: boolean; compareReps: number | null; compareVolume: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const volumeDiff = compareVolume !== null ? totalVolume - compareVolume : null;
  const repsDiff = compareReps !== null ? totalReps - compareReps : null;

  return (
    <div className={`rounded-lg border transition-all duration-200 ${isActive ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:border-border/80"}`}>
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
                {totalReps}<span className="text-xs font-normal text-muted-foreground ml-1">reps</span>
              </div>
              {repsDiff !== null && repsDiff !== 0 && (
                <div className={`text-xs font-medium mt-0.5 ${repsDiff > 0 ? "text-green-400" : "text-red-400"}`}>
                  {repsDiff > 0 ? "+" : ""}{repsDiff}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-display text-lg font-bold text-primary leading-none">
                {totalVolume.toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-1">lbs</span>
              </div>
              {volumeDiff !== null && volumeDiff !== 0 && (
                <div className={`text-xs font-medium mt-0.5 ${volumeDiff > 0 ? "text-green-400" : "text-red-400"}`}>
                  {volumeDiff > 0 ? "+" : ""}{volumeDiff.toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {completed ? <Trophy className="w-4 h-4 text-yellow-400" /> : (
                <span className="text-xs text-muted-foreground">{Math.round((totalReps / goal) * 100)}%</span>
              )}
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((totalReps / goal) * 100, 100)}%`, backgroundColor: completed ? "oklch(0.68 0.18 145)" : "oklch(0.72 0.18 45)" }} />
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
              <span className="font-display font-semibold text-primary text-sm">{s.volume.toLocaleString()} lbs</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground uppercase tracking-wide">Iron Lab</h1>
          <p className="text-muted-foreground mt-2 text-sm">Track your bench press. Beat your last session.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="space-y-2 text-left">
            {["Log sets with weight & reps", "Track total volume per session", "Compare progress across sessions", "100-rep goal tracker"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <Button onClick={() => { window.location.href = "/login"; }} className="w-full bg-primary text-primary-foreground font-display font-semibold uppercase tracking-wide hover:bg-primary/90 active:scale-[0.97] transition-all duration-150">
            <LogIn className="w-4 h-4 mr-2" />
            Sign In to Start
          </Button>
          <p className="text-xs text-muted-foreground text-center">Your data syncs across all devices.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({
  label, totalReps, totalVolume, goal, completed, sets, onClose,
}: {
  label: string; totalReps: number; totalVolume: number; goal: number; completed: boolean;
  sets: { weight: number; reps: number; volume: number }[];
  onClose: () => void;
}) {
  const text = [
    `🏋️ Iron Lab — ${label}`,
    ``,
    `${completed ? "🏆 Goal achieved! " : ""}${totalReps} reps · ${totalVolume.toLocaleString()} lbs total volume`,
    ``,
    ...sets.map((s, i) => `Set ${i + 1}: ${s.weight} lbs × ${s.reps} reps = ${s.volume.toLocaleString()} lbs`),
    ``,
    `Tracked with Iron Lab Bench Press Tracker`,
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Session summary copied to clipboard!");
    } catch {
      toast.error("Couldn't copy — try selecting the text manually");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-foreground uppercase tracking-wide text-sm">Share Session</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="rounded-lg bg-background border border-border p-3">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{text}</pre>
          </div>
          <Button onClick={copy} className="w-full bg-primary text-primary-foreground font-display font-semibold uppercase tracking-wide hover:bg-primary/90">
            <Share2 className="w-4 h-4 mr-2" />
            Copy to Clipboard
          </Button>
          <p className="text-xs text-muted-foreground text-center">Paste into any app to share your results</p>
        </div>
      </div>
    </div>
  );
}

// ─── Goal Picker ──────────────────────────────────────────────────────────────
const GOAL_PRESETS = [50, 75, 100, 125, 150];

function GoalPicker({ current, onSave, onClose }: { current: number; onSave: (g: number) => void; onClose: () => void }) {
  const [val, setVal] = useState(String(current));

  const commit = () => {
    const n = parseInt(val, 10);
    if (!n || n < 1 || n > 1000) { toast.error("Enter a goal between 1 and 1000"); return; }
    onSave(n);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xs rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-foreground uppercase tracking-wide text-sm">Rep Goal</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {GOAL_PRESETS.map((p) => (
              <button key={p} onClick={() => setVal(String(p))}
                className={`px-3 py-1.5 rounded-md font-display text-sm font-semibold transition-colors ${val === String(p) ? "bg-primary text-primary-foreground" : "bg-border text-muted-foreground hover:text-foreground"}`}>
                {p}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1.5">Custom</label>
            <Input type="number" value={val} onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commit()}
              className="bg-input border-border text-foreground font-display h-10" min="1" max="1000" />
          </div>
          <Button onClick={commit} className="w-full bg-primary text-primary-foreground font-display font-semibold uppercase tracking-wide hover:bg-primary/90">
            <Check className="w-4 h-4 mr-2" /> Set Goal
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Weekly Volume Chart ─────────────────────────────────────────────────────
const chartConfig = {
  volume: { label: "Volume (lbs)", color: "hsl(var(--primary))" },
};

function WeeklyChart({ sessions }: { sessions: { label: string; totalVolume: number; completed: boolean }[] }) {
  const data = useMemo(() => {
    return [...sessions].slice(0, 7).reverse().map((s) => ({
      label: s.label.replace(/^\w+,\s*/, ""), // strip weekday, keep "Jul 12"
      volume: s.totalVolume,
      completed: s.completed,
    }));
  }, [sessions]);

  if (data.length === 0) return null;

  const maxVol = Math.max(...data.map((d) => d.volume));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-display text-sm font-semibold text-foreground uppercase tracking-wide">Weekly Volume</h3>
      </div>
      <ChartContainer config={chartConfig} className="h-36 w-full">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v) => [`${Number(v).toLocaleString()} lbs`, "Volume"]} />} />
          <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
            {data.map((_entry, i) => (
              <Cell key={i} fill={data[i].volume === maxVol ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.35)"} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

// ─── Templates Panel ─────────────────────────────────────────────────────────
type TemplateSet = { weight: number; reps: number };
type Template = { id: number; name: string; sets: (TemplateSet & { id: number; position: number })[] };

function TemplatesPanel({ onApplySet }: { onApplySet: (weight: number, reps: number) => void }) {
  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.workout.getTemplates.useQuery(undefined);
  const createMutation = trpc.workout.createTemplate.useMutation({
    onSuccess: () => {
      utils.workout.getTemplates.invalidate();
      toast.success("Template saved!");
      setShowCreate(false);
      setNewName("");
      setNewSets([{ weight: 0, reps: 0 }]);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.workout.deleteTemplate.useMutation({
    onSuccess: () => { utils.workout.getTemplates.invalidate(); toast.info("Template deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const [expanded, setExpanded] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSets, setNewSets] = useState<TemplateSet[]>([{ weight: 0, reps: 0 }]);

  const addNewSet = () => setNewSets((prev) => [...prev, { weight: 0, reps: 0 }]);
  const removeNewSet = (i: number) => setNewSets((prev) => prev.filter((_, idx) => idx !== i));
  const updateNewSet = (i: number, field: "weight" | "reps", val: string) => {
    setNewSets((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: parseFloat(val) || 0 } : s));
  };

  const handleCreate = () => {
    if (!newName.trim()) { toast.error("Enter a template name"); return; }
    const valid = newSets.filter((s) => s.weight > 0 && s.reps > 0);
    if (valid.length === 0) { toast.error("Add at least one valid set"); return; }
    createMutation.mutate({ name: newName.trim(), sets: valid });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display text-sm font-semibold text-foreground uppercase tracking-wide">Templates</h3>
        </div>
        <button onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-display font-semibold uppercase tracking-wide transition-colors">
          <Plus className="w-3.5 h-3.5" />{showCreate ? "Cancel" : "New"}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-md border border-border bg-background p-3 space-y-3">
          <Input placeholder="Template name (e.g. Warm-up)" value={newName} onChange={(e) => setNewName(e.target.value)}
            className="bg-input border-border text-foreground font-display h-9 text-sm" />
          <div className="space-y-2">
            {newSets.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input type="number" placeholder="lbs" value={s.weight || ""} onChange={(e) => updateNewSet(i, "weight", e.target.value)}
                  className="bg-input border-border text-foreground font-display h-8 text-sm w-20" min="1" />
                <span className="text-xs text-muted-foreground">x</span>
                <Input type="number" placeholder="reps" value={s.reps || ""} onChange={(e) => updateNewSet(i, "reps", e.target.value)}
                  className="bg-input border-border text-foreground font-display h-8 text-sm w-20" min="1" />
                {newSets.length > 1 && (
                  <button onClick={() => removeNewSet(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addNewSet}
              className="flex-1 font-display text-xs uppercase tracking-wide border-border">
              <Plus className="w-3 h-3 mr-1" />Add Set
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}
              className="flex-1 font-display text-xs uppercase tracking-wide bg-primary text-primary-foreground hover:bg-primary/90">
              {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Save</>}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 text-primary animate-spin" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">No templates yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Save a set sequence to quick-fill your workout.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(templates as Template[]).map((t) => (
            <div key={t.id} className="rounded-md border border-border bg-background overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2">
                <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  className="flex items-center gap-2 flex-1 text-left">
                  <span className="font-display text-sm font-semibold text-foreground">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.sets.length} sets</span>
                  {expanded === t.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
                </button>
                <button onClick={() => deleteMutation.mutate({ templateId: t.id })}
                  className="ml-2 text-muted-foreground hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {expanded === t.id && (
                <div className="border-t border-border divide-y divide-border/50">
                  {t.sets.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-xs text-muted-foreground">Set {i + 1}: <span className="text-foreground font-display font-semibold">{s.weight} lbs x {s.reps} reps</span></span>
                      <button onClick={() => onApplySet(s.weight, s.reps)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-display font-semibold transition-colors">
                        <Zap className="w-3 h-3" />Use
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Tracker ─────────────────────────────────────────────────────────────
const TIMER_OPTIONS = [
  { label: "60s", value: 60 },
  { label: "90s", value: 90 },
  { label: "3 min", value: 180 },
];

function Tracker() {
  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
  });
  const logout = () => logoutMutation.mutate();

  const { data: todayData, isLoading: todayLoading } = trpc.workout.getTodaySession.useQuery(undefined);
  const { data: allSessions, isLoading: sessionsLoading } = trpc.workout.getSessions.useQuery(undefined);

  const { data: prs } = trpc.workout.getPRs.useQuery(undefined);
  const { data: profile } = trpc.profile.get.useQuery(undefined);
  const { data: dailyBoard } = trpc.leaderboard.daily.useQuery({ date: new Date().toISOString().slice(0, 10) });
  const { data: allTimeBoard } = trpc.leaderboard.allTime.useQuery(undefined);
  const updateProfileMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      utils.leaderboard.daily.invalidate();
      utils.leaderboard.allTime.invalidate();
      toast.success("Profile updated!");
    },
    onError: (e) => toast.error(e.message),
  });
  const checkPRsMutation = trpc.workout.checkPRs.useMutation({
    onSuccess: (data) => {
      if (data.newPRs.length > 0) {
        data.newPRs.forEach((msg) => toast.success(`🏆 PR! ${msg}`, { duration: 5000 }));
        utils.workout.getPRs.invalidate();
      }
    },
  });

  // Map setId -> PR labels for display
  const prSetMap = useMemo(() => {
    const map = new Map<number, string[]>();
    if (!prs) return map;
    for (const pr of prs) {
      if (!pr.setId) continue;
      const labels = map.get(pr.setId) ?? [];
      if (pr.recordType === "maxWeight") labels.push("Max Weight");
      if (pr.recordType === "bestSession") labels.push("Best Volume");
      if (pr.recordType === "bestRepsAtWeight") labels.push(`Best Reps @${pr.atWeight}lbs`);
      map.set(pr.setId, labels);
    }
    return map;
  }, [prs]);

  const addSetMutation = trpc.workout.addSet.useMutation({
    onSuccess: () => { utils.workout.getTodaySession.invalidate(); utils.workout.getSessions.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSetMutation = trpc.workout.deleteSet.useMutation({
    onSuccess: () => {
      utils.workout.getTodaySession.invalidate();
      utils.workout.getSessions.invalidate();
      utils.workout.getPRs.invalidate();
      utils.leaderboard.daily.invalidate();
      utils.leaderboard.allTime.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const editSetMutation = trpc.workout.editSet.useMutation({
    onSuccess: () => {
      utils.workout.getTodaySession.invalidate();
      utils.workout.getSessions.invalidate();
      utils.workout.getPRs.invalidate();
      utils.leaderboard.daily.invalidate();
      utils.leaderboard.allTime.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateGoalMutation = trpc.workout.updateGoal.useMutation({
    onSuccess: () => { utils.workout.getTodaySession.invalidate(); utils.workout.getSessions.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const resetMutation = trpc.workout.resetToday.useMutation({
    onSuccess: () => {
      utils.workout.getTodaySession.invalidate();
      utils.workout.getSessions.invalidate();
      utils.workout.getPRs.invalidate();
      utils.leaderboard.daily.invalidate();
      utils.leaderboard.allTime.invalidate();
      toast.info("Today's session cleared");
    },
    onError: (e) => toast.error(e.message),
  });

  const REP_GOAL = todayData?.goal ?? 100;
  const sets = useMemo(() => todayData?.sets ?? [], [todayData]);
  const totalReps = todayData?.totalReps ?? 0;
  const totalVolume = todayData?.totalVolume ?? 0;
  const setCount = sets.length;
  const goalAchieved = todayData?.completed ?? false;
  const todayLabel = todayData?.label ?? new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const today = new Date().toISOString().slice(0, 10);
  const pastSessions = useMemo(
    () => (allSessions ?? []).filter((s) => s.date !== today).sort((a, b) => b.date.localeCompare(a.date)),
    [allSessions, today]
  );
  const compareSession = pastSessions[0] ?? null;
  const volumeDiff = compareSession ? totalVolume - compareSession.totalVolume : null;
  const repsDiff = compareSession ? totalReps - compareSession.totalReps : null;
  const progressPct = Math.min((totalReps / REP_GOAL) * 100, 100);
  const repsRemaining = Math.max(REP_GOAL - totalReps, 0);

  // UI state
  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [newSetId, setNewSetId] = useState<number | null>(null);
  const weightRef = useRef<HTMLInputElement>(null);

  // Timer state
  const [timerDuration, setTimerDuration] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);

  // Modals
  const [showShare, setShowShare] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);
  // Sync profile state when loaded
  useEffect(() => {
    if (profile) {
      setDisplayNameInput(profile.displayName ?? user?.name ?? "");
      setLeaderboardOptIn(profile.leaderboardOptIn ?? false);
    } else if (user?.name) {
      setDisplayNameInput(user.name);
    }
  }, [profile, user]);

  const prevGoalRef = useRef(false);
  useEffect(() => {
    if (goalAchieved && !prevGoalRef.current) toast.success("🏆 Goal achieved! Incredible work!");
    prevGoalRef.current = goalAchieved;
  }, [goalAchieved]);

  const handleAddSet = useCallback(() => {
    const weight = parseFloat(weightInput);
    const reps = parseInt(repsInput, 10);
    if (!weight || weight <= 0 || isNaN(weight)) { toast.error("Enter a valid weight"); weightRef.current?.focus(); return; }
    if (!reps || reps <= 0 || isNaN(reps)) { toast.error("Enter valid reps"); return; }
    addSetMutation.mutate({ weight, reps }, {
      onSuccess: (data) => {
        setNewSetId(data?.set?.id ?? null);
        setTimeout(() => setNewSetId(null), 600);
        setTimerActive(true);
        // Check for PRs after the set is saved
        if (data?.set?.id) {
          const today = new Date().toISOString().slice(0, 10);
          checkPRsMutation.mutate({
            setId: data.set.id,
            weight,
            reps,
            sessionVolume: data.totalVolume,
            sessionDate: today,
          });
        }
      },
    });
    setWeightInput("");
    setRepsInput("");
    weightRef.current?.focus();
  }, [weightInput, repsInput, addSetMutation, checkPRsMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleAddSet(); };
  const isMutating = addSetMutation.isPending || deleteSetMutation.isPending || editSetMutation.isPending || resetMutation.isPending;
  const isLoading = todayLoading || sessionsLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Modals */}
      {showShare && (
        <ShareModal
          label={todayLabel} totalReps={totalReps} totalVolume={totalVolume}
          goal={REP_GOAL} completed={goalAchieved}
          sets={sets.map((s) => ({ weight: s.weight, reps: s.reps, volume: s.volume }))}
          onClose={() => setShowShare(false)}
        />
      )}
      {showGoalPicker && (
        <GoalPicker
          current={REP_GOAL}
          onSave={(g) => updateGoalMutation.mutate({ goal: g })}
          onClose={() => setShowGoalPicker(false)}
        />
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-base font-semibold text-foreground leading-none tracking-wide uppercase">Bench Press</h1>
                <p className="text-xs text-muted-foreground leading-none mt-0.5">Iron Lab{user?.name ? ` · ${user.name}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
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
              <button onClick={() => logout()} title="Sign out"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-400/10">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
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
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{REP_GOAL}-Rep Goal</span>
              <button onClick={() => setShowGoalPicker(true)} className="text-muted-foreground hover:text-primary transition-colors" title="Change goal">
                <Settings2 className="w-3 h-3" />
              </button>
            </div>
            <span className="font-display text-sm font-semibold text-foreground">
              {Math.round(progressPct)}%
              {repsRemaining > 0 && <span className="text-xs font-normal text-muted-foreground ml-2">{repsRemaining} to go</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: goalAchieved ? "oklch(0.68 0.18 145)" : "linear-gradient(90deg, oklch(0.65 0.18 45), oklch(0.72 0.18 45))",
                boxShadow: goalAchieved ? "0 0 12px oklch(0.68 0.18 145 / 0.5)" : "0 0 12px oklch(0.72 0.18 45 / 0.4)",
              }} />
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
                <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Today's Session</h2>
                <span className="text-xs text-muted-foreground">{todayLabel}</span>
              </div>
              <div className="flex items-center gap-3">
                {setCount > 0 && (
                  <button onClick={() => setShowShare(true)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Share2 className="w-3 h-3" /> Share
                  </button>
                )}
                {setCount > 0 && (
                  <button onClick={() => resetMutation.mutate()}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
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

            {/* Rest Timer */}
            {timerActive && (
              <RestTimer
                duration={timerDuration}
                onDone={() => { setTimerActive(false); toast.info("Rest complete — time to lift!"); }}
              />
            )}

            {/* Timer settings */}
            {!timerActive && (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTimerSettings(!showTimerSettings)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Rest: {timerDuration >= 60 ? `${Math.floor(timerDuration / 60)}m${timerDuration % 60 > 0 ? ` ${timerDuration % 60}s` : ""}` : `${timerDuration}s`}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showTimerSettings ? "rotate-180" : ""}`} />
                </button>
                {showTimerSettings && (
                  <div className="flex gap-1">
                    {TIMER_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => { setTimerDuration(opt.value); setShowTimerSettings(false); }}
                        className={`px-2 py-1 rounded text-xs font-display font-semibold transition-colors ${timerDuration === opt.value ? "bg-primary text-primary-foreground" : "bg-border text-muted-foreground hover:text-foreground"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add Set Form */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-display text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Log a Set</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Weight (lbs)</label>
                  <Input ref={weightRef} type="number" placeholder="e.g. 135" value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)} onKeyDown={handleKeyDown}
                    className="bg-input border-border text-foreground font-display text-lg h-11 placeholder:text-muted-foreground/50"
                    min="1" step="5" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Reps</label>
                  <Input type="number" placeholder="e.g. 10" value={repsInput}
                    onChange={(e) => setRepsInput(e.target.value)} onKeyDown={handleKeyDown}
                    className="bg-input border-border text-foreground font-display text-lg h-11 placeholder:text-muted-foreground/50"
                    min="1" />
                </div>
                <Button onClick={handleAddSet} disabled={isMutating}
                  className="h-11 px-5 bg-primary text-primary-foreground font-display font-semibold uppercase tracking-wide hover:bg-primary/90 active:scale-[0.96] transition-all duration-150 disabled:opacity-70">
                  {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1.5" />Add Set</>}
                </Button>
              </div>
              {weightInput && repsInput && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Volume preview: <span className="font-display font-semibold text-primary">
                    {(parseFloat(weightInput) * parseInt(repsInput, 10) || 0).toLocaleString()} lbs
                  </span>
                </div>
              )}
            </div>

            {/* Set list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
            ) : sets.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sets Logged</h3>
                  <span className="text-xs text-muted-foreground">{setCount} total · hover to edit</span>
                </div>
                {sets.map((set, i) => (
                  <SetCard
                    key={set.id}
                    id={set.id}
                    weight={set.weight}
                    reps={set.reps}
                    volume={set.volume}
                    index={i}
                    onDelete={() => deleteSetMutation.mutate({ setId: set.id })}
                    onEdit={(w, r) => editSetMutation.mutate({ setId: set.id, weight: w, reps: r })}
                    isNew={set.id === newSetId}
                    prLabels={prSetMap.get(set.id) ?? []}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Dumbbell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No sets logged yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Enter weight and reps above to get started.</p>
              </div>
            )}

            {setCount > 0 && (
              <Button variant="outline"
                className="w-full font-display font-semibold uppercase tracking-wide border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
                onClick={() => { setShowShare(true); }}>
                <Trophy className="w-4 h-4 mr-2" />
                Done for Today — Share Results
              </Button>
            )}
          </div>

          {/* ── Right: Chart + Templates + Session History ── */}
          <div className="space-y-5">
            {/* Weekly Volume Chart */}
            {(allSessions ?? []).length > 0 && (
              <WeeklyChart sessions={allSessions ?? []} />
            )}

            {/* Templates */}
            <TemplatesPanel onApplySet={(w, r) => { setWeightInput(String(w)); setRepsInput(String(r)); weightRef.current?.focus(); }} />

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Session History</h2>
            </div>

            {/* Leaderboard Panel */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <h3 className="font-display text-sm font-semibold text-foreground uppercase tracking-wide">Leaderboard</h3>
                </div>
                <button onClick={() => setShowProfile(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Settings2 className="w-3.5 h-3.5" />Settings
                </button>
              </div>

              {/* Daily Best of the Day */}
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Best of the Day</div>
                {(dailyBoard ?? []).length === 0 ? (
                  <div className="text-xs text-muted-foreground/60 italic">
                    {profile?.leaderboardOptIn ? "No one else has opted in yet. Be the first!" : "Opt in above to appear on the leaderboard."}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {(dailyBoard ?? []).slice(0, 5).map((entry, i) => (
                      <div key={entry.userId} className="flex items-center gap-2">
                        <span className={`font-display text-sm font-bold w-5 text-center ${
                          i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"
                        }`}>{i + 1}</span>
                        <span className="flex-1 text-sm text-foreground truncate">{entry.displayName ?? "Anonymous"}</span>
                        <span className="font-display text-sm font-semibold text-primary">{entry.totalVolume.toLocaleString()} lbs</span>
                        <span className="text-xs text-muted-foreground">{entry.totalReps} reps</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="bg-border/50" />

              {/* All-Time */}
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">All-Time Best Session</div>
                {(allTimeBoard ?? []).length === 0 ? (
                  <div className="text-xs text-muted-foreground/60 italic">No entries yet.</div>
                ) : (
                  <div className="space-y-1.5">
                    {(allTimeBoard ?? []).slice(0, 5).map((entry, i) => (
                      <div key={entry.userId} className="flex items-center gap-2">
                        <span className={`font-display text-sm font-bold w-5 text-center ${
                          i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"
                        }`}>{i + 1}</span>
                        <span className="flex-1 text-sm text-foreground truncate">{entry.displayName ?? "Anonymous"}</span>
                        <span className="font-display text-sm font-semibold text-primary">{entry.bestVolume.toLocaleString()} lbs</span>
                        <span className="text-xs text-muted-foreground">{entry.maxWeight} lbs max</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Profile / Leaderboard Settings Modal */}
            {showProfile && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowProfile(false)}>
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 space-y-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Profile Settings</h2>
                    <button onClick={() => setShowProfile(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground font-medium block mb-1.5 uppercase tracking-wide">Display Name</label>
                      <Input value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)}
                        placeholder="Your name on the leaderboard"
                        className="bg-input border-border text-foreground font-display h-10" />
                      <p className="text-xs text-muted-foreground/60 mt-1">Shown on the leaderboard if you opt in.</p>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                      <div>
                        <div className="text-sm font-medium text-foreground">Leaderboard Opt-In</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Show your sessions in the public rankings</div>
                      </div>
                      <button
                        onClick={() => setLeaderboardOptIn((v) => !v)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          leaderboardOptIn ? "bg-primary" : "bg-border"
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          leaderboardOptIn ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      updateProfileMutation.mutate({ displayName: displayNameInput.trim() || undefined, leaderboardOptIn });
                      setShowProfile(false);
                    }}
                    disabled={updateProfileMutation.isPending}
                    className="w-full font-display font-semibold uppercase tracking-wide bg-primary text-primary-foreground hover:bg-primary/90">
                    {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2" />Save Profile</>}
                  </Button>
                </div>
              </div>
            )}

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

            <SessionHistoryCard
              label={todayLabel} totalReps={totalReps} totalVolume={totalVolume}
              goal={REP_GOAL} completed={goalAchieved}
              sets={sets.map((s) => ({ weight: s.weight, reps: s.reps, volume: s.volume }))}
              isActive={true}
              compareReps={compareSession?.totalReps ?? null}
              compareVolume={compareSession?.totalVolume ?? null}
            />

            <Separator className="bg-border/50" />

            {isLoading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
            ) : pastSessions.length > 0 ? (
              <div className="space-y-3">
                {pastSessions.map((session, i) => (
                  <SessionHistoryCard
                    key={session.date}
                    label={session.label} totalReps={session.totalReps} totalVolume={session.totalVolume}
                    goal={session.goal} completed={session.completed}
                    sets={session.sets.map((s) => ({ weight: s.weight, reps: s.reps, volume: s.volume }))}
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
                <p className="text-xs text-muted-foreground/60 mt-1">Come back later this week to compare sessions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function Home() {
  const { data: user, isLoading: loading } = trpc.auth.me.useQuery();
  const isAuthenticated = !!user;
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
  if (!isAuthenticated) return <LoginScreen />;
  return <Tracker />;
}
