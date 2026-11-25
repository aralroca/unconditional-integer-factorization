# Unconditional integer factorization

Factor integers in your browser with Rust compiled to WebAssembly, next to a plain-language note on
Google's new result
[*Unconditional Integer Factorization in Time L<sub>N</sub>[1/3, O(1)]*](https://github.com/google-research/google-research/tree/master/cogentic_research_papers/integer_factorization).

**Live site:** https://aralroca.github.io/unconditional-integer-factorization/

Everything runs client-side: the page is a static export, and the number you type never leaves
your machine.

## The paper, in short

On 25 November 2026 Google Research published a set of papers produced by
[Cogentic](https://arxiv.org/abs/2609.40324), an agentic framework for mathematical discovery.
The lead result proves that every integer N ≥ 2 can be completely factored in expected time
L<sub>N</sub>[1/3, 105], where

L<sub>N</sub>[α, c] = exp(c · (ln N)<sup>α</sup> · (ln ln N)<sup>1−α</sup>),

with no unproven number-theoretic assumptions. The exponent 1/3 matches the heuristic Number Field
Sieve (NFS); the best previous rigorous bound was L<sub>N</sub>[1/2, 1] (Lenstra and Pomerance,
1992).

It is a complexity-theory milestone, not a faster algorithm:

- The constant 105 is enormous next to the NFS's ≈ 1.92, so at every practical size the proven
  algorithm is far slower than existing methods.
- The algorithm itself factors every N below 2<sup>10000</sup> by trial division
  (Definition 6.1 in the paper).

This project therefore does **not** implement the paper's algorithm. It factors numbers with the
best practical methods available in Rust and explains where the new result fits.

## How the factorizer works

1. Every input, of any size, is divided by all primes below 2<sup>14</sup>
   ([num-prime](https://github.com/uutils/num-prime)).
2. If what is left has at most 512 bits (~154 digits), it goes to
   [yamaquasi](https://github.com/remyoudompheng/yamaquasi): Pollard rho, P−1, ECM and the
   self-initialising quadratic sieve. This finishes the factorization, although semiprimes above
   ~100 digits can take a very long time.
3. A larger cofactor only gets a primality test; if it is composite it is reported as
   "too large to split here". (General-purpose splitting at that size can run for hours, and
   num-prime's splitter has no step limit.)

Every reported prime passes a Baillie–PSW test (no counterexample is known).

The engine lives in [`crates/factor-wasm`](crates/factor-wasm). It runs in a dedicated
Web Worker, so the page stays responsive and **Cancel** simply terminates the worker. The worker is
single-threaded on purpose: GitHub Pages cannot send the COOP/COEP headers that WebAssembly threads
need.

yamaquasi is used from [a fork](https://github.com/aralroca/yamaquasi/tree/wasm-web-time) with one
change: it measures time with [`web-time`](https://crates.io/crates/web-time) instead of
`std::time::Instant`, which panics on `wasm32-unknown-unknown`.

## Project structure

```
app/                  Next.js App Router page, layout and styles
components/           Factorizer form, result and MathML formulas
lib/                  worker hook, result formatting, site constants
workers/              Web Worker that loads the WebAssembly module
crates/factor-wasm/   Rust engine and its tests
scripts/              WebAssembly build and local static server
e2e/                  Playwright tests against the static export
```

## Development

Requirements: Rust (stable) with the `wasm32-unknown-unknown` target,
[`wasm-bindgen-cli`](https://crates.io/crates/wasm-bindgen-cli) 0.2.130 (it must match the
`wasm-bindgen` crate version), Node.js 24+, pnpm and Python 3 (only for the local static server).

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.130

pnpm install
pnpm build:wasm      # compile the Rust engine to wasm/pkg
pnpm dev             # http://localhost:3000/unconditional-integer-factorization/
```

## Tests

```sh
cargo test --release --manifest-path crates/factor-wasm/Cargo.toml   # engine
pnpm test                                                             # formatting helpers (Vitest)
pnpm build && pnpm test:e2e                                           # site in Chrome (Playwright)
```

The end-to-end tests serve `out/` under the same base path as GitHub Pages. Locally they use the
installed Google Chrome; on CI they use Playwright's Chromium.

## Deployment

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds and tests every pull request.
On `main` it also publishes `out/` to GitHub Pages (repository settings → Pages → Source: GitHub
Actions).

## Credits and license

- Paper: Yang Cai, Vineet Gupta, Yanchen Jiang, Christopher Liaw, Aranyak Mehta, Grigoris Velegkas
  and Di Wang (Google Research and Google DeepMind), licensed
  [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). This project is not affiliated with
  Google.
- [yamaquasi](https://github.com/remyoudompheng/yamaquasi) by Rémy Oudompheng, BSD-3-Clause.
- [num-prime](https://github.com/uutils/num-prime) and [num-bigint](https://github.com/rust-num/num-bigint).

This repository is released under the [MIT License](LICENSE).
