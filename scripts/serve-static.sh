#!/bin/sh
# Serves the static export in out/ under the GitHub Pages base path:
# http://127.0.0.1:4173/unconditional-integer-factorization/
set -eu
cd "$(dirname "$0")/.."

mkdir -p .serve
ln -sfn ../out .serve/unconditional-integer-factorization
exec python3 -m http.server 4173 --bind 127.0.0.1 --directory .serve
