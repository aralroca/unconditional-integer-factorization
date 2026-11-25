import type { FactorSuccess } from "./factor-protocol";

export function summarize({ primes, exponents, unfactored }: FactorSuccess): string {
  const isPrime = primes.length === 1 && exponents[0] === 1 && unfactored.length === 0;
  const count = `${primes.length} distinct prime factor${primes.length === 1 ? "" : "s"}`;

  if (isPrime) return "prime";

  return unfactored.length > 0 ? `${count}, plus a composite part too large to split here` : count;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(2)} s`;
}
