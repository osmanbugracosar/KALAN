/**
 * Tarih çekirdeği.
 *
 * Saklama biçimi: yerel duvar-saati "YYYY-MM-DDTHH:mm:ss" (UTC'ye zorlanmaz).
 * Bu sayede 30.07 tarihli bir işlem, saat dilimi kayması nedeniyle 29.07'ye kaymaz.
 * Gün/ay gruplaması metnin tarih kısmından yapılır (Date ayrıştırması gerektirmez).
 */

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Şu anki yerel zaman damgası: "2026-07-30T14:30:00" */
export function nowLocalIso(): string {
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

/** Bugünün yerel tarihi: "2026-07-30" */
export function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Bir tarih ("YYYY-MM-DD") + saat ("HH:mm") -> saklama biçimi zaman damgası. */
export function toLocalIso(datePart: string, timePart = '00:00'): string {
  const t = timePart.length === 5 ? `${timePart}:00` : timePart;
  return `${datePart}T${t}`;
}

/** Saklanan zaman damgasından yerel Date nesnesi (bileşenlerden kurulur, güvenli). */
export function parseLocalIso(s: string): Date {
  const [datePart, timePart = '00:00:00'] = s.split('T');
  const [y, m, d] = datePart.split('-').map((x) => parseInt(x, 10));
  const [hh = 0, mm = 0, ss = 0] = timePart.split(':').map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d, hh, mm, ss);
}

/** "YYYY-MM-DD..." -> "30.07.2026" */
export function formatDateTR(s: string): string {
  const datePart = s.split('T')[0];
  const [y, m, d] = datePart.split('-');
  return `${d}.${m}.${y}`;
}

/** "...THH:mm:ss" -> "14:30" */
export function formatTimeTR(s: string): string {
  const timePart = s.split('T')[1] ?? '';
  const [hh = '00', mm = '00'] = timePart.split(':');
  return `${hh}:${mm}`;
}

/** "30.07.2026 14:30" */
export function formatDateTimeTR(s: string): string {
  return `${formatDateTR(s)} ${formatTimeTR(s)}`;
}

/** İşlem tarihinin ay anahtarı: "2026-07" */
export function monthKey(s: string): string {
  return s.split('T')[0].slice(0, 7);
}

/** İşlem tarihinin gün anahtarı: "2026-07-30" */
export function dayKey(s: string): string {
  return s.split('T')[0];
}

/** Şu anki ay anahtarı. */
export function currentMonthKey(): string {
  return todayLocalDate().slice(0, 7);
}

/** "2026-07" -> "Temmuz 2026" */
export function formatMonthYearTR(mKey: string): string {
  const [y, m] = mKey.split('-').map((x) => parseInt(x, 10));
  const d = new Date(y, m - 1, 1);
  const month = new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(d);
  return `${month} ${y}`;
}

/** "2026-07" -> "Tem" (kısa ay etiketi, grafikler için) */
export function shortMonthLabelTR(mKey: string): string {
  const [y, m] = mKey.split('-').map((x) => parseInt(x, 10));
  const d = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(d);
}

/** Haftanın günü adı (uzun): "Perşembe" */
export function weekdayNameTR(s: string): string {
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long' }).format(parseLocalIso(s));
}

/** Haftanın günü indeksi (0 = Pazartesi ... 6 = Pazar), Türkçe hafta düzeni. */
export function weekdayIndexMonday(s: string): number {
  const jsDay = parseLocalIso(s).getDay(); // 0 = Pazar
  return (jsDay + 6) % 7;
}

/** Son n ayın anahtar listesi (eskiden yeniye): monthsBack(6) */
export function monthsBack(n: number, from = todayLocalDate()): string[] {
  const [y, m] = from.slice(0, 7).split('-').map((x) => parseInt(x, 10));
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    keys.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  }
  return keys;
}

/** Bir aydaki gün sayısı. */
export function daysInMonth(mKey: string): number {
  const [y, m] = mKey.split('-').map((x) => parseInt(x, 10));
  return new Date(y, m, 0).getDate();
}

/** Ay içinde bugüne kadar geçen gün sayısı (gelecek aysa 0, geçmiş aysa tüm ay). */
export function daysElapsedInMonth(mKey: string, today = todayLocalDate()): number {
  const cur = today.slice(0, 7);
  if (mKey < cur) return daysInMonth(mKey);
  if (mKey > cur) return 0;
  return parseInt(today.slice(8, 10), 10);
}

/** Bir zaman damgası verilen ay anahtarına ait mi? */
export function isInMonth(s: string, mKey: string): boolean {
  return monthKey(s) === mKey;
}

/** İki gün anahtarı arası (dahil) fark, gün cinsinden. */
export function daysBetween(fromDate: string, toDate: string): number {
  const a = parseLocalIso(fromDate).getTime();
  const b = parseLocalIso(toDate).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/** Bir tarihe ("YYYY-MM-DD") gün ekler; yerel, güvenli. */
export function addDaysToDate(date: string, days: number): string {
  const d = parseLocalIso(date);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Bir tarihe ay ekler (gün, hedef ayın son gününe sıkıştırılır). */
export function addMonthsToDate(date: string, months: number): string {
  const d = parseLocalIso(date);
  const target = d.getMonth() + months;
  const y = d.getFullYear() + Math.floor(target / 12);
  const m = ((target % 12) + 12) % 12;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const day = Math.min(d.getDate(), lastDay);
  return `${y}-${pad2(m + 1)}-${pad2(day)}`;
}

/** Bir tarihe yıl ekler. */
export function addYearsToDate(date: string, years: number): string {
  return addMonthsToDate(date, years * 12);
}

/** Sıklığa göre bir sonraki vade tarihi. */
export function advanceDueDate(date: string, frequency: string, intervalDays: number | null): string {
  switch (frequency) {
    case 'weekly':
      return addDaysToDate(date, 7);
    case 'monthly':
      return addMonthsToDate(date, 1);
    case 'yearly':
      return addYearsToDate(date, 1);
    case 'custom':
      return addDaysToDate(date, intervalDays && intervalDays > 0 ? intervalDays : 30);
    case 'once':
    default:
      return date; // tek seferlik: ilerleme yok
  }
}

export type DatePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface DateRange {
  /** dahil, "YYYY-MM-DD" */
  start: string;
  /** dahil, "YYYY-MM-DD" */
  end: string;
}

/** Hazır dönemleri gün aralığına çevirir. */
export function presetToRange(preset: DatePreset, today = todayLocalDate()): DateRange {
  const d = parseLocalIso(today);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();

  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'week': {
      const idx = (d.getDay() + 6) % 7; // Pazartesi başlangıç
      const start = new Date(y, m, day - idx);
      const end = new Date(y, m, day - idx + 6);
      return { start: fmt(start), end: fmt(end) };
    }
    case 'month':
      return { start: `${y}-${pad2(m + 1)}-01`, end: `${y}-${pad2(m + 1)}-${pad2(daysInMonth(`${y}-${pad2(m + 1)}`))}` };
    case 'year':
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    case 'all':
      return { start: '0000-01-01', end: '9999-12-31' };
    case 'custom':
    default:
      return { start: today, end: today };
  }
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Zaman damgası bir gün aralığında mı (dahil)? Sözlüksel karşılaştırma güvenlidir. */
export function isInRange(s: string, range: DateRange): boolean {
  const day = dayKey(s);
  return day >= range.start && day <= range.end;
}
