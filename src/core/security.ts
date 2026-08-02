/**
 * PIN güvenliği.
 * PIN düz metin olarak SAKLANMAZ. Rastgele tuz + SHA-256 ile doğrulama yapılır.
 */

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Rastgele tuz üretir (hex). */
export function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** PIN + tuzu SHA-256 ile hash'ler. */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

/** Girilen PIN doğru mu? */
export async function verifyPin(pin: string, salt: string, expectedHash: string): Promise<boolean> {
  const h = await hashPin(pin, salt);
  return h === expectedHash;
}
