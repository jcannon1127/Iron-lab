/**
 * useHealthKit — Iron Lab HealthKit integration
 *
 * Provides:
 *  - requestPermissions(): ask for READ_WORKOUTS + WRITE_WORKOUTS
 *  - saveWorkout(params): write a strength workout to Apple Health
 *  - isAvailable: true when running on iOS native (Capacitor)
 *
 * The read path uses capacitor-health.
 * The write path calls our custom native Swift plugin (IronLabHealthPlugin)
 * which is registered in the Xcode project.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import { Health } from "capacitor-health";
import { useCallback, useEffect, useState } from "react";

// ── Custom write plugin (implemented in Swift, see ios/App/App/IronLabHealthPlugin.swift) ──
interface IronLabHealthPlugin {
  saveStrengthWorkout(options: {
    startDate: string; // ISO 8601
    endDate: string;   // ISO 8601
    totalEnergyBurned?: number; // kcal estimate
    metadata?: Record<string, string>;
  }): Promise<{ success: boolean; id?: string }>;
}

const IronLabHealth = registerPlugin<IronLabHealthPlugin>("IronLabHealth");

// ── MET-based calorie estimate for strength training ──
// MET ≈ 3.5 for moderate strength training
function estimateCalories(durationMinutes: number, weightKg = 80): number {
  const MET = 3.5;
  return Math.round((MET * weightKg * durationMinutes) / 60);
}

export interface SaveWorkoutParams {
  startDate: Date;
  endDate: Date;
  /** User's body weight in lbs (for calorie estimate). Defaults to 176 lbs / 80 kg */
  bodyWeightLbs?: number;
  /** Optional metadata to attach (e.g. totalVolume, maxWeight) */
  metadata?: Record<string, string>;
}

export function useHealthKit() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    Health.isHealthAvailable()
      .then(({ available }) => setIsAvailable(available))
      .catch(() => setIsAvailable(false));
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;
    setIsRequesting(true);
    setError(null);
    try {
      await Health.requestHealthPermissions({
        permissions: ["READ_WORKOUTS", "WRITE_WORKOUTS"],
      });
      setHasPermission(true);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Permission request failed";
      setError(msg);
      return false;
    } finally {
      setIsRequesting(false);
    }
  }, [isAvailable]);

  const saveWorkout = useCallback(
    async (params: SaveWorkoutParams): Promise<boolean> => {
      if (!isAvailable) return false;

      // Ensure permissions first
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return false;
      }

      const durationMs = params.endDate.getTime() - params.startDate.getTime();
      const durationMinutes = durationMs / 60_000;
      const bodyWeightKg = ((params.bodyWeightLbs ?? 176) * 0.453592);
      const calories = estimateCalories(durationMinutes, bodyWeightKg);

      try {
        const result = await IronLabHealth.saveStrengthWorkout({
          startDate: params.startDate.toISOString(),
          endDate: params.endDate.toISOString(),
          totalEnergyBurned: calories,
          metadata: {
            "Iron Lab": "true",
            ...params.metadata,
          },
        });
        return result.success;
      } catch (e) {
        // Plugin not yet implemented (web preview) — fail silently
        console.warn("[HealthKit] saveStrengthWorkout not available:", e);
        return false;
      }
    },
    [isAvailable, hasPermission, requestPermissions]
  );

  return {
    isAvailable,
    hasPermission,
    isRequesting,
    error,
    requestPermissions,
    saveWorkout,
  };
}
