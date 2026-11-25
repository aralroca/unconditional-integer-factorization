import type { FactorSuccess } from "./factor-protocol";

export function summarize({ primes, exponents, unfactored }: FactorSuccess): string {
  const isPrime = primes.length === 1 && exponents[0] === 1 && unfactored.length === 0;
  const count = `${primes.length} distinct prime factor${primes.length === 1 ? "" : "s"}`;

  if (isPrime) return "prime";
  if (primes.length === 0) return "composite, could not be split here";

  return unfactored.length > 0 ? `${count}, plus a composite part that could not be split here` : count;
}

export function formatDuration(ms: number): string {
  const rounded = Math.max(1, Math.round(ms));

  return rounded < 1000 ? `${rounded} ms` : `${(ms / 1000).toFixed(2)} s`;
}
