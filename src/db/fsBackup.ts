/**
 * Otomatik yedekleme — yedek JSON dosyalarını kullanıcının Belgeler
 * klasörüne yazar (yalnızca masaüstü/Tauri modunda). Tarayıcı önizlemesinde
 * hiçbir şey yapmaz. Hatalar sessizce yutulur; yedekleme uygulamanın
 * açılışını asla engellemez.
 *
 * Konum:  Belgeler/Kalan/yedekler/kalan-yedek-YYYY-MM-DD-HHmm.json
 */

import { isTauriEnv } from './database';

const DIR = 'Kalan/yedekler';
const KEEP = 10; // son 10 yedek tutulur, eskiler silinir

export const BACKUP_DIR_LABEL = 'Belgeler\\Kalan\\yedekler';

/** Yedek dosya adı üretir: kalan-yedek-2026-08-02-1645.json */
export function backupFileName(iso: string): string {
  const stamp = iso.slice(0, 16).replace('T', '-').replace(':', '');
  return `kalan-yedek-${stamp}.json`;
}

/** Yedeği diske yazar ve eski yedekleri temizler. Yazılan yolu döndürür (yoksa null). */
export async function writeBackupFile(json: string, iso: string): Promise<string | null> {
  if (!isTauriEnv()) return null;
  try {
    const fs = await import('@tauri-apps/plugin-fs');
    const baseDir = fs.BaseDirectory.Document;
    await fs.mkdir(DIR, { baseDir, recursive: true });
    const name = backupFileName(iso);
    await fs.writeTextFile(`${DIR}/${name}`, json, { baseDir });
    await pruneOld();
    return `${BACKUP_DIR_LABEL}\\${name}`;
  } catch {
    return null;
  }
}

async function pruneOld(): Promise<void> {
  try {
    const fs = await import('@tauri-apps/plugin-fs');
    const baseDir = fs.BaseDirectory.Document;
    const entries = await fs.readDir(DIR, { baseDir });
    const files = entries
      .filter((e) => e.isFile && e.name.startsWith('kalan-yedek-') && e.name.endsWith('.json'))
      .map((e) => e.name)
      .sort(); // ad zaman damgalı olduğundan sözlük sırası = kronolojik sıra
    const excess = files.slice(0, Math.max(0, files.length - KEEP));
    for (const f of excess) {
      try { await fs.remove(`${DIR}/${f}`, { baseDir }); } catch { /* yoksay */ }
    }
  } catch {
    /* yoksay */
  }
}
