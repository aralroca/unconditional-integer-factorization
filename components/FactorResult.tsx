import type { FactorSuccess } from "@/lib/factor-protocol";
import { formatDuration, summarize } from "@/lib/format";
import type { FactorState } from "@/lib/use-factorizer";

export function FactorResult({ state }: { state: FactorState }) {
  if (state.status === "idle") return null;

  if (state.status === "running") return <Running activity={state.activity} ms={state.ms} />;

  if (!state.response.ok) {
    return (
      <p className="result-error" role="alert">
        {state.response.error}
      </p>
    );
  }

  return <Factorization result={state.response} />;
}

function Running({ activity, ms }: { activity: string[]; ms: number }) {
  return (
    <div className="result" role="status">
      <p className="result-note">Factoring for {formatDuration(ms)}. Press Cancel to stop.</p>
      <ul className="activity" aria-label="Running now">
        {/* One line per lane (main, then the ECM race), always in that order. */}
        {activity.map((line, lane) => (
          <li key={lane}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function Factorization({ result }: { result: FactorSuccess }) {
  const terms = [
    ...result.primes.map((prime, index) => <Power key={prime} prime={prime} exponent={result.exponents[index]} />),
    ...result.unfactored.map((part, index) => (
      <span key={part} className="unfactored">
        <Power prime={part} exponent={result.unfactoredExponents[index]} />
      </span>
    )),
  ];

  return (
    <div className="result" role="status">
      <p className="result-value" data-testid="factorization">
        {result.n} = {terms.flatMap((term, index) => (index === 0 ? [term] : [" × ", term]))}
      </p>
      <p className="result-note">
        {summarize(result)} · {formatDuration(result.ms)} on {result.threads} threads
      </p>
      <p className="result-note" data-testid="methods">
        Methods used: {result.methods.join(" → ")}
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
