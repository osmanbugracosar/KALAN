/**
 * Bütçe ve birikim hedefi iş mantığı — saf fonksiyonlar (sıfıra bölme güvenli).
 */

import type { Kurus } from '../core/money';
import { daysBetween, daysInMonth, todayLocalDate } from '../core/date';
import type { SavingsGoal } from '../domain/types';

export interface BudgetUsage {
  limitK: Kurus;
  spentK: Kurus;
  remainingK: Kurus; // negatif olabilir (aşım)
  usagePercent: number; // limit 0 ise 0
  over: boolean;
  overByK: Kurus; // aşılan tutar (aşım yoksa 0)
  level: 'ok' | 'warn' | 'critical' | 'over';
  /** Dönem sonu tahmini harcama (mevcut hız korunursa). */
  projectionK: Kurus;
}

/**
 * Bütçe kullanımını hesaplar.
 * %80 -> warn, %100 -> critical, aşım -> over.
 */
export function budgetUsage(limitK: Kurus, spentK: Kurus, daysElapsed: number, totalDays: number): BudgetUsage {
  const remainingK = limitK - spentK;
  const usagePercent = limitK === 0 ? 0 : (spentK / limitK) * 100;
  const over = spentK > limitK;
  const overByK = over ? spentK - limitK : 0;

  let level: BudgetUsage['level'] = 'ok';
  if (over) level = 'over';
  else if (usagePercent >= 100) level = 'critical';
  else if (usagePercent >= 80) level = 'warn';

  const projectionK = daysElapsed > 0 ? Math.round((spentK / daysElapsed) * totalDays) : spentK;

  return { limitK, spentK, remainingK, usagePercent, over, overByK, level, projectionK };
}

/** Aylık bütçe için bugüne göre kullanım (gün sayıları otomatik). */
export function monthlyBudgetUsage(limitK: Kurus, spentK: Kurus, mKey: string, today = todayLocalDate()): BudgetUsage {
  const total = daysInMonth(mKey);
  const cur = today.slice(0, 7);
  let elapsed = total;
  if (mKey === cur) elapsed = parseInt(today.slice(8, 10), 10);
  else if (mKey > cur) elapsed = 0;
  return budgetUsage(limitK, spentK, elapsed, total);
}

export interface SavingsMetrics {
  savedK: Kurus;
  targetK: Kurus;
  remainingK: Kurus;
  percent: number; // 0–100
  isComplete: boolean;
  daysLeft: number | null; // hedef tarihi yoksa null
  /** Hedefe ulaşmak için gereken günlük ortalama katkı (gün kaldıysa). */
  requiredDailyK: Kurus | null;
  /** Yeterli katkı hızı varsa tahmini bitiş (gün cinsinden bugünden). */
}

/** Birikim hedefi metrikleri. */
export function savingsMetrics(goal: SavingsGoal, savedK: Kurus, today = todayLocalDate()): SavingsMetrics {
  const targetK = goal.target_amount;
  const remainingK = Math.max(0, targetK - savedK);
  const percent = targetK === 0 ? 0 : Math.min(100, (savedK / targetK) * 100);
  const isComplete = savedK >= targetK && targetK > 0;

  let daysLeft: number | null = null;
  let requiredDailyK: Kurus | null = null;
  if (goal.target_date) {
    daysLeft = daysBetween(today, goal.target_date);
    if (daysLeft > 0 && remainingK > 0) {
      requiredDailyK = Math.ceil(remainingK / daysLeft);
    } else {
      requiredDailyK = remainingK > 0 ? remainingK : 0;
    }
  }

  return { savedK, targetK, remainingK, percent, isComplete, daysLeft, requiredDailyK };
}
