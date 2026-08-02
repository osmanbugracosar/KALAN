import { formatMoney } from '../../core/money';

/** Kuruş -> "₺12.450,00" */
export function fmt(k: number): string {
  return formatMoney(k);
}

/** Kuruş -> düzenlenebilir metin girişi ("12450" kuruş -> "124,50") */
export function centsToInput(k: number): string {
  const lira = Math.trunc(k / 100);
  const kr = Math.abs(k % 100);
  return `${lira},${String(kr).padStart(2, '0')}`;
}

/** Ortak renk paleti (hesap/hedef/bütçe/borç seçimleri) */
export const PALETTE = ['#0E5E63', '#2563C7', '#1E8E5A', '#D9822B', '#7C3AED', '#DB2777', '#0891B2', '#CA8A04'];
