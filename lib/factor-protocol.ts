export type FactorRequest = { input: string };

export type FactorSuccess = {
  ok: true;
  n: string;
  primes: string[];
  exponents: number[];
  unfactored: string[];
  ms: number;
};

/** `restart` asks the page to replace the worker: its engine failed to load or crashed. */
export type FactorFailure = { ok: false; error: string; restart?: boolean };

export type FactorResponse = FactorSuccess | FactorFailure;
