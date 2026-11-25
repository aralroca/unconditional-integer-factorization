"use client";

import { useState, type FormEvent } from "react";

import { useFactorizer } from "@/lib/use-factorizer";

import { FactorResult } from "./FactorResult";

const SAMPLES = [
  { label: "2^67 − 1", value: "147573952589676412927" },
  { label: "a 39-digit semiprime", value: "300000000000000438880000000000084056037" },
  { label: "600851475143", value: "600851475143" },
];

export function Factorizer() {
  const [value, setValue] = useState("");
  const { state, start, cancel } = useFactorizer();
  const running = state.status === "running";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    start(value);
  }

  function trySample(sample: string) {
    setValue(sample);
    start(sample);
  }

  return (
    <section aria-label="Factorize a number">
      <form className="factor-form" onSubmit={submit}>
        <input
          className="factor-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          aria-label="Integer to factorize"
          placeholder="Any positive integer"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        {/* Distinct keys: reusing one <button> lets the click on Cancel submit the form. */}
        {running ? (
          <button key="cancel" className="factor-button" type="button" onClick={cancel}>
            Cancel
          </button>
        ) : (
          <button key="factorize" className="factor-button" type="submit">
            Factorize
          </button>
        )}
      </form>
      <p className="samples">
        Try:
        {SAMPLES.map((sample) => (
          <button key={sample.value} type="button" className="sample" onClick={() => trySample(sample.value)}>
            {sample.label}
          </button>
        ))}
      </p>
      <FactorResult state={state} />
    </section>
  );
}
