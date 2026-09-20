import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function feltIcon(size) {
  const cx = (size - 1) / 2;
  const rOuter = size * 0.42;
  const rInner = size * 0.28;
  return png(size, (x, y, n) => {
    const dx = x - cx;
    const dy = y - cx;
    const d = Math.sqrt(dx * dx + dy * dy);
    const felt = 18 + Math.floor((y / n) * 22);
    if (d < rInner) return [251, 191, 36, 255];
    if (d < rOuter) return [22, 101, 52, 255];
    return [7 + felt, 22 + felt, 16 + Math.floor(felt / 2), 255];
  });
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../client/public");
mkdirSync(resolve(root, "icons"), { recursive: true });
writeFileSync(resolve(root, "icons/icon-192.png"), feltIcon(192));
writeFileSync(resolve(root, "icons/icon-512.png"), feltIcon(512));
writeFileSync(resolve(root, "apple-touch-icon.png"), feltIcon(180));
console.log("wrote PWA icons");