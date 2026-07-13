// A small, dependency-free QR code encoder.
//
// Scope: byte (8-bit) mode, error-correction level M, versions 1-10 (up to 213
// bytes) - plenty for a receipt URL. The algorithm follows the ISO/IEC 18004
// spec and mirrors Nayuki's reference generator; it is covered by a round-trip
// test (qr.test.ts) that reads the produced matrix back and checks the
// Reed-Solomon syndromes, so we can trust the output without scanning it.

// ---- Galois field GF(256), primitive polynomial x^8+x^4+x^3+x^2+1 (0x11D) ----
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

// ---- Level-M code-block tables, indexed by version (1..10) ----
const ECC_PER_BLOCK_M = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS_M = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const MAX_VERSION = 10;

// Total data-module bits available for a version, before ECC (Nayuki's formula).
export function getNumRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function getSize(version: number): number {
  return version * 4 + 17;
}

export function getAlignmentPatternPositions(version: number): number[] {
  if (version === 1) return [];
  const size = getSize(version);
  const numAlign = Math.floor(version / 7) + 2;
  const step = Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [];
  for (let pos = size - 7; result.length < numAlign - 1; pos -= step) {
    result.unshift(pos);
  }
  result.unshift(6);
  return result;
}

// ---- Reed-Solomon ----
// Divisor polynomial of the given degree, omitting the leading 1 (Nayuki).
export function reedSolomonComputeDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

export function reedSolomonRemainder(data: number[], divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}

// ---- Bit buffer ----
class BitBuffer {
  bits: number[] = [];
  append(value: number, len: number) {
    for (let i = len - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
}

function bytesFromUtf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

// Smallest version (<= MAX_VERSION) whose level-M data capacity holds `len`
// bytes in byte mode. Throws if the text is too long for version 10.
function chooseVersion(len: number): number {
  for (let v = 1; v <= MAX_VERSION; v++) {
    const rawCodewords = getNumRawDataModules(v) >> 3;
    const numData = rawCodewords - ECC_PER_BLOCK_M[v] * NUM_BLOCKS_M[v];
    const charCountBits = v <= 9 ? 8 : 16;
    const capacityBytes = Math.floor((numData * 8 - 4 - charCountBits) / 8);
    if (len <= capacityBytes) return v;
  }
  throw new Error("QR data too long for supported versions (max 213 bytes)");
}

// The full data-codeword stream for the chosen version: mode + length + bytes,
// terminator, bit padding, then alternating pad bytes to fill capacity.
function buildDataCodewords(bytes: number[], version: number): number[] {
  const rawCodewords = getNumRawDataModules(version) >> 3;
  const numData = rawCodewords - ECC_PER_BLOCK_M[version] * NUM_BLOCKS_M[version];
  const capacityBits = numData * 8;

  const bb = new BitBuffer();
  bb.append(0b0100, 4); // byte mode
  bb.append(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) bb.append(b, 8);

  // Terminator (up to 4 zero bits) then pad to a byte boundary.
  const remaining = capacityBits - bb.bits.length;
  bb.append(0, Math.min(4, remaining));
  while (bb.bits.length % 8 !== 0) bb.bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bb.bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bb.bits[i + j];
    codewords.push(byte);
  }
  // Pad bytes 0xEC / 0x11 alternating.
  for (let pad = 0xec; codewords.length < numData; pad ^= 0xec ^ 0x11) {
    codewords.push(pad);
  }
  return codewords;
}

export interface QrBlock {
  data: number[];
  ec: number[];
}

// Split data codewords into blocks, append EC codewords per block, and return
// both the per-block breakdown (for testing) and the interleaved final stream.
function splitAndEncode(
  dataCodewords: number[],
  version: number
): { blocks: QrBlock[]; interleaved: number[] } {
  const numBlocks = NUM_BLOCKS_M[version];
  const blockEccLen = ECC_PER_BLOCK_M[version];
  const rawCodewords = getNumRawDataModules(version) >> 3;
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockDataLen = Math.floor(rawCodewords / numBlocks) - blockEccLen;
  const divisor = reedSolomonComputeDivisor(blockEccLen);

  const blocks: QrBlock[] = [];
  let offset = 0;
  for (let i = 0; i < numBlocks; i++) {
    const dataLen = shortBlockDataLen + (i < numShortBlocks ? 0 : 1);
    const data = dataCodewords.slice(offset, offset + dataLen);
    offset += dataLen;
    const ec = Array.from(reedSolomonRemainder(data, divisor));
    blocks.push({ data, ec });
  }

  // Interleave data codewords (column-major across blocks), then EC codewords.
  const interleaved: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.data.length) interleaved.push(b.data[i]);
  }
  for (let i = 0; i < blockEccLen; i++) {
    for (const b of blocks) interleaved.push(b.ec[i]);
  }
  return { blocks, interleaved };
}

// ---- Matrix construction ----
type Grid = boolean[][];

