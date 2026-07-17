// A tiny, dependency-free ZIP writer used to bulk-download selected photos.
// Files are stored uncompressed (method 0) — the photos are already JPEG, so
// compression would add cost for no gain — which keeps this to a CRC32 plus the
// ZIP local/central headers. Runs entirely in the browser.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Build a ZIP (STORE) blob from named byte arrays. Names must be ASCII.
function buildZip(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // local file header signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(8, 0, true); // method: store
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true); // compressed size
    lv.setUint32(22, size, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    parts.push(local, f.data);

    const cen = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true); // central dir signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(10, 0, true); // method: store
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true); // offset of local header
    cen.set(nameBytes, 46);
    central.push(cen);

    offset += local.length + size;
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // end of central dir signature
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true); // central dir offset
  central.push(eocd);

  return new Blob([...parts, ...central] as BlobPart[], { type: "application/zip" });
}

// Fetch each photo and package them into a single ZIP download. Unreachable
// photos are skipped; duplicate names get a numeric suffix. Returns how many
// files made it into the archive.
export async function downloadPhotosZip(
  items: { url: string; name: string }[],
  zipName: string
): Promise<number> {
  const files: { name: string; data: Uint8Array }[] = [];
  const used = new Set<string>();
  for (const it of items) {
    let data: Uint8Array;
    try {
      const res = await fetch(it.url);
      if (!res.ok) continue;
      data = new Uint8Array(await res.arrayBuffer());
    } catch {
      continue;
    }
    let name = it.name;
    let i = 1;
    while (used.has(name)) {
      name = it.name.replace(/(\.[^.]+)?$/, `-${i}$1`);
      i++;
    }
    used.add(name);
    files.push({ name, data });
  }
  if (files.length === 0) return 0;

  const blob = buildZip(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return files.length;
}
