"use client";

import { useCallback, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "denied" | "error";

// Thin wrapper over the native MediaRecorder API — no third-party recording
// library needed for a short voice-memo use case.
export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setStatus(denied ? "denied" : "error");
    }
  }, []);

  // Resolves with the recorded audio once MediaRecorder finishes flushing its
  // final chunk, instead of racing React state against the recorder's own
  // async onstop event.
  const stop = useCallback((): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return Promise.resolve(null);

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStatus("idle");
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  return { status, start, stop };
}
