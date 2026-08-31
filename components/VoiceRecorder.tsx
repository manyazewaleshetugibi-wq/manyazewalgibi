"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Trash2, Volume2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onChange: (dataUrl: string | null) => void;
  maxSeconds?: number;
}

// Voice recorder with a hard 2-minute (120s) maximum.
export function VoiceRecorder({ onChange, maxSeconds = 120 }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permState, setPermState] = useState<PermissionState | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopFnRef = useRef<() => void>(() => {});

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const finalize = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
    setElapsed(0);
  }, []);

  const buildAudio = useCallback(() => {
    if (chunksRef.current.length === 0) {
      mediaRecorderRef.current = null;
      return;
    }
    const type = chunksRef.current[0].type || "audio/webm";
    const blob = new Blob(chunksRef.current, { type });
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setAudioUrl(url);
      onChange(url);
    };
    reader.readAsDataURL(blob);
  }, [onChange]);

  const stop = useCallback(() => {
    const rec = mediaRecorderRef.current;
    finalize();
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
  }, [finalize]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice recording needs a secure (HTTPS) connection. Allow HTTPS for this site, or type the description below instead.");
      return;
    }
    try {
      // Requesting audio triggers the browser's microphone permission prompt
      // (must stay in the click handler's user-gesture context).
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Compress the recording to keep stored data small.
      // Lower bitrate = smaller base64 payload stored in the database.
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ].find((t) => MediaRecorder.isTypeSupported(t)) || 'audio/webm';
      const opts: MediaRecorderOptions = {
        mimeType,
        audioBitsPerSecond: 32000,
      };
      const rec = new MediaRecorder(stream, opts);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => buildAudio();
      rec.start();
      setRecording(true);
      setElapsed(0);
      stopFnRef.current = stop;
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= maxSeconds) {
            stopFnRef.current();
            toast({
              title: "⏱️ Time Limit Reached",
              description: `Maximum ${formatTime(maxSeconds)} voice note reached. Recording stopped.`,
              variant: "destructive",
            });
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err);
      const errName = (err as any)?.name;

      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        // Ask the browser what the permission state is so we can guide the user
        let denied = false;
        try {
          const perm = await navigator.permissions.query({ name: "microphone" as any });
          denied = perm.state === "denied";
        } catch {
          // permissions API unsupported in this browser
        }
        setError(
          denied
            ? "Microphone access is blocked. Click the padlock/lock icon in the address bar, set Microphone to Allow, then try again. Or type the description below instead."
            : "Microphone permission was not granted. When the browser asks, click Allow. If no prompt appeared, check that this page is served over HTTPS and open the site's microphone settings, then try again. Or type the description below instead."
        );
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setError("No microphone was found. Connect one and try again, or type the description below instead.");
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setError("Your microphone is busy or not responding. Close other apps using it and try again, or type the description below instead.");
      } else if (errName === "SecurityError") {
        setError("Recording was blocked by security settings. Allow microphone permission for this site and try again, or type the description below instead.");
      } else {
        setError("Could not start recording. Check your microphone and try again, or type the description below instead.");
      }
    }
  }, [maxSeconds, stop, buildAudio]);

  const clearRecording = useCallback(() => {
    setAudioUrl(null);
    setError(null);
    onChange(null);
  }, [onChange]);

  useEffect(() => {
    return () => {
      stopFnRef.current();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Show the current microphone permission state (no prompt is triggered here —
  // the actual permission ask happens inside the user gesture in start()).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (cancelled) return;
        setPermState(perm.state);
        const onChange = () => setPermState(perm.state);
        perm.addEventListener("change", onChange);
      } catch {
        // permissions API unavailable — leave status unknown
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-1.5">
      {error && <p className="text-[11px] text-red-500">{error}</p>}

      {!recording && !audioUrl && permState === "granted" && (
        <p className="text-[10px] text-green-600">✓ Microphone permission granted — ready to record</p>
      )}
      {!recording && !audioUrl && permState === "denied" && (
        <p className="text-[10px] text-red-500">Microphone is blocked. Allow it in the address bar, then reopen this window.</p>
      )}

      {!recording && !audioUrl && (
        <button
          type="button"
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <Mic className="h-3.5 w-3.5" />
          Record voice instruction (max 2 min)
        </button>
      )}

      {!recording && !audioUrl && !error && (
        <p className="text-[10px] text-gray-400">
          The browser will ask for microphone permission the first time. You can also type below instead.
        </p>
      )}

      {recording && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 dark:bg-red-950/20">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span className="text-xs font-medium text-red-600">Recording</span>
          <span className="text-xs tabular-nums text-red-600">{formatTime(elapsed)} / {formatTime(maxSeconds)}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-red-100 dark:bg-red-900/40">
            <div className="h-full bg-red-500" style={{ width: `${Math.min((elapsed / maxSeconds) * 100, 100)}%` }} />
          </div>
          <Button type="button" size="sm" variant="destructive" className="h-7 px-2 gap-1 text-[10px]" onClick={stop}>
            <Square className="h-3 w-3" />
            Stop
          </Button>
        </div>
      )}

      {audioUrl && (
        <div className="space-y-1.5 rounded-lg border border-green-200 p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-[10px] font-medium text-green-600">
              <Volume2 className="h-3 w-3" />
              ✓ Voice note recorded
            </span>
            <Button type="button" size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] gap-1 text-red-600" onClick={clearRecording}>
              <Trash2 className="h-3 w-3" />
              Remove
            </Button>
          </div>
          <audio controls src={audioUrl} className="h-9 w-full" />
        </div>
      )}
    </div>
  );
}