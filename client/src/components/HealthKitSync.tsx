/**
 * HealthKitSync — Apple Health integration UI for Iron Lab
 *
 * Shows a banner/button to connect Apple Health when running on iOS.
 * Silently hidden on web/Android.
 */

import { useState } from "react";
import { Heart, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { useHealthKit } from "@/hooks/useHealthKit";

interface HealthKitSyncProps {
  /** Called after a workout is successfully saved to Health */
  onSave?: () => void;
  /** Workout params to save */
  workoutStart?: Date;
  workoutEnd?: Date;
  totalVolumeLbs?: number;
  maxWeightLbs?: number;
  totalYards?: number;
  sport?: "bench" | "swim";
  bodyWeightLbs?: number;
}

export function HealthKitBanner() {
  const { isAvailable, hasPermission, isRequesting, requestPermissions } = useHealthKit();
  const [dismissed, setDismissed] = useState(false);

  // Only show on iOS native, and only if not yet connected
  if (!isAvailable || hasPermission || dismissed) return null;

  return (
    <div className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
      <Heart className="w-5 h-5 text-red-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Connect Apple Health</p>
        <p className="text-xs text-muted-foreground">Save workouts to your Health app automatically</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 touch-target"
        >
          Later
        </button>
        <button
          onClick={requestPermissions}
          disabled={isRequesting}
          className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-2 py-1 touch-target"
        >
          {isRequesting ? "Connecting…" : "Connect"}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function HealthKitSaveButton({
  workoutStart,
  workoutEnd,
  totalVolumeLbs,
  maxWeightLbs,
  totalYards,
  sport = "bench",
  bodyWeightLbs,
  onSave,
}: HealthKitSyncProps) {
  const { isAvailable, saveWorkout } = useHealthKit();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  if (!isAvailable || !workoutStart || !workoutEnd) return null;

  async function handleSave() {
    if (!workoutStart || !workoutEnd) return;
    setStatus("saving");
    const success = await saveWorkout({
      startDate: workoutStart,
      endDate: workoutEnd,
      sport,
      bodyWeightLbs,
      metadata: {
        ...(totalVolumeLbs ? { totalVolumeLbs: String(totalVolumeLbs) } : {}),
        ...(maxWeightLbs ? { maxWeightLbs: String(maxWeightLbs) } : {}),
        ...(totalYards ? { totalYards: String(totalYards) } : {}),
      },
    });
    setStatus(success ? "saved" : "error");
    if (success) onSave?.();
    // Reset after 3s
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <button
      onClick={handleSave}
      disabled={status === "saving" || status === "saved"}
      className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border transition-all touch-target ${
        status === "saved"
          ? "border-green-500/40 bg-green-500/10 text-green-400"
          : status === "error"
          ? "border-red-500/40 bg-red-500/10 text-red-400"
          : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
      }`}
    >
      {status === "saved" ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : status === "error" ? (
        <AlertCircle className="w-3.5 h-3.5" />
      ) : (
        <Heart className="w-3.5 h-3.5" />
      )}
      {status === "saving"
        ? "Saving…"
        : status === "saved"
        ? "Saved to Health"
        : status === "error"
        ? "Save failed"
        : "Save to Health"}
    </button>
  );
}