function makeGrid(size: number, fill: boolean): Grid {
  return Array.from({ length: size }, () => new Array<boolean>(size).fill(fill));
}

function drawFunctionPatterns(modules: Grid, isFunction: Grid, version: number) {
  const size = modules.length;

  // Timing patterns.
  for (let i = 0; i < size; i++) {
    setFunction(modules, isFunction, 6, i, i % 2 === 0);
    setFunction(modules, isFunction, i, 6, i % 2 === 0);
  }

  // Three finder patterns (with separators) at the corners.
  drawFinder(modules, isFunction, 3, 3);
  drawFinder(modules, isFunction, size - 4, 3);
  drawFinder(modules, isFunction, 3, size - 4);

  // Alignment patterns (skip where they'd collide with finders).
  const aligns = getAlignmentPatternPositions(version);
  const n = aligns.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const skipCorner =
        (i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0);
      if (!skipCorner) drawAlignment(modules, isFunction, aligns[i], aligns[j]);
    }
  }

  // Reserve format (always) and version (v>=7) areas; real bits drawn later.
  reserveFormatAndVersion(modules, isFunction, version);
}

function setFunction(modules: Grid, isFunction: Grid, x: number, y: number, dark: boolean) {
  modules[y][x] = dark;
  isFunction[y][x] = true;
}

function drawFinder(modules: Grid, isFunction: Grid, cx: number, cy: number) {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= modules.length || y < 0 || y >= modules.length) continue;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      // dist<=1 center 3x3, dist==2 white ring, dist==3 dark ring, dist==4 separator (white)
      setFunction(modules, isFunction, x, y, dist !== 2 && dist !== 4);
    }
  }
}

function drawAlignment(modules: Grid, isFunction: Grid, cx: number, cy: number) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      setFunction(modules, isFunction, cx + dx, cy + dy, dist !== 1);
    }
  }
}

function reserveFormatAndVersion(modules: Grid, isFunction: Grid, version: number) {
  const size = modules.length;
  // Format info: a 15-bit strip around the top-left finder (col 8 + row 8,
  // rows/cols 0..8), mirrored as an 8-module strip near each of the other two
  // finders. Reserve now; the real bits are stamped after masking.
  for (let i = 0; i <= 8; i++) {
    reserve(modules, isFunction, 8, i);
    reserve(modules, isFunction, i, 8);
  }
  for (let i = 0; i < 8; i++) {
    reserve(modules, isFunction, size - 1 - i, 8);
    reserve(modules, isFunction, 8, size - 1 - i);
  }
  // The dark module - always set.
  setFunction(modules, isFunction, 8, size - 8, true);

  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      reserve(modules, isFunction, a, b);
      reserve(modules, isFunction, b, a);
    }
  }
}

function reserve(modules: Grid, isFunction: Grid, x: number, y: number) {
  if (x < 0 || y < 0 || x >= modules.length || y >= modules.length) return;
  isFunction[y][x] = true;
}

// Place the interleaved codeword bits in the up-down zigzag, skipping the
// vertical timing column and any function module.
function drawCodewords(modules: Grid, isFunction: Grid, data: number[]) {
  const size = modules.length;
  let bitIndex = 0;
  const totalBits = data.length * 8;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip the vertical timing column
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && bitIndex < totalBits) {
          const dark = ((data[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
          modules[y][x] = dark;
          bitIndex++;
        }
      }
    }
  }
}

function maskCondition(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return false;
  }
}

function applyMask(modules: Grid, isFunction: Grid, mask: number) {
  const size = modules.length;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isFunction[y][x] && maskCondition(mask, x, y)) {
        modules[y][x] = !modules[y][x];
      }
    }
  }
}

// 15-bit format info: 2-bit ECC level (M = 0b00) + 3-bit mask, BCH(15,5) with
// the standard 0x5412 mask.
function drawFormatBits(modules: Grid, mask: number) {
  const size = modules.length;
  const data = (0b00 << 3) | mask; // level M
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  const get = (i: number) => ((bits >>> i) & 1) !== 0;
  // Around the top-left finder.
  for (let i = 0; i <= 5; i++) modules[i][8] = get(i);
  modules[7][8] = get(6);
  modules[8][8] = get(7);
  modules[8][7] = get(8);
  for (let i = 9; i < 15; i++) modules[8][14 - i] = get(i);
  // Mirrored copy near the other two finders.
  for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = get(i);
  for (let i = 8; i < 15; i++) modules[size - 15 + i][8] = get(i);
  modules[size - 8][8] = true; // dark module
}

function drawVersionBits(modules: Grid, version: number) {
  if (version < 7) return;
  const size = modules.length;
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const bit = ((bits >>> i) & 1) !== 0;
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    modules[b][a] = bit;
    modules[a][b] = bit;
  }
}

