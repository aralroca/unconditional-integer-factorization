#!/bin/sh
# Compiles crates/factor-wasm to WebAssembly and writes the JS bindings and the
# .wasm binary to wasm/pkg, where the web worker imports them from.
# Needs the wasm32-unknown-unknown target and wasm-bindgen-cli 0.2.130.
set -eu
cd "$(dirname "$0")/.."

cargo build --manifest-path crates/factor-wasm/Cargo.toml --release --target wasm32-unknown-unknown
wasm-bindgen --target web --out-dir wasm/pkg \
  crates/factor-wasm/target/wasm32-unknown-unknown/release/factor_wasm.wasm
