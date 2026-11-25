import init, { factorize } from "../wasm/pkg/factor_wasm.js";

import type { FactorRequest, FactorResponse } from "../lib/factor-protocol";

const ready = init();

self.addEventListener("message", function answer(event: MessageEvent<FactorRequest>) {
  ready
    .then(() => self.postMessage(run(event.data.input)))
    .catch((error: unknown) => self.postMessage(failure(error)));
});

function run(input: string): FactorResponse {
  const started = performance.now();

  try {
    const result = factorize(input);
    const response = { ok: true as const, primes: result.primes, unfactored: result.unfactored };

    result.free();

    return { ...response, ms: performance.now() - started };
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown): FactorResponse {
  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}
