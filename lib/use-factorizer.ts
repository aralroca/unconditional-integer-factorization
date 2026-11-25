import { useEffect, useRef, useState } from "react";

import type { FactorFailure, FactorResponse } from "./factor-protocol";

export type FactorState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; response: FactorResponse };

const START_FAILURE: FactorFailure = { ok: false, error: "The factoring engine could not start in this browser." };

/**
 * Keeps one warm Web Worker with the WebAssembly engine loaded. Cancelling terminates
 * it (the only way to stop synchronous WebAssembly) and starts a fresh one; a worker
 * that failed to load or crashed is dropped and recreated on the next run.
 */
export function useFactorizer() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<FactorState>({ status: "idle" });

  useEffect(function keepWorkerWarm() {
    workerRef.current = spawn();

    return discard;
  }, []);

  function spawn() {
    const worker = new Worker(new URL("../workers/factor.worker.ts", import.meta.url), { type: "module" });

    worker.onmessage = (event: MessageEvent<FactorResponse>) => receive(event.data);
    worker.onerror = () => {
      discard();
      setState((current) => (current.status === "running" ? { status: "done", response: START_FAILURE } : current));
    };

    return worker;
  }

  function discard() {
    workerRef.current?.terminate();
    workerRef.current = null;
  }

  function receive(response: FactorResponse) {
    if (!response.ok && response.restart) discard();
    setState({ status: "done", response });
  }

  function start(input: string) {
    workerRef.current ??= spawn();
    workerRef.current.postMessage({ input });
    setState({ status: "running" });
  }

  function cancel() {
    discard();
    workerRef.current = spawn();
    setState({ status: "idle" });
  }

  return { state, start, cancel };
}
