import { Factorizer } from "@/components/Factorizer";
import { LFormula, PowerOfTwo } from "@/components/Formula";
import { PAPER_URL, REPO_URL } from "@/lib/site";

export default function Home() {
  return (
    <>
      <main className="page">
        <p className="eyebrow">Google Research · Cogentic · 25 Nov 2026</p>
        <h1>
          Unconditional integer factorization in time <LFormula constant="O(1)" />
        </h1>
        <p className="lead">
          Paste a number. Rust compiled to WebAssembly factors it in your browser. Nothing leaves your
          machine.
        </p>
        <Factorizer />
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
        <LFormula constant="105" />, with an explicit constant and no unproven assumptions: the same
        exponent as the Number Field Sieve, now with a full proof.
      </p>
      <p className="muted">
        It is a theory result, not a faster method. The constant 105 is huge (the sieve runs at about
        1.9), and for every number below <PowerOfTwo exponent={10000} /> the algorithm itself falls back
        to trial division. This page uses practical methods instead: Pollard rho, P−1, ECM and the
        quadratic sieve, up to 512 bits. Larger numbers only lose their prime factors below 16384, and
        what is left is checked for primality.
      </p>
      <p>
        <a href={PAPER_URL}>Read the paper</a>
      </p>
    </section>
  );
}
