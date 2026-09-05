import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

/** Hash password pakai scrypt bawaan Node (tanpa dependency tambahan). */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const storedHash = Buffer.from(hashHex, "hex");
  const derivedKey = (await scryptAsync(
    plain,
    salt,
    storedHash.length,
  )) as Buffer;

  if (derivedKey.length !== storedHash.length) return false;
  return timingSafeEqual(derivedKey, storedHash);
}
