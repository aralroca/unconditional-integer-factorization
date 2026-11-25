"use client";

import { useState, type FormEvent } from "react";

import { useFactorizer } from "@/lib/use-factorizer";

import { FactorResult } from "./FactorResult";
import { Samples } from "./Samples";

export function Factorizer() {
  const [value, setValue] = useState("");
  const { state, start, cancel } = useFactorizer();
  const running = state.status === "running";

  // One submit button that never changes type: while running, submitting cancels.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running) cancel();
    else start(value);
  }

  function pick(sample: string) {
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
        <button className="factor-button" type="submit">
          {running ? "Cancel" : "Factorize"}
        </button>
      </form>
      <Samples disabled={running} onPick={pick} />
      <FactorResult state={state} />
    </section>
  );
}
