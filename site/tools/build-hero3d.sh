#!/bin/sh
# Bundles site/src/hero3d.js with three.js into site/hero3d.js (one minified script, no imports),
# which site/build.py inlines into the demo and the Flask server serves at /static/hero3d.js.
# Needs Node.js. Versions are pinned so a rebuild gives the same file.
set -e
cd "$(dirname "$0")/../.."
TMP="$(mktemp -d)"
( cd "$TMP" && npm init -y >/dev/null && npm install --no-audit --no-fund three@0.160.0 esbuild@0.20.2 >/dev/null )
NODE_PATH="$TMP/node_modules" "$TMP/node_modules/.bin/esbuild" site/src/hero3d.js --bundle --minify --format=iife \
  --target=es2019 --legal-comments=none --banner:js="/* three.js r160 (MIT, three.js authors) + Aegis Ascend hero scene. Built from site/src/hero3d.js. */" \
  --outfile=site/hero3d.js
rm -rf "$TMP"
echo "wrote site/hero3d.js"
