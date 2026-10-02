"use client";
import { useSyncExternalStore } from "react";

export type LoaderState = { reported: boolean; approved: boolean; acknowledged: boolean; ready: boolean; finalStopLoaded: boolean; quantity: number; reportedQuantity: number | null; reason: string; note: string };
const initial: LoaderState = { reported: false, approved: false, acknowledged: false, ready: false, finalStopLoaded: false, quantity: 4, reportedQuantity: null, reason: "Short quantity", note: "2 cases of chicken not staged at chiller bay C2. Checked C3 too." };
const initialSnapshot = JSON.stringify(initial);
const key = "waypoint-loader-session";
let memory = initialSnapshot;
const listeners = new Set<() => void>();
function snapshot() { try { return sessionStorage.getItem(key) ?? memory; } catch { return memory; } }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function updateLoaderState(patch: Partial<LoaderState>) {
  let current = initial;
  try { current = { ...initial, ...JSON.parse(snapshot()) }; } catch { /* Recover invalid saved demo data. */ }
  // Preserve submitted quantities from sessions saved before draft isolation.
  if (current.reported && current.reportedQuantity === null) current = { ...current, reportedQuantity: current.quantity };
  memory = JSON.stringify({ ...current, ...patch });
  try { sessionStorage.setItem(key, memory); } catch { /* Keep the flow usable when storage is unavailable. */ }
  listeners.forEach(listener => listener());
}
export function useLoaderState(): LoaderState {
  const saved = useSyncExternalStore(subscribe, snapshot, () => initialSnapshot);
  try { return { ...initial, ...JSON.parse(saved) }; } catch { return initial; }
}
