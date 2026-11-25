import type { MethodId } from "./methods";

export type EstimateId = Exclude<MethodId, "auto"> | "nfs";

export type Estimate = {
  id: EstimateId;
  label: string;
  /** log10 of the estimated number of operations; `null` when it does not depend on N alone. */
  log10: number | null;
  note: string;
};

/**
 * Rough worst-case operation counts for factoring `n`, from each method's running time
 * with the lower-order (o(1)) terms dropped. Good for comparing orders of magnitude only.
 */
export function estimateCosts(n: bigint): Estimate[] {
  const lnN = naturalLog(n);
  const lnP = lnN / 2; // worst case: the smallest factor is as large as √N

  return [
    estimate("trial", "Trial division", lnP / Math.LN10 - Math.log10(2), "every odd number up to √N"),
    estimate("rho", "Pollard rho", lnP / 2 / Math.LN10, "about √p steps"),
    estimate("pm1", "Pollard P−1", null, "depends on p − 1, not on N"),
    estimate("ecm", "ECM (elliptic curves)", lFunction(lnP, 1 / 2, Math.SQRT2), "Lp[1/2, √2]"),
    estimate("siqs", "Quadratic sieve (SIQS)", lFunction(lnN, 1 / 2, 1), "LN[1/2, 1]"),
    estimate("nfs", "Number Field Sieve", lFunction(lnN, 1 / 3, 1.923), "LN[1/3, 1.92]; not implemented here"),
    estimate("google", "Google's algorithm", lFunction(lnN, 1 / 3, 105), "LN[1/3, 105]; below 2^10000 it is trial division"),
  ];
}

function estimate(id: EstimateId, label: string, log10: number | null, note: string): Estimate {
  return { id, label, log10: log10 === null ? null : Math.max(0, log10), note };
}

/** ln n, from its 15 leading digits plus the count of the remaining ones. */
function naturalLog(n: bigint): number {
  const digits = n.toString();
  const leading = digits.slice(0, 15);

  return Math.log(Number(leading)) + (digits.length - leading.length) * Math.LN10;
}

/** log10 of L_x[α, c] = exp(c · (ln x)^α · (ln ln x)^(1−α)), given ln x. */
function lFunction(lnX: number, alpha: number, c: number): number {
  if (lnX <= Math.E) return 0;

  return (c * lnX ** alpha * Math.log(lnX) ** (1 - alpha)) / Math.LN10;
}
