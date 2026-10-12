"use client";

import { useCallback, useState } from "react";
import { messageForError } from "@/lib/api/errors";

/**
 * Minimal async-form state: run a mutation, surface error/success + busy.
 */
export function useAsyncMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<unknown>, message?: string) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await fn();
      setSuccess(message ?? "Saved");
      return true;
    } catch (caught) {
      setError(messageForError(caught));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return { busy, error, success, run, clear };
}