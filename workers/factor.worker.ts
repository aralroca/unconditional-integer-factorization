import init, { factorize } from "../wasm/pkg/factor_wasm.js";

import type { FactorRequest, FactorResponse } from "../lib/factor-protocol";

const ready = init();

self.addEventListener("message", function answer(event: MessageEvent<FactorRequest>) {
  ready
    .then(() => run(event.data.input))
    .catch(failure)
    .then((response) => self.postMessage(response));
});

function run(input: string): FactorResponse {
  const started = performance.now();
  const result = factorize(input);
  const { n, primes, unfactored } = result;
  const exponents = Array.from(result.exponents);

  result.free();

  return { ok: true, n, primes, exponents, unfactored, ms: performance.now() - started };
}

function failure(error: unknown): FactorResponse {
  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}
