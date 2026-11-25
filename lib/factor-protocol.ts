export type FactorRequest = { input: string };

export type FactorResponse =
  | { ok: true; primes: string[]; unfactored: string[]; ms: number }
  | { ok: false; error: string };
