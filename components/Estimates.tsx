import { estimateCosts, type Estimate } from "@/lib/estimate";
import type { MethodId } from "@/lib/methods";

import styles from "./Estimates.module.css";

type EstimatesProps = { input: string; method: MethodId };

/** Estimated cost of every method for the number being typed, as a comparison. */
export function Estimates({ input, method }: EstimatesProps) {
  const n = parseInteger(input);
  const estimates = n === null ? [] : estimateCosts(n);
  const largest = Math.max(...estimates.map((e) => e.log10 ?? 0), 1);

  if (n === null) return null;

  return (
    <section className={styles.estimates} aria-labelledby="estimates-title">
      <h2 id="estimates-title">Estimated cost for this number</h2>
      <p className="muted">
        Rough worst-case operation counts (lower-order terms dropped). Each bar is the number of digits of the
        count, so a bar twice as long means the square of the work.
      </p>
      <table className={styles.table}>
        <tbody>
          {estimates.map((estimate) => (
            <Row key={estimate.id} estimate={estimate} largest={largest} selected={estimate.id === method} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

type RowProps = { estimate: Estimate; largest: number; selected: boolean };

function Row({ estimate, largest, selected }: RowProps) {
  const width = estimate.log10 === null ? 0 : (100 * estimate.log10) / largest;

  return (
    <tr className={selected ? styles.selected : undefined} aria-current={selected ? "true" : undefined}>
      <th scope="row">{estimate.label}</th>
      <td className={styles.count}>
        <Operations log10={estimate.log10} />
      </td>
      <td className={styles.barCell} aria-hidden="true">
        <span className={styles.bar} style={{ width: `${width}%` }} />
      </td>
      <td className={styles.note}>{estimate.note}</td>
    </tr>
  );
}

function Operations({ log10 }: { log10: number | null }) {
  if (log10 === null) return "—";
  if (log10 < 4) return `≈ ${Math.round(10 ** log10)}`;

  return (
    <>
      ≈ 10<sup>{Math.round(log10)}</sup>
    </>
  );
}

function parseInteger(input: string): bigint | null {
  const digits = input.replace(/[\s_,]/g, "");
  const n = /^\d+$/.test(digits) ? BigInt(digits) : 0n;

  return n >= 2n ? n : null;
}
