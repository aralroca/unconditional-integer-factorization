import { Factorizer } from "@/components/Factorizer";
import { LFormula, PowerOfTwo } from "@/components/Formula";
import { Strategy } from "@/components/Strategy";
import { PAPER_URL, REPO_URL } from "@/lib/site";

export default function Home() {
  return (
    <>
      <main className="page">
        <p className="eyebrow">Google Research · Cogentic · 25 Nov 2026</p>
        <h1>
          Unconditional integer factorization in time <LFormula alpha="1/3" constant="O(1)" />
        </h1>
        <p className="lead">
          Paste a number. Rust compiled to WebAssembly factors it in your browser. Nothing leaves your
          machine.
        </p>
        <Factorizer />
        <Strategy />
        <About />
      </main>
      <footer className="footer">
        <span>Paper CC-BY-4.0, Cai, Gupta, Jiang, Liaw, Mehta, Velegkas &amp; Wang</span>
        <a href={REPO_URL}>Source on GitHub</a>
      </footer>
    </>
  );
}

function About() {
  return (
    <section className="about" aria-labelledby="about-title">
      <h2 id="about-title">About the paper</h2>
      <p>
        Google&apos;s Cogentic agent proved that every integer can be factored in expected time{" "}
        <LFormula alpha="1/3" constant="105" />, with an explicit constant and no unproven assumptions: the same
        exponent as the Number Field Sieve, now with a full proof.
      </p>
      <p className="muted">
        It is a theory result, not a faster method. The constant 105 is huge (the sieve runs at about
        1.9), and for every number below <PowerOfTwo exponent={10000} /> the algorithm itself falls back
        to trial division, so this page uses the practical methods in the table above instead.
      </p>
      <p>
        <a href={PAPER_URL}>Read the paper</a>
      </p>
    </section>
  );
}
