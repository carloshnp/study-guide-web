#!/usr/bin/env bash
# Regenerates the installable-app icons in public/pwa from pwa-src/*.svg (needs rsvg-convert).
#   icon-*.png            purpose "any"      rounded corners, transparent outside
#   icon-maskable-512.png purpose "maskable" full bleed, glyph inside the 80% safe zone
#   apple-touch-icon.png  iOS home screen    full bleed (iOS rounds it itself)
set -euo pipefail
cd "$(dirname "$0")/.."
out=public/pwa
mkdir -p "$out"
rsvg-convert -w 192 -h 192 pwa-src/icon.svg -o "$out/icon-192.png"
rsvg-convert -w 512 -h 512 pwa-src/icon.svg -o "$out/icon-512.png"
rsvg-convert -w 512 -h 512 pwa-src/icon-maskable.svg -o "$out/icon-maskable-512.png"
rsvg-convert -w 180 -h 180 pwa-src/icon-maskable.svg -o "$out/apple-touch-icon.png"
