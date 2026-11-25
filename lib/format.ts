export type PrimePower = { prime: string; exponent: number };

/** Removes the separators the engine also ignores: spaces, underscores and commas. */
export function normalize(input: string): string {
  return input.replace(/[\s_,]/g, "");
}

/** Groups an ascending list of primes (repeated by multiplicity) into prime powers. */
export function groupPowers(primes: string[]): PrimePower[] {
  return primes.reduce<PrimePower[]>((powers, prime) => {
    const last = powers.at(-1);

    return last?.prime === prime
      ? [...powers.slice(0, -1), { prime, exponent: last.exponent + 1 }]
      : [...powers, { prime, exponent: 1 }];
  }, []);
}

export function summarize(powers: PrimePower[], unfactored: string[]): string {
  const isPrime = powers.length === 1 && powers[0].exponent === 1 && unfactored.length === 0;
  const count = `${powers.length} distinct prime factor${powers.length === 1 ? "" : "s"}`;

  if (isPrime) return "prime";

  return unfactored.length > 0 ? `${count}, plus a composite part too large to split here` : count;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(2)} s`;
}
