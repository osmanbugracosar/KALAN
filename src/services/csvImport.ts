/**
 * CSV içe aktarma yardımcıları (saf; test edilebilir).
 * Kalan'ın kendi dışa aktardığı biçimi (noktalı virgül) ve basit şablonları destekler.
 */

import { liraToKurus } from '../core/money';

/** Metni satır/sütun matrisine ayırır. Ayraç otomatik (; veya ,). Tırnak ve CRLF desteklenir. */
export function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  // İlk veri satırındaki ayraç sayısına göre ; veya , seç
  const firstLine = clean.split(/\r?\n/)[0] ?? '';
  const delim = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delim) { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch === '\r') { /* yoksay */ }
      else field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** "1.234,56" / "-123,45" / "1234.56" -> kuruş. Başarısızsa null. */
export function parseTrAmount(s: string): number | null {
  let t = s.trim().replace(/[₺\s]/g, '');
  if (!t) return null;
  const neg = t.startsWith('-');
  t = t.replace(/^-/, '');
  if (t.includes(',')) {
    // Türkçe: nokta binlik, virgül ondalık
    t = t.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(t);
  if (!isFinite(n)) return null;
  const k = liraToKurus(n);
  return neg ? -k : k;
}

/** "GG.AA.YYYY" veya "YYYY-MM-DD" -> "YYYY-MM-DD". Başarısızsa null. */
export function parseFlexibleDate(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    return `${m[3]}-${mo}-${d}`;
  }
  return null;
}

export interface ColumnMap {
  date: number;
  type: number;
  amount: number;
  account: number;
  category: number;
  description: number;
}

/** Başlık satırından sütun indekslerini bulur (Türkçe başlıklar). Bulunamayan -1. */
export function detectColumns(header: string[]): ColumnMap {
  const norm = header.map((h) => h.trim().toLocaleLowerCase('tr'));
  const find = (...keys: string[]) => {
    for (let i = 0; i < norm.length; i++) if (keys.some((k) => norm[i].includes(k))) return i;
    return -1;
  };
  return {
    date: find('tarih', 'date'),
    type: find('tür', 'tur', 'type', 'işlem'),
    amount: find('tutar', 'amount', 'miktar'),
    account: find('hesap', 'account'),
    category: find('kategori', 'category'),
    description: find('açıklama', 'aciklama', 'işletme', 'isletme', 'merchant', 'not', 'description'),
  };
}

export interface ParsedImportRow {
  date: string;
  type: 'income' | 'expense';
  amount: number; // pozitif kuruş
  accountName: string | null;
  categoryName: string | null;
  description: string | null;
}

/** Matristen (başlık dahil) içe aktarılabilir satırlar üretir. */
export function toImportRows(matrix: string[][]): { rows: ParsedImportRow[]; skipped: number } {
  if (matrix.length < 2) return { rows: [], skipped: 0 };
  const cols = detectColumns(matrix[0]);
  const rows: ParsedImportRow[] = [];
  let skipped = 0;

  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i];
    const rawDate = cols.date >= 0 ? r[cols.date] ?? '' : '';
    const rawAmount = cols.amount >= 0 ? r[cols.amount] ?? '' : '';
    const date = parseFlexibleDate(rawDate);
    const amt = parseTrAmount(rawAmount);
    if (!date || amt === null || amt === 0) { skipped++; continue; }

    const typeText = (cols.type >= 0 ? r[cols.type] ?? '' : '').toLocaleLowerCase('tr');
    let type: 'income' | 'expense';
    if (typeText.includes('gelir') || typeText.includes('income')) type = 'income';
    else if (typeText.includes('gider') || typeText.includes('expense')) type = 'expense';
    else type = amt < 0 ? 'expense' : 'income'; // tür yoksa işarete bak

    rows.push({
      date,
      type,
      amount: Math.abs(amt),
      accountName: cols.account >= 0 ? (r[cols.account] ?? '').trim() || null : null,
      categoryName: cols.category >= 0 ? (r[cols.category] ?? '').trim() || null : null,
      description: cols.description >= 0 ? (r[cols.description] ?? '').trim() || null : null,
    });
  }
  return { rows, skipped };
}
