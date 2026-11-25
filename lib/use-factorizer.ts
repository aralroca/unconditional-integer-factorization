import { useEffect, useRef, useState } from "react";

import type { FactorResponse } from "./factor-protocol";

export type FactorState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; response: FactorResponse };

const LOAD_ERROR = "The factoring engine could not start in this browser.";

function createWorker() {
  return new Worker(new URL("../workers/factor.worker.ts", import.meta.url), { type: "module" });
}

/**
 * Keeps one warm Web Worker with the WebAssembly engine loaded. Cancelling terminates
 * it (the only way to stop synchronous WebAssembly) and starts a fresh one.
 */
export function useFactorizer() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<FactorState>({ status: "idle" });

  useEffect(function keepWorkerWarm() {
    workerRef.current = createWorker();

    return () => workerRef.current?.terminate();
  }, []);

  function replaceWorker() {
    workerRef.current?.terminate();
    workerRef.current = createWorker();
  }

  function start(input: string) {
    const worker = workerRef.current ?? createWorker();

    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<FactorResponse>) => setState({ status: "done", response: event.data });
    worker.onerror = () => {
      replaceWorker();
      setState({ status: "done", response: { ok: false, error: LOAD_ERROR } });
    };
    worker.postMessage({ input });
    setState({ status: "running" });
  }

  function cancel() {
    replaceWorker();
    setState({ status: "idle" });
  }

  return { state, start, cancel };
}
