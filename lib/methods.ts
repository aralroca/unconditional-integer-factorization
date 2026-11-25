/** Methods the engine can run (names match `Method::from_str` in crates/factor-wasm). */
export type MethodId = "auto" | "trial" | "rho" | "pm1" | "ecm" | "siqs" | "google";

export const METHODS: { id: MethodId; label: string }[] = [
  { id: "auto", label: "Auto: P−1, ECM and the quadratic sieve (fastest)" },
  { id: "trial", label: "Trial division" },
  { id: "rho", label: "Pollard rho" },
  { id: "pm1", label: "Pollard P−1" },
  { id: "ecm", label: "ECM (elliptic curves)" },
  { id: "siqs", label: "Quadratic sieve (SIQS)" },
  { id: "google", label: "Google's L_N[1/3, O(1)] algorithm (2026 paper)" },
];
