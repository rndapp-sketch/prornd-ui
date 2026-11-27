import { useSyncExternalStore } from "react";
import { getActingState, subscribeActing, type ActingProfile } from "@/lib/actingProfile";

/** Current acting-profile state (loaded before the app renders; see bootstrapActingProfile). */
export function useActingProfile() {
  const s = useSyncExternalStore(subscribeActing, getActingState, getActingState);
  const active: ActingProfile | undefined =
    s.current !== "self" ? s.profiles.find((p) => p.id === s.current) : undefined;
  return { ...s, isActing: s.enabled && s.current !== "self", active };
}
