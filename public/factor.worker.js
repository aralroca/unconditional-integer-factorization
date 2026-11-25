// Runs the WebAssembly engine on a pool of Web Workers (wasm-bindgen-rayon) and
// reports what it is doing until the factorization is ready.
// Served as a static module next to public/engine (built by scripts/build-wasm.sh).
import init, { activity, initThreadPool, methods, start, takeFailure, takeResult } from "./engine/factor_wasm.js";

const POLL_MS = 50;
const NOT_ISOLATED =
  "This browser did not enable cross-origin isolation, which multithreaded WebAssembly needs. Reload the page to try again.";
const LOAD_FAILURE = "The factoring engine could not be loaded. Check your connection and try again.";
const CRASH = { ok: false, error: "The factoring engine failed on this number.", restart: true };

const threads = navigator.hardwareConcurrency || 4;
const ready = boot();

async function boot() {
  if (!self.crossOriginIsolated) throw new Error(NOT_ISOLATED);
  await init();
  await initThreadPool(threads);
}

self.addEventListener("message", function answer(event) {
  ready.then(() => run(event.data.input)).catch(reportLoadFailure);
});

function reportLoadFailure(error) {
  const message = error instanceof Error && error.message === NOT_ISOLATED ? NOT_ISOLATED : LOAD_FAILURE;

  self.postMessage({ type: "done", response: { ok: false, error: message, restart: true } });
}

function run(input) {
  const started = performance.now();

  try {
    start(input);
  } catch (error) {
    self.postMessage({ type: "done", response: { ok: false, error: error.message ?? String(error) } });
    return;
  }
  const timer = setInterval(() => poll(timer, started), POLL_MS);
}

function poll(timer, started) {
  try {
    const response = check(performance.now() - started);

    if (!response) return;
    clearInterval(timer);
    self.postMessage({ type: "done", response });
  } catch {
    clearInterval(timer);
    self.postMessage({ type: "done", response: CRASH });
  }
}

/** The final response, or undefined (after posting progress) while still running. */
function check(ms) {
  const failure = takeFailure();
  const result = failure ? undefined : takeResult();

  if (failure) return CRASH;
  if (result) return describe(result, ms);
  self.postMessage({ type: "progress", activity: activity(), ms });

  return undefined;
}

function describe(result, ms) {
  const response = {
    ok: true,
    n: result.n,
    primes: result.primes,
    exponents: Array.from(result.exponents),
    unfactored: result.unfactored,
    methods: methods(),
    threads,
    ms,
  };

  result.free();

  return response;
}
