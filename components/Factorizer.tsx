"use client";

import { useState, type FormEvent } from "react";

import type { MethodId } from "@/lib/methods";
import { useFactorizer } from "@/lib/use-factorizer";

import { Estimates } from "./Estimates";
import { FactorResult } from "./FactorResult";
import { MethodSelect } from "./MethodSelect";
import { Samples } from "./Samples";

export function Factorizer() {
  const [value, setValue] = useState("");
  const [method, setMethod] = useState<MethodId>("auto");
  const { state, start, cancel } = useFactorizer();
  const running = state.status === "running";

  // One submit button that never changes type: while running, submitting cancels.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running) cancel();
    else start(value, method);
  }

  function pick(sample: string) {
    setValue(sample);
    start(sample, method);
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
      <MethodSelect value={method} disabled={running} onChange={setMethod} />
      <Samples disabled={running} onPick={pick} />
      <FactorResult state={state} />
      <Estimates input={value} method={method} />
    </section>
  );
}
