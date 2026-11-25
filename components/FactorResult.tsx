import { formatDuration, groupPowers, normalize, summarize } from "@/lib/format";
import type { FactorState } from "@/lib/use-factorizer";

export function FactorResult({ state }: { state: FactorState }) {
  if (state.status === "idle") return null;

  if (state.status === "running") {
    return (
      <p className="result-note" role="status">
        Factoring… the page stays responsive; press Cancel to stop.
      </p>
    );
  }

  if (!state.response.ok) {
    return (
      <p className="result-error" role="alert">
        {state.response.error}
      </p>
    );
  }

  return <Factorization input={normalize(state.input)} {...state.response} />;
}

type FactorizationProps = { input: string; primes: string[]; unfactored: string[]; ms: number };

function Factorization({ input, primes, unfactored, ms }: FactorizationProps) {
  const powers = groupPowers(primes);
  const terms = [
    ...powers.map(({ prime, exponent }) => <Power key={prime} prime={prime} exponent={exponent} />),
    ...unfactored.map((part) => <span key={part} className="unfactored">{part}</span>),
  ];

  return (
    <div className="result" role="status">
      <p className="result-value" data-testid="factorization">
        {input} = {terms.flatMap((term, index) => (index === 0 ? [term] : [" × ", term]))}
      </p>
      <p className="result-note">
        {summarize(powers, unfactored)} · {formatDuration(ms)}
      </p>
    </div>
  );
}

function Power({ prime, exponent }: { prime: string; exponent: number }) {
  return (
    <span>
      {prime}
      {exponent > 1 && <sup>{exponent}</sup>}
    </span>
  );
}
