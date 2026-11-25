#!/bin/sh
# Serves the static export in out/ under the GitHub Pages base path given as $1,
# e.g. `sh scripts/serve-static.sh /unconditional-integer-factorization` serves
# http://127.0.0.1:4173/unconditional-integer-factorization/
set -eu
cd "$(dirname "$0")/.."

mkdir -p ".serve$(dirname "$1")"
ln -sfn "$PWD/out" ".serve$1"
exec python3 -m http.server 4173 --bind 127.0.0.1 --directory .serve
