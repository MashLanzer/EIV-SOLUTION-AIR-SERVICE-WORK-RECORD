// Human-friendly invite codes: uppercase, no ambiguous characters (no 0/O,
// 1/I/L) so they're easy to read aloud and type. 8 chars from a 30-symbol
// alphabet is ~30^8 combinations - plenty for company invite codes.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

// Normalize user input: strip spaces/dashes, uppercase, so "abcd-1234" and
// "ABCD1234" match the stored code.
export function normalizeJoinCode(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}
