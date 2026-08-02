import { describe, it, expect } from 'vitest';
import { parseDelimited, parseTrAmount, parseFlexibleDate, toImportRows } from './csvImport';

describe('CSV içe aktarma yardımcıları', () => {
  it('noktalı virgüllü satırları ayırır (BOM ve tırnak dahil)', () => {
    const csv = '\uFEFFTarih;Tür;Tutar\r\n01.01.2026;Gider;"1.234,56"\r\n';
    const m = parseDelimited(csv);
    expect(m.length).toBe(2);
    expect(m[1][2]).toBe('1.234,56');
  });

  it('virgüllü dosyayı da ayırır', () => {
    const csv = 'Tarih,Tür,Tutar\n2026-01-01,Gider,100.50\n';
    const m = parseDelimited(csv);
    expect(m[1][0]).toBe('2026-01-01');
    expect(m[1][2]).toBe('100.50');
  });

  it('TR tutarı kuruşa çevirir', () => {
    expect(parseTrAmount('1.234,56')).toBe(123456);
    expect(parseTrAmount('-123,45')).toBe(-12345);
    expect(parseTrAmount('100.50')).toBe(10050);
    expect(parseTrAmount('₺ 5.000,00')).toBe(500000);
    expect(parseTrAmount('abc')).toBeNull();
  });

  it('esnek tarih ayrıştırır', () => {
    expect(parseFlexibleDate('01.02.2026')).toBe('2026-02-01');
    expect(parseFlexibleDate('2026-02-01')).toBe('2026-02-01');
    expect(parseFlexibleDate('5.3.2026')).toBe('2026-03-05');
    expect(parseFlexibleDate('boş')).toBeNull();
  });

  it('matristen içe aktarma satırları üretir; tür ve işareti çözer', () => {
    const csv = [
      'Tarih;Tür;Tutar;Hesap;Kategori;Açıklama',
      '01.01.2026;Gider;123,45;Nakit;Market;Migros',
      '05.01.2026;Gelir;5000,00;Banka;Maaş;Ocak',
      'bozuk;;;;;',
    ].join('\r\n');
    const { rows, skipped } = toImportRows(parseDelimited(csv));
    expect(rows.length).toBe(2);
    expect(skipped).toBe(1);
    expect(rows[0]).toMatchObject({ type: 'expense', amount: 12345, accountName: 'Nakit', categoryName: 'Market' });
    expect(rows[1]).toMatchObject({ type: 'income', amount: 500000, accountName: 'Banka' });
  });

  it('tür sütunu yoksa işarete göre belirler', () => {
    const csv = 'Tarih;Tutar\n01.01.2026;-50,00\n02.01.2026;200,00\n';
    const { rows } = toImportRows(parseDelimited(csv));
    expect(rows[0].type).toBe('expense');
    expect(rows[1].type).toBe('income');
  });
});
