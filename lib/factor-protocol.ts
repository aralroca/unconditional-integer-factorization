export type FactorRequest = { input: string };

export type FactorSuccess = {
  ok: true;
  n: string;
  primes: string[];
  exponents: number[];
  unfactored: string[];
  ms: number;
};

export type FactorResponse = FactorSuccess | { ok: false; error: string };
