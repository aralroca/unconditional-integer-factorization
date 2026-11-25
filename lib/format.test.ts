import { describe, expect, it } from "vitest";

import type { FactorSuccess } from "./factor-protocol";
import { formatDuration, summarize } from "./format";

function success(primes: string[], exponents: number[], unfactored: string[] = []): FactorSuccess {
  const unfactoredExponents = unfactored.map(() => 1);

  return { ok: true, n: "0", primes, exponents, unfactored, unfactoredExponents, methods: [], threads: 1, ms: 1 };
}

describe("summarize", () => {
  it("calls a single prime to the first power prime", () => {
    expect(summarize(success(["13"], [1]))).toBe("prime");
  });

  it("counts distinct prime factors", () => {
    expect(summarize(success(["2"], [6]))).toBe("1 distinct prime factor");
    expect(summarize(success(["3", "5"], [1, 1]))).toBe("2 distinct prime factors");
  });

  it("mentions a composite part that could not be split", () => {
    expect(summarize(success(["2"], [3], ["221"]))).toBe(
      "1 distinct prime factor, plus a composite part that could not be split here",
    );
  });

  it("describes a number that could not be split at all", () => {
    expect(summarize(success([], [], ["221"]))).toBe("composite, could not be split here");
  });
});

describe("formatDuration", () => {
  it("uses milliseconds below one second and seconds above", () => {
    expect(formatDuration(0.2)).toBe("1 ms");
    expect(formatDuration(240.4)).toBe("240 ms");
    expect(formatDuration(999.7)).toBe("1.00 s");
    expect(formatDuration(1534)).toBe("1.53 s");
  });
});
