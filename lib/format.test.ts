import { describe, expect, it } from "vitest";

import { formatDuration, groupPowers, normalize, summarize } from "./format";

describe("normalize", () => {
  it("drops spaces, underscores and commas", () => {
    expect(normalize(" 1_000, 000 \n")).toBe("1000000");
  });
});

describe("groupPowers", () => {
  it("groups repeated primes into powers in order", () => {
    expect(groupPowers(["2", "2", "2", "5", "7", "7"])).toEqual([
      { prime: "2", exponent: 3 },
      { prime: "5", exponent: 1 },
      { prime: "7", exponent: 2 },
    ]);
  });

  it("returns nothing for no primes", () => {
    expect(groupPowers([])).toEqual([]);
  });
});

describe("summarize", () => {
  it("calls a single prime to the first power prime", () => {
    expect(summarize([{ prime: "13", exponent: 1 }], [])).toBe("prime");
  });

  it("counts distinct prime factors", () => {
    expect(summarize([{ prime: "2", exponent: 6 }], [])).toBe("1 distinct prime factor");
    expect(summarize(groupPowers(["3", "5"]), [])).toBe("2 distinct prime factors");
  });

  it("mentions a composite part that could not be split", () => {
    expect(summarize([], ["221"])).toBe("0 distinct prime factors, plus a composite part too large to split here");
  });
});

describe("formatDuration", () => {
  it("uses milliseconds below one second and seconds above", () => {
    expect(formatDuration(0.2)).toBe("1 ms");
    expect(formatDuration(240.4)).toBe("240 ms");
    expect(formatDuration(1534)).toBe("1.53 s");
  });
});
