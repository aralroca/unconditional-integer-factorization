import init, { factorize } from "../wasm/pkg/factor_wasm.js";

import type { FactorFailure, FactorRequest, FactorResponse } from "../lib/factor-protocol";

const LOAD_FAILURE: FactorFailure = {
  ok: false,
  error: "The factoring engine could not be loaded. Check your connection and try again.",
  restart: true,
};
const CRASH: FactorFailure = { ok: false, error: "The factoring engine failed on this number.", restart: true };

const ready = init().then(
  () => true,
  () => false,
);

self.addEventListener("message", function answer(event: MessageEvent<FactorRequest>) {
  ready.then((loaded) => self.postMessage(loaded ? attempt(event.data.input) : LOAD_FAILURE));
});

function attempt(input: string): FactorResponse {
  try {
    return run(input);
  } catch (error) {
    return failure(error);
  }
}

function run(input: string): FactorResponse {
  const started = performance.now();
  const result = factorize(input);
  const { n, primes, unfactored } = result;
  const exponents = Array.from(result.exponents);

  result.free();

  return { ok: true, n, primes, exponents, unfactored, ms: performance.now() - started };
}

/** Rust panics surface as WebAssembly traps; the instance may be inconsistent afterwards. */
function failure(error: unknown): FactorFailure {
  if (error instanceof WebAssembly.RuntimeError) return CRASH;

  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}
