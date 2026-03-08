import { useSyncExternalStore } from "react";
import { getBackendHealthState, subscribeBackendHealth } from "@/lib/backendHealth";

export function useBackendHealth() {
  return useSyncExternalStore(subscribeBackendHealth, getBackendHealthState, getBackendHealthState);
}
