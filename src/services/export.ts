/**
 * Dışa aktarma yardımcıları (saf; test edilebilir).
 * CSV, Excel'in Türkçe karakterleri doğru açması için UTF-8 BOM ile üretilir.
 */

import type { Transaction } from '../domain/types';
import { TRANSACTION_TYPE_LABELS } from '../domain/enums';
import { kurusToLira } from '../core/money';
import { formatDateTR } from '../core/date';

export interface CsvLookups {
  accountName: (id: number | null) => string;
  categoryName: (id: number | null) => string;
}

function esc(v: string): string {
  // CSV alanı kaçışı: tırnak, virgül, noktalı virgül veya yeni satır varsa tırnakla
  if (/["\n;,]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** İşlem başına işaretli tutar (lira, 2 hane, Türkçe ondalık virgülü). */
function signedLira(t: Transaction): string {
  const lira = kurusToLira(t.amount);
  let sign = '';
  if (t.type === 'income' || t.type === 'refund' || t.type === 'debt_inflow') sign = '';
  else if (t.type === 'expense' || t.type === 'debt_payment') sign = '-';
  const val = `${sign}${lira.toFixed(2)}`;
  return val.replace('.', ',');
}

/** İşlemleri noktalı virgülle ayrılmış CSV'ye çevirir (TR/Excel dostu). */
export function transactionsToCsv(rows: Transaction[], lookups: CsvLookups): string {
  const header = ['Tarih', 'Tür', 'Tutar (₺)', 'Hesap', 'Kategori', 'İşletme/Açıklama', 'Not'];
  const lines = [header.join(';')];

  for (const t of rows) {
    const cells = [
      formatDateTR(t.transaction_date),
      TRANSACTION_TYPE_LABELS[t.type] ?? t.type,
      signedLira(t),
      lookups.accountName(t.account_id),
      lookups.categoryName(t.category_id),
      t.merchant ?? t.description ?? '',
      t.note ?? '',
    ];
    lines.push(cells.map((c) => esc(String(c))).join(';'));
  }

  return '\uFEFF' + lines.join('\r\n');
}
