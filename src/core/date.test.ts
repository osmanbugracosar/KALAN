import { describe, it, expect } from 'vitest';
import {
  formatDateTR,
  formatTimeTR,
  formatDateTimeTR,
  monthKey,
  formatMonthYearTR,
  weekdayNameTR,
  weekdayIndexMonday,
  monthsBack,
  daysInMonth,
  daysElapsedInMonth,
  isInMonth,
  isInRange,
  presetToRange,
  daysBetween,
} from './date';

describe('tarih biçimlendirme', () => {
  it('GG.AA.YYYY biçimi', () => {
    expect(formatDateTR('2026-07-30T14:30:00')).toBe('30.07.2026');
    expect(formatDateTR('2026-01-05')).toBe('05.01.2026');
  });
  it('saat biçimi', () => {
    expect(formatTimeTR('2026-07-30T14:30:00')).toBe('14:30');
  });
  it('tarih-saat biçimi', () => {
    expect(formatDateTimeTR('2026-07-30T09:05:00')).toBe('30.07.2026 09:05');
  });
  it('ay-yıl Türkçe', () => {
    expect(formatMonthYearTR('2026-07')).toBe('Temmuz 2026');
    expect(formatMonthYearTR('2026-12')).toBe('Aralık 2026');
  });
  it('gün adı Türkçe', () => {
    expect(weekdayNameTR('2026-07-30T00:00:00')).toBe('Perşembe');
  });
});

describe('ay/gün anahtarları', () => {
  it('ay anahtarı', () => {
    expect(monthKey('2026-07-30T14:30:00')).toBe('2026-07');
  });
  it('haftanın günü indeksi (Pazartesi=0)', () => {
    // 2026-07-30 Perşembe -> 3
    expect(weekdayIndexMonday('2026-07-30T00:00:00')).toBe(3);
  });
  it('son 6 ay anahtarı', () => {
    const keys = monthsBack(6, '2026-07-15');
    expect(keys).toEqual(['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']);
  });
  it('yıl sınırını aşan geri sayım', () => {
    const keys = monthsBack(3, '2026-01-10');
    expect(keys).toEqual(['2025-11', '2025-12', '2026-01']);
  });
  it('ay gün sayısı', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2024-02')).toBe(29);
    expect(daysInMonth('2026-07')).toBe(31);
  });
  it('geçen gün sayısı', () => {
    expect(daysElapsedInMonth('2026-07', '2026-07-15')).toBe(15);
    expect(daysElapsedInMonth('2026-06', '2026-07-15')).toBe(30); // geçmiş ay
    expect(daysElapsedInMonth('2026-08', '2026-07-15')).toBe(0); // gelecek ay
  });
});

describe('aralık ve dönem', () => {
  it('ay içinde mi', () => {
    expect(isInMonth('2026-07-01T00:00:00', '2026-07')).toBe(true);
    expect(isInMonth('2026-08-01T00:00:00', '2026-07')).toBe(false);
  });
  it('bu ay dönemi doğru aralık verir', () => {
    const r = presetToRange('month', '2026-07-15');
    expect(r).toEqual({ start: '2026-07-01', end: '2026-07-31' });
  });
  it('bu hafta Pazartesi–Pazar', () => {
    // 2026-07-15 Çarşamba -> hafta 13–19
    const r = presetToRange('week', '2026-07-15');
    expect(r).toEqual({ start: '2026-07-13', end: '2026-07-19' });
  });
  it('aralık içinde mi (sözlüksel, dahil)', () => {
    const r = { start: '2026-07-01', end: '2026-07-31' };
    expect(isInRange('2026-07-31T23:59:59', r)).toBe(true);
    expect(isInRange('2026-08-01T00:00:00', r)).toBe(false);
  });
  it('gün farkı', () => {
    expect(daysBetween('2026-07-10', '2026-07-15')).toBe(5);
    expect(daysBetween('2026-07-15', '2026-07-10')).toBe(-5);
  });
});
