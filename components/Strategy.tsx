import type { ReactNode } from "react";

import { LFormula, PowerOfTwo } from "./Formula";
import styles from "./Strategy.module.css";

type Step = { method: string; when: ReactNode; cost: ReactNode };

const STEPS: Step[] = [
  {
    method: "Trial division",
    when: "Always first: divides out every prime below 16 384.",
    cost: "about 1 900 divisions",
  },
  {
    method: "Pollard P−1",
    when: "On what is left, up to 512 bits: finds a factor p when p − 1 has only small prime factors.",
    cost: "depends on p − 1, not on N",
  },
  {
    method: "ECM (elliptic curves)",
    when: "A short pretest sized to N, then, from 200 bits, racing the quadratic sieve on one thread.",
    cost: <LFormula base="p" alpha="1/2" constant="√2" />,
  },
  {
    method: "Quadratic sieve (SIQS)",
    when: "Splits what ECM did not, up to 512 bits (~154 digits), on every thread.",
    cost: <LFormula alpha="1/2" constant="1" />,
  },
  {
    method: "Baillie–PSW",
    when: "Checks every reported prime, and any cofactor above 512 bits.",
    cost: "polynomial",
  },
];

export function Strategy() {
  return (
    <section className={styles.strategy} aria-labelledby="strategy-title">
      <h2 id="strategy-title">What Auto runs, and when</h2>
      <p className="muted">
        With the method set to Auto the engine combines these steps; pick a single method above to run it on
        its own and compare. While a number is being factored the page shows what is running.
      </p>
      <div className={styles.tableBox}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Method</th>
              <th scope="col">When it runs</th>
              <th scope="col">Cost</th>
            </tr>
          </thead>
          <tbody>
            {STEPS.map((step) => (
              <tr key={step.method}>
                <th scope="row">{step.method}</th>
                <td>{step.when}</td>
                <td>{step.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <NotUsed />
    </section>
  );
}

function NotUsed() {
  return (
    <p className="muted">
      Not in Auto: the Number Field Sieve, <LFormula alpha="1/3" constant="1.92" />, is the fastest method above
      about 100 digits but a far larger program, so it is only estimated. Google&apos;s{" "}
      <LFormula alpha="1/3" constant="105" /> is slower at every practical size; you can still pick it above, and
      since every number here is below <PowerOfTwo exponent={10000} /> it runs its first step, trial division.
    </p>
  );
}