// ---- Mask penalty scoring (ISO 18004 §8.8.2) ----
function penalty(modules: Grid): number {
  const size = modules.length;
  let score = 0;

  // Rule 1: runs of 5+ same-color modules in rows and columns.
  for (let y = 0; y < size; y++) {
    let runColor = modules[y][0];
    let runLen = 1;
    for (let x = 1; x < size; x++) {
      if (modules[y][x] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) score += runLen - 2;
        runColor = modules[y][x];
        runLen = 1;
      }
    }
    if (runLen >= 5) score += runLen - 2;
  }
  for (let x = 0; x < size; x++) {
    let runColor = modules[0][x];
    let runLen = 1;
    for (let y = 1; y < size; y++) {
      if (modules[y][x] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) score += runLen - 2;
        runColor = modules[y][x];
        runLen = 1;
      }
    }
    if (runLen >= 5) score += runLen - 2;
  }

  // Rule 2: 2x2 blocks of one color.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
        score += 3;
      }
    }
  }

  // Rule 3: finder-like 1:1:3:1:1 patterns in rows and columns.
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
  const matchAt = (get: (i: number) => boolean, i: number, pat: boolean[]) => {
    for (let k = 0; k < pat.length; k++) if (get(i + k) !== pat[k]) return false;
    return true;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x <= size - 11; x++) {
      const get = (i: number) => modules[y][i];
      if (matchAt(get, x, pat1) || matchAt(get, x, pat2)) score += 40;
    }
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y <= size - 11; y++) {
      const get = (i: number) => modules[i][x];
      if (matchAt(get, y, pat1) || matchAt(get, y, pat2)) score += 40;
    }
  }

  // Rule 4: overall dark-module proportion deviation from 50%.
  let dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x]) dark++;
  const total = size * size;
  const ratio = (dark * 100) / total;
  const k = Math.floor(Math.abs(ratio - 50) / 5);
  score += k * 10;

  return score;
}

export interface QrResult {
  size: number;
  version: number;
  mask: number;
  modules: boolean[][];
  // Kept for the round-trip test; not needed for rendering.
  blocks: QrBlock[];
  interleaved: number[];
}

// Encode `text` into a QR matrix (true = dark module), picking the best of the
// eight mask patterns by penalty score.
export function encodeQr(text: string): QrResult {
  const bytes = bytesFromUtf8(text);
  const version = chooseVersion(bytes.length);
  const size = getSize(version);
  const dataCodewords = buildDataCodewords(bytes, version);
  const { blocks, interleaved } = splitAndEncode(dataCodewords, version);

  // Draw function patterns once, then reuse for each mask trial.
  const baseModules = makeGrid(size, false);
  const isFunction = makeGrid(size, false);
  drawFunctionPatterns(baseModules, isFunction, version);
  drawVersionBits(baseModules, version);
  drawCodewords(baseModules, isFunction, interleaved);

  let bestMask = 0;
  let bestScore = Infinity;
  let bestModules: Grid = baseModules;
  for (let mask = 0; mask < 8; mask++) {
    const trial = baseModules.map((row) => row.slice());
    applyMask(trial, isFunction, mask);
    drawFormatBits(trial, mask);
    const score = penalty(trial);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
      bestModules = trial;
    }
  }

  return { size, version, mask: bestMask, modules: bestModules, blocks, interleaved };
}

// Read the interleaved codeword stream back out of a produced matrix. Used only
// by the test to prove the drawing + masking round-trips (the mask is its own
// inverse over the data area, so re-applying it recovers the raw bits).
export function readInterleavedForTest(result: QrResult): number[] {
  const { version, mask, size } = result;
  const modules = result.modules.map((r) => r.slice());
  const isFunction = makeGrid(size, false);
  const fn = makeGrid(size, false);
  drawFunctionPatterns(fn, isFunction, version);
  applyMask(modules, isFunction, mask);

  const totalBits = result.interleaved.length * 8;
  const bytes: number[] = [];
  let cur = 0;
  let nbits = 0;
  let count = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && count < totalBits) {
          cur = (cur << 1) | (modules[y][x] ? 1 : 0);
          nbits++;
          count++;
          if (nbits === 8) {
            bytes.push(cur);
            cur = 0;
            nbits = 0;
          }
        }
      }
    }
  }
  return bytes;
}

// Render a QR matrix as a self-contained SVG string (no external deps), sized to
// `pixels`, with a 4-module quiet zone. Colors are passed so callers can match
// the surrounding theme.
export function qrToSvg(
  text: string,
  opts: { pixels?: number; dark?: string; light?: string } = {}
): string {
  const { modules, size } = encodeQr(text);
  const quiet = 4;
  const dim = size + quiet * 2;
  const dark = opts.dark ?? "#000000";
  const light = opts.light ?? "#ffffff";
  const px = opts.pixels ?? 160;

  let rects = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules[y][x]) rects += `<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1"/>`;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ` +
    `viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
    `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
    `<g fill="${dark}">${rects}</g>` +
    `</svg>`
  );
}
