// The cross-tab wire for the idle timer.
//
// Two messages only: "activity" carries the stamp of a keystroke or click in
// one tab, so every other tab resets its own clock; "timeout" says one tab has
// already signed the browser out, so the others stop waiting and leave for
// /login instead of showing a warning nobody can answer.
//
// WHY NO storage-EVENT FALLBACK. BroadcastChannel has been in every shipping
// browser since Safari 15.4 (March 2022), and the failure mode without it is
// not a broken feature: each tab simply keeps its own clock, so the timeout
// still works, it just is not shared. A localStorage fallback would buy that
// one case a second code path to keep correct, and localStorage writes are
// synchronous on the main thread — a worse trade for a listener that fires on
// user input. The guard below means an old browser degrades quietly.

export const IDLE_CHANNEL_NAME = "tekguyz-idle";

export type IdleMessage = { type: "activity"; at: number } | { type: "timeout" };

export type IdleChannel = {
  post: (message: IdleMessage) => void;
  close: () => void;
};

export function openIdleChannel(onMessage: (message: IdleMessage) => void): IdleChannel {
  if (typeof BroadcastChannel === "undefined") {
    return { post: () => {}, close: () => {} };
  }

  const channel = new BroadcastChannel(IDLE_CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<IdleMessage>) => onMessage(event.data);

  return {
    // A BroadcastChannel never delivers to the tab that posted, so there is no
    // echo to filter out here.
    post: (message) => channel.postMessage(message),
    close: () => channel.close(),
  };
}
