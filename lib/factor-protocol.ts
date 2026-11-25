// Messages between the page and public/factor.worker.js.

import type { MethodId } from "./methods";

export type FactorRequest = { input: string; method: MethodId };

export type FactorSuccess = {
  ok: true;
  n: string;
  primes: string[];
  exponents: number[];
  unfactored: string[];
  /** Exponent of each composite in `unfactored`. */
  unfactoredExponents: number[];
  /** Methods the engine ran, in the order they started. */
  methods: string[];
  threads: number;
  ms: number;
};

/** `restart` asks the page to replace the worker: its engine failed to load or crashed. */
export type FactorFailure = { ok: false; error: string; restart?: boolean };

export type FactorResponse = FactorSuccess | FactorFailure;

export type WorkerMessage =
  | { type: "progress"; activity: string[]; ms: number }
  | { type: "done"; response: FactorResponse };
