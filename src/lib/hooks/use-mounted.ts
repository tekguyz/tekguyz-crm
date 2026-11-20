import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False on the server and during hydration, true on the client afterwards.
// Lets a component render a neutral state first so the server and client
// markup match, without a setState-in-effect.
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
