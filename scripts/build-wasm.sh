#!/bin/sh
# Compiles crates/factor-wasm to multithreaded WebAssembly (shared memory, SIMD) and
# writes the module plus its JS bindings to public/engine, served as static files.
# Needs the toolchain pinned in crates/factor-wasm/rust-toolchain.toml (installed by
# rustup on first use) and wasm-bindgen-cli 0.2.130.
set -eu
cd "$(dirname "$0")/../crates/factor-wasm"

cargo build --release --target wasm32-unknown-unknown -Z build-std=panic_abort,std
wasm-bindgen --target web --remove-name-section --out-dir ../../public/engine \
  target/wasm32-unknown-unknown/release/factor_wasm.wasm
