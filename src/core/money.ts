/**
 * Para çekirdeği.
 *
 * TEMEL KURAL: Bütün para değerleri KURUŞ cinsinden tam sayı (integer) tutulur.
 * 1 TL = 100 kuruş. Kayan nokta (float) HİÇBİR ZAMAN para için kullanılmaz.
 * Float yalnızca kullanıcı girişini kuruşa çevirirken sınırda kullanılır.
 */

/** Kuruş cinsinden tam sayı para değeri. */
export type Kurus = number;

/** Lira (float) girdisini kuruşa çevirir. Yalnızca giriş sınırında kullanılır. */
export function liraToKurus(lira: number): Kurus {
  return Math.round(lira * 100);
}

/** Kuruşu lira sayısına çevirir (yalnızca dış API/gösterim ihtiyacı için). */
export function kurusToLira(k: Kurus): number {
  return Math.trunc(k) / 100;
}

/**
 * Türkçe biçimli tutar metnini kuruşa çevirir.
 * Kabul edilen örnekler: "12.450,00", "845,40", "1250", "-100,50", "₺2.000"
 * "." binlik ayıracı, "," ondalık ayıraç olarak kabul edilir.
 * Geçersizse null döner.
 */
export function parseAmountToKurus(input: string | number | null | undefined): Kurus | null {
  if (input === null || input === undefined) return null;
  let s = String(input).trim().replace(/₺/g, '').replace(/\s/g, '');
  if (s === '') return null;

  let negative = false;
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  s = s.replace(/\./g, ''); // binlik ayıraçlarını kaldır
  s = s.replace(',', '.'); // ondalık virgülü noktaya çevir (yalnızca ilk virgül)

  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;

  const [intPart, decPartRaw = ''] = s.split('.');
  const decPart = (decPartRaw + '00').slice(0, 2);
  const kurus = parseInt(intPart, 10) * 100 + parseInt(decPart, 10);
  return negative ? -kurus : kurus;
}

/** Kuruşu grup ayıraçlı Türkçe biçime çevirir (simge yok): 1245000 -> "12.450,00" */
export function formatKurus(k: Kurus): string {
  const value = Math.trunc(k);
  const neg = value < 0;
  const abs = Math.abs(value);
  const lira = Math.trunc(abs / 100);
  const kr = abs % 100;
  const liraStr = new Intl.NumberFormat('tr-TR').format(lira);
  const krStr = kr.toString().padStart(2, '0');
  return (neg ? '-' : '') + liraStr + ',' + krStr;
}

/** Kuruşu ₺ simgesiyle biçimlendirir: 1245000 -> "₺12.450,00", -10000 -> "-₺100,00" */
export function formatMoney(k: Kurus): string {
  const value = Math.trunc(k);
  const neg = value < 0;
  return (neg ? '-' : '') + '₺' + formatKurus(Math.abs(value));
}

/** İşaretli biçim: pozitifse "+₺..", negatifse "-₺..". Nakit akışı gösterimi için. */
export function formatSigned(k: Kurus): string {
  const value = Math.trunc(k);
  if (value > 0) return '+₺' + formatKurus(value);
  if (value < 0) return '-₺' + formatKurus(Math.abs(value));
  return '₺' + formatKurus(0);
}

/** Kuruş toplamı (güvenli). */
export function sumK(values: Kurus[]): Kurus {
  let total = 0;
  for (const v of values) total += Math.trunc(v);
  return total;
}

/**
 * Bir tutarın yüzdesini kuruş olarak hesaplar (tam sayı, aşağı yuvarlanır).
 * Örn: %10 of 500000 -> 50000
 */
export function percentAmountK(amountK: Kurus, percent: number): Kurus {
  if (percent <= 0) return 0;
  return Math.floor((Math.trunc(amountK) * percent) / 100);
}

/**
 * Kullanım/ilerleme yüzdesi. whole=0 ise 0 döner (sıfıra bölme yok).
 * 0–100 arasına sınırlamak isteğe bağlıdır; ham yüzde döner.
 */
export function ratioPercent(partK: Kurus, wholeK: Kurus): number {
  if (wholeK === 0) return 0;
  return (Math.trunc(partK) / Math.trunc(wholeK)) * 100;
}

/** Değeri [min, max] aralığına sıkıştırır. */
export function clampK(value: Kurus, min: Kurus, max: Kurus): Kurus {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}
