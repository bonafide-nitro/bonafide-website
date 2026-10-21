// Generates public/favicon.ico from the existing header logo (white wordmark) on the site's header
// colour (--ink in src/layouts/Base.astro). Local, deterministic; no new brand artwork is created.
// Usage: node scripts/build-favicon.mjs [--check]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { decode, encode } from 'fast-png';

const SOURCE = 'public/wp-content/uploads/2019/04/Bona-Fide-logo-White-color-big-tea-for-website-header-1.png';
const OUT = 'public/favicon.ico';
const BG = [0x1c, 0x17, 0x12];
const SIZES = [16, 32, 48];

const src = decode(readFileSync(SOURCE));
const { width: sw, height: sh, data, palette } = src;
const px = (x, y) => {
  const i = y * sw + x;
  const [r, g, b, a] = palette ? [...palette[data[i]]] : [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];
  return [r * a / 255, g * a / 255, b * a / 255, a / 255]; // premultiplied
};

const render = (size) => {
  const inner = size * 0.9;
  const scale = Math.min(inner / sw, inner / sh);
  const dw = sw * scale, dh = sh * scale;
  const ox = (size - dw) / 2, oy = (size - dh) / 2;
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // box-filter: average source pixels covered by this destination pixel
    const x0 = (x - ox) / scale, x1 = (x + 1 - ox) / scale, y0 = (y - oy) / scale, y1 = (y + 1 - oy) / scale;
    let r = 0, g = 0, b = 0, a = 0, wsum = 0;
    for (let sy = Math.max(0, Math.floor(y0)); sy < Math.min(sh, Math.ceil(y1)); sy++) {
      for (let sx = Math.max(0, Math.floor(x0)); sx < Math.min(sw, Math.ceil(x1)); sx++) {
        const w = (Math.min(sx + 1, x1) - Math.max(sx, x0)) * (Math.min(sy + 1, y1) - Math.max(sy, y0));
        if (w <= 0) continue;
        const p = px(sx, sy);
        r += p[0] * w; g += p[1] * w; b += p[2] * w; a += p[3] * w; wsum += w;
      }
    }
    const cover = Math.min(1, wsum / (1 / scale / scale)); // fraction of the dest pixel covered by the logo area
    const al = wsum ? (a / wsum) * cover : 0;
    const o = (y * size + x) * 4;
    out[o] = Math.round((wsum ? r / wsum : 0) * cover + BG[0] * (1 - al));
    out[o + 1] = Math.round((wsum ? g / wsum : 0) * cover + BG[1] * (1 - al));
    out[o + 2] = Math.round((wsum ? b / wsum : 0) * cover + BG[2] * (1 - al));
    out[o + 3] = 255;
  }
  return Buffer.from(encode({ width: size, height: size, data: out, channels: 4, depth: 8 }));
};

const images = SIZES.map(render);
const head = Buffer.alloc(6 + 16 * images.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
let offset = head.length;
images.forEach((png, i) => {
  const e = 6 + 16 * i;
  head[e] = SIZES[i]; head[e + 1] = SIZES[i]; head[e + 2] = 0; head[e + 3] = 0;
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(png.length, e + 8); head.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
const ico = Buffer.concat([head, ...images]);

if (process.argv.includes('--check')) {
  if (!existsSync(OUT) || !readFileSync(OUT).equals(ico)) { console.error(`${OUT} is stale; run node scripts/build-favicon.mjs`); process.exit(1); }
  console.log(`${OUT} is up to date`);
} else {
  writeFileSync(OUT, ico);
  console.log(`wrote ${OUT} (${ico.length} bytes; sizes ${SIZES.join(', ')})`);
}
