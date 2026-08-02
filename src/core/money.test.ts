import { describe, it, expect } from 'vitest';
import {
  parseAmountToKurus,
  formatKurus,
  formatMoney,
  formatSigned,
  sumK,
  percentAmountK,
  ratioPercent,
  liraToKurus,
} from './money';

describe('parseAmountToKurus', () => {
  it('Türkçe biçimli tam tutarı ayrıştırır', () => {
    expect(parseAmountToKurus('12.450,00')).toBe(1245000);
  });
  it('ondalıklı küçük tutarı ayrıştırır', () => {
    expect(parseAmountToKurus('845,40')).toBe(84540);
  });
  it('ondalıksız tam sayıyı ayrıştırır', () => {
    expect(parseAmountToKurus('1250')).toBe(125000);
  });
  it('₺ simgesi ve boşlukları yok sayar', () => {
    expect(parseAmountToKurus('₺2.000')).toBe(200000);
    expect(parseAmountToKurus(' 100,5 ')).toBe(10050);
  });
  it('negatif tutarı ayrıştırır', () => {
    expect(parseAmountToKurus('-100,50')).toBe(-10050);
  });
  it('tek haneli ondalığı 2 haneye tamamlar', () => {
    expect(parseAmountToKurus('10,5')).toBe(1050);
  });
  it('geçersiz girdilerde null döner', () => {
    expect(parseAmountToKurus('')).toBeNull();
    expect(parseAmountToKurus('abc')).toBeNull();
    expect(parseAmountToKurus('1,2,3')).toBeNull();
    expect(parseAmountToKurus(null)).toBeNull();
    expect(parseAmountToKurus(undefined)).toBeNull();
  });
});

describe('formatKurus / formatMoney', () => {
  it('grup ayıraçlı biçimlendirir', () => {
    expect(formatKurus(1245000)).toBe('12.450,00');
    expect(formatMoney(1245000)).toBe('₺12.450,00');
  });
  it('küçük tutarları biçimlendirir', () => {
    expect(formatMoney(84540)).toBe('₺845,40');
    expect(formatMoney(5)).toBe('₺0,05');
    expect(formatMoney(0)).toBe('₺0,00');
  });
  it('negatif tutarları biçimlendirir', () => {
    expect(formatMoney(-10000)).toBe('-₺100,00');
  });
  it('işaretli biçim doğru', () => {
    expect(formatSigned(5000)).toBe('+₺50,00');
    expect(formatSigned(-5000)).toBe('-₺50,00');
    expect(formatSigned(0)).toBe('₺0,00');
  });
  it('gidiş-dönüş: parse -> format tutarlı', () => {
    const k = parseAmountToKurus('9.999.999,99')!;
    expect(formatMoney(k)).toBe('₺9.999.999,99');
  });
});

describe('kuruş matematiği', () => {
  it('sumK tam sayı toplar', () => {
    expect(sumK([84540, 30000, 15000])).toBe(129540);
    expect(sumK([])).toBe(0);
  });
  it('percentAmountK aşağı yuvarlar', () => {
    expect(percentAmountK(500000, 10)).toBe(50000);
    expect(percentAmountK(33, 33)).toBe(10); // 10.89 -> 10
    expect(percentAmountK(1000, 0)).toBe(0);
  });
  it('ratioPercent sıfıra bölmede 0 döner', () => {
    expect(ratioPercent(50, 200)).toBe(25);
    expect(ratioPercent(50, 0)).toBe(0);
  });
  it('liraToKurus float girdiyi güvenli çevirir', () => {
    expect(liraToKurus(845.4)).toBe(84540);
    expect(liraToKurus(0.1 + 0.2)).toBe(30); // float hatasını yuvarlar
  });
});
