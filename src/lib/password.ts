import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;
const TEMP_PASSWORD_CHARS =
  "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function generateTempPassword(length = 10) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += TEMP_PASSWORD_CHARS.charAt(
      Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length)
    );
  }
  return result;
}
