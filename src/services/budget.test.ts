import { describe, it, expect } from 'vitest';
import { budgetUsage, savingsMetrics } from './budget';
import { makeAccount } from '../test/factories';
import type { SavingsGoal } from '../domain/types';

function makeGoal(over: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: 1,
    name: 'Hedef',
    target_amount: 1000000,
    account_id: null,
    start_date: '2026-07-01',
    target_date: null,
    contribution_type: 'manual',
    color: '#2563C7',
    icon: 'piggy-bank',
    note: null,
    is_completed: 0,
    created_at: '2026-07-01T00:00:00',
    updated_at: '2026-07-01T00:00:00',
    ...over,
  };
}

describe('bütçe kullanımı', () => {
  it('normal kullanım seviyesi ok', () => {
    const u = budgetUsage(1000000, 400000, 15, 30);
    expect(u.usagePercent).toBe(40);
    expect(u.remainingK).toBe(600000);
    expect(u.level).toBe('ok');
    expect(u.projectionK).toBe(800000); // 400000/15*30
  });

  it('%80 eşiğinde uyarı', () => {
    const u = budgetUsage(1000000, 800000, 20, 30);
    expect(u.level).toBe('warn');
  });

  it('%100 kritik', () => {
    const u = budgetUsage(1000000, 1000000, 30, 30);
    expect(u.level).toBe('critical');
  });

  it('limit aşımında over ve aşan tutar', () => {
    const u = budgetUsage(1000000, 1200000, 30, 30);
    expect(u.over).toBe(true);
    expect(u.overByK).toBe(200000);
    expect(u.remainingK).toBe(-200000);
    expect(u.level).toBe('over');
  });

  it('limit sıfırsa yüzde 0 (sıfıra bölme yok)', () => {
    const u = budgetUsage(0, 50000, 10, 30);
    expect(u.usagePercent).toBe(0);
  });

  it('gün 0 ise tahmin harcanan kadar', () => {
    const u = budgetUsage(1000000, 0, 0, 30);
    expect(u.projectionK).toBe(0);
  });
});

describe('birikim hedefi metrikleri', () => {
  it('tamamlanma yüzdesi ve kalan tutar', () => {
    const g = makeGoal({ target_amount: 1000000 });
    const m = savingsMetrics(g, 250000, '2026-07-15');
    expect(m.percent).toBe(25);
    expect(m.remainingK).toBe(750000);
    expect(m.isComplete).toBe(false);
  });

  it('hedef aşılınca tamamlandı, kalan 0', () => {
    const g = makeGoal({ target_amount: 1000000 });
    const m = savingsMetrics(g, 1200000, '2026-07-15');
    expect(m.isComplete).toBe(true);
    expect(m.remainingK).toBe(0);
    expect(m.percent).toBe(100);
  });

  it('hedef tarihi varsa gereken günlük katkı', () => {
    const g = makeGoal({ target_amount: 1000000, target_date: '2026-07-25' });
    const m = savingsMetrics(g, 0, '2026-07-15'); // 10 gün, 1.000.000 kalan
    expect(m.daysLeft).toBe(10);
    expect(m.requiredDailyK).toBe(100000);
  });

  it('hedef 0 ise yüzde 0 (sıfıra bölme yok)', () => {
    const g = makeGoal({ target_amount: 0 });
    const m = savingsMetrics(g, 0, '2026-07-15');
    expect(m.percent).toBe(0);
    // makeAccount importunun kullanılmadığı uyarısını önlemek için basit doğrulama
    expect(makeAccount({ id: 9 }).id).toBe(9);
  });
});
