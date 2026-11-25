import { useEffect, useRef, useState } from "react";

import type { FactorResponse } from "./factor-protocol";

export type FactorState =
  | { status: "idle" }
  | { status: "running"; input: string }
  | { status: "done"; input: string; response: FactorResponse };

const LOAD_ERROR = "The factoring engine could not start in this browser.";

/** Runs each factorization in a fresh Web Worker so it can be cancelled at any time. */
export function useFactorizer() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<FactorState>({ status: "idle" });

  useEffect(function terminateWorkerOnUnmount() {
    return () => workerRef.current?.terminate();
  }, []);

  function stop() {
    workerRef.current?.terminate();
    workerRef.current = null;
  }

  function finish(input: string, response: FactorResponse) {
    stop();
    setState({ status: "done", input, response });
  }

  function start(input: string) {
    const worker = new Worker(new URL("../workers/factor.worker.ts", import.meta.url), { type: "module" });

    stop();
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<FactorResponse>) => finish(input, event.data);
    worker.onerror = () => finish(input, { ok: false, error: LOAD_ERROR });
    worker.postMessage({ input });
    setState({ status: "running", input });
  }

  function cancel() {
    stop();
    setState({ status: "idle" });
  }

  return { state, start, cancel };
}
