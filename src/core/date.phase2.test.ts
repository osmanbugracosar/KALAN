import { describe, it, expect } from 'vitest';
import { addDaysToDate, addMonthsToDate, addYearsToDate, advanceDueDate } from './date';

describe('tarih ilerletme (Aşama 2)', () => {
  it('gün ekler', () => {
    expect(addDaysToDate('2026-01-28', 7)).toBe('2026-02-04');
    expect(addDaysToDate('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('ay ekler, gün taşmasını sıkıştırır', () => {
    expect(addMonthsToDate('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonthsToDate('2026-01-31', 1)).toBe('2026-02-28'); // Şubat sonu
    expect(addMonthsToDate('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonthsToDate('2024-01-31', 1)).toBe('2024-02-29'); // artık yıl
  });
  it('yıl ekler', () => {
    expect(addYearsToDate('2026-03-10', 1)).toBe('2027-03-10');
    expect(addYearsToDate('2024-02-29', 1)).toBe('2025-02-28');
  });
  it('sıklığa göre ilerletir', () => {
    expect(advanceDueDate('2026-01-10', 'weekly', null)).toBe('2026-01-17');
    expect(advanceDueDate('2026-01-10', 'monthly', null)).toBe('2026-02-10');
    expect(advanceDueDate('2026-01-10', 'yearly', null)).toBe('2027-01-10');
    expect(advanceDueDate('2026-01-10', 'custom', 10)).toBe('2026-01-20');
    expect(advanceDueDate('2026-01-10', 'once', null)).toBe('2026-01-10'); // ilerlemez
  });
});
