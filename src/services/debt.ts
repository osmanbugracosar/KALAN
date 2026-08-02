/**
 * Borç iş mantığı — saf fonksiyonlar.
 * Fazla ödeme engeli, kalan tutar, durum hesaplama.
 */

import type { Kurus } from '../core/money';
import { daysBetween, todayLocalDate } from '../core/date';
import { DebtStatus, type DebtStatus as DebtStatusT } from '../domain/enums';
import type { Debt, DebtPayment } from '../domain/types';
import { debtRemaining } from './calculations';

export interface PaymentValidation {
  ok: boolean;
  /** İzin verilen en yüksek ödeme (kalan tutar). */
  maxAllowed: Kurus;
  /** Bu ödeme kaydedilirse yeni kalan tutar. */
  remainingAfter: Kurus;
  message?: string;
}

/**
 * Bir borca ödeme eklenip eklenemeyeceğini doğrular.
 * Ödeme, kalan borçtan yüksekse reddedilir (fazla ödeme kaydedilmez).
 *
 * @param existingPayments Bu borca ait mevcut ödemeler (düzenlenen ödeme HARİÇ tutulmalı).
 */
export function validatePayment(debt: Debt, existingPayments: DebtPayment[], amountK: Kurus): PaymentValidation {
  const remaining = debtRemaining(debt, existingPayments);

  if (amountK <= 0) {
    return { ok: false, maxAllowed: remaining, remainingAfter: remaining, message: 'Ödeme tutarı sıfırdan büyük olmalı.' };
  }
  if (amountK > remaining) {
    return {
      ok: false,
      maxAllowed: remaining,
      remainingAfter: 0,
      message: `Ödeme kalan borçtan yüksek olamaz. Kalan borç: ${remaining} kuruş.`,
    };
  }
  return { ok: true, maxAllowed: remaining, remainingAfter: remaining - amountK };
}

/**
 * Borcun otomatik durumunu hesaplar.
 * Kalan 0 -> completed. Manuel "frozen" korunur.
 * Son ödeme tarihi geçmişse overdue, 7 gün içindeyse due_soon, aksi halde active.
 */
export function deriveDebtStatus(debt: Debt, payments: DebtPayment[], today = todayLocalDate()): DebtStatusT {
  if (debt.status === DebtStatus.frozen) return DebtStatus.frozen;
  const remaining = debtRemaining(debt, payments);
  if (remaining <= 0) return DebtStatus.completed;
  if (!debt.due_date) return DebtStatus.active;

  const diff = daysBetween(today, debt.due_date);
  if (diff < 0) return DebtStatus.overdue;
  if (diff <= 7) return DebtStatus.due_soon;
  return DebtStatus.active;
}

/** Borcun tamamlanıp tamamlanmadığı. */
export function isDebtCompleted(debt: Debt, payments: DebtPayment[]): boolean {
  return debtRemaining(debt, payments) <= 0;
}
