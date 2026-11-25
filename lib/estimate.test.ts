import { describe, expect, it } from "vitest";

import { estimateCosts, type Estimate } from "./estimate";

const RSA_100 =
  1522605027922533360535618378132637429718068114961380688657908494580122963258952897654000350692006139n;

function byId(estimates: Estimate[]) {
  return Object.fromEntries(estimates.map((e) => [e.id, e.log10]));
}

describe("estimateCosts", () => {
  it("lists every method, including the Number Field Sieve and Google's algorithm", () => {
    expect(estimateCosts(RSA_100).map((e) => e.id)).toEqual(["trial", "rho", "pm1", "ecm", "siqs", "nfs", "google"]);
  });

  it("ranks the methods for a 100-digit semiprime the way the literature does", () => {
    const cost = byId(estimateCosts(RSA_100));

    expect(cost.siqs).toBeLessThan(cost.rho!);
    expect(cost.rho).toBeLessThan(cost.trial!);
    expect(cost.nfs).toBeLessThan(cost.trial!);
    expect(cost.google).toBeGreaterThan(cost.trial!);
    expect(Math.round(cost.siqs!)).toBe(15);
    expect(Math.round(cost.google!)).toBe(861);
  });

  it("has no estimate for P−1, which depends on p − 1", () => {
    expect(byId(estimateCosts(RSA_100)).pm1).toBeNull();
  });

  it("stays finite and non-negative for tiny numbers", () => {
    const values = estimateCosts(6n).map((e) => e.log10).filter((v) => v !== null);

    expect(values.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
  });
});
