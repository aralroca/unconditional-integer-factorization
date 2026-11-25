import { useEffect, useRef, useState } from "react";

import type { FactorFailure, FactorResponse, WorkerMessage } from "./factor-protocol";
import { BASE_PATH } from "./site";

export type FactorState =
  | { status: "idle" }
  | { status: "running"; activity: string[]; ms: number }
  | { status: "done"; response: FactorResponse };

const START_FAILURE: FactorFailure = { ok: false, error: "The factoring engine could not start in this browser." };

/**
 * Keeps one warm Web Worker with the WebAssembly engine and its thread pool loaded.
 * Cancelling terminates it (the only way to stop running WebAssembly) and starts a
 * fresh one; a worker whose engine failed to load is dropped and recreated on the next run.
 */
export function useFactorizer() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<FactorState>({ status: "idle" });

  useEffect(function keepWorkerWarm() {
    workerRef.current = spawn();

    return discard;
  }, []);

  function spawn() {
    const worker = new Worker(`${BASE_PATH}/factor.worker.js`, { type: "module" });

    // A cancelled worker may still deliver queued messages: only listen to the current one.
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => whenCurrent(worker, () => receive(event.data));
    worker.onerror = () => whenCurrent(worker, failToStart);

    return worker;
  }

  function whenCurrent(worker: Worker, handle: () => void) {
    if (workerRef.current === worker) handle();
  }

  function failToStart() {
    discard();
    setState((current) => (current.status === "running" ? { status: "done", response: START_FAILURE } : current));
  }

  function discard() {
    workerRef.current?.terminate();
    workerRef.current = null;
  }

  function receive(message: WorkerMessage) {
    if (message.type === "progress") {
      setState({ status: "running", activity: message.activity, ms: message.ms });
      return;
    }
    if (!message.response.ok && message.response.restart) discard();
    setState({ status: "done", response: message.response });
  }

  function start(input: string) {
    workerRef.current ??= spawn();
    workerRef.current.postMessage({ input });
    setState({ status: "running", activity: [], ms: 0 });
  }

  function cancel() {
    discard();
    workerRef.current = spawn();
    setState({ status: "idle" });
  }

  return { state, start, cancel };
}
