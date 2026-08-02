import { clsx, type ClassValue } from 'clsx';

/** Sınıf adlarını birleştiren küçük yardımcı. */
export function cx(...args: ClassValue[]): string {
  return clsx(...args);
}
