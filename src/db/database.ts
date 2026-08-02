/**
 * Veritabanı erişim katmanı (Tauri SQL eklentisi).
 * UI bu katmanı doğrudan kullanmaz; repository'ler üzerinden erişilir.
 */

import Database from '@tauri-apps/plugin-sql';

const DB_URL = 'sqlite:kalan.db';

let dbPromise: Promise<Database> | null = null;

/** Uygulama Tauri masaüstü ortamında mı çalışıyor? */
export function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Veritabanı bağlantısını (migration'lar uygulanmış olarak) döndürür. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

export interface ExecResult {
  rowsAffected: number;
  lastInsertId: number;
}

/** Yazma sorgusu çalıştırır, eklenen kaydın id'sini döndürür. */
export async function execute(sql: string, params: unknown[] = []): Promise<ExecResult> {
  const db = await getDb();
  const res = await db.execute(sql, params);
  return { rowsAffected: res.rowsAffected ?? 0, lastInsertId: Number(res.lastInsertId ?? 0) };
}

/** Okuma sorgusu çalıştırır. */
export async function select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, params);
}

/**
 * Birden çok yazmayı atomik yapmak için en iyi çaba transaction sarmalayıcısı.
 * Hata olursa ROLLBACK denenir. (SQLite tek bağlantılı çalıştığında tam atomik.)
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const db = await getDb();
  await db.execute('BEGIN');
  try {
    const result = await fn();
    await db.execute('COMMIT');
    return result;
  } catch (err) {
    try {
      await db.execute('ROLLBACK');
    } catch {
      /* yoksay */
    }
    throw err;
  }
}
