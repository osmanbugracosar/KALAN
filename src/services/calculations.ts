/**
 * Finansal hesaplama motoru — SAF fonksiyonlar (veritabanı/UI bağımsız).
 *
 * Tüm tutarlar kuruş (tam sayı). Bu katman test edilebilir olmalı ve
 * karmaşık SQL yerine düz veri yapıları üzerinde çalışır.
 */

import { sumK, type Kurus } from '../core/money';
import { isInMonth, monthKey } from '../core/date';
import type { Account, Transaction, Debt, DebtPayment } from '../domain/types';

/* ------------------------------------------------------------------ */
/* Hesap bakiyeleri                                                    */
/* ------------------------------------------------------------------ */

/**
 * Her hesabın güncel bakiyesini hesaplar.
 * Bakiye = başlangıç bakiyesi + işlemlerin etkisi.
 *
 * İşlem türlerinin bakiye etkisi:
 *  - income / refund / debt_inflow : account_id'ye + amount
 *  - expense / debt_payment        : account_id'den - amount
 *  - transfer / savings_contribution / savings_withdrawal :
 *        account_id'den - amount, destination_account_id'ye + amount
 *  - adjustment : account_id'ye + amount (amount işaretli olabilir)
 */
export function computeBalances(accounts: Account[], transactions: Transaction[]): Map<number, Kurus> {
  const balances = new Map<number, Kurus>();
  for (const a of accounts) balances.set(a.id, a.initial_balance);

  const add = (id: number | null, delta: Kurus) => {
    if (id == null) return;
    balances.set(id, (balances.get(id) ?? 0) + delta);
  };

  for (const t of transactions) {
    switch (t.type) {
      case 'income':
      case 'refund':
      case 'debt_inflow':
        add(t.account_id, t.amount);
        break;
      case 'expense':
      case 'debt_payment':
        add(t.account_id, -t.amount);
        break;
      case 'transfer':
      case 'savings_contribution':
      case 'savings_withdrawal':
        add(t.account_id, -t.amount);
        add(t.destination_account_id, t.amount);
        break;
      case 'adjustment':
        add(t.account_id, t.amount); // düzeltmede amount işaretli tutulur
        break;
    }
  }
  return balances;
}

/** Tek bir hesabın güncel bakiyesi. */
export function accountBalance(account: Account, transactions: Transaction[]): Kurus {
  return computeBalances([account], transactions).get(account.id) ?? account.initial_balance;
}

/** Aktif hesapların toplam bakiyesi = "Mevcut toplam para". */
export function totalBalance(accounts: Account[], transactions: Transaction[]): Kurus {
  const balances = computeBalances(accounts, transactions);
  let total = 0;
  for (const a of accounts) {
    if (a.is_active === 1) total += balances.get(a.id) ?? 0;
  }
  return total;
}

/** Korumalı (birikim) hesapların toplam bakiyesi. */
export function protectedBalance(accounts: Account[], transactions: Transaction[]): Kurus {
  const balances = computeBalances(accounts, transactions);
  let total = 0;
  for (const a of accounts) {
    if (a.is_active === 1 && a.is_protected === 1) total += balances.get(a.id) ?? 0;
  }
  return total;
}

/* ------------------------------------------------------------------ */
/* Aylık akışlar                                                       */
/* ------------------------------------------------------------------ */

/** Belirli ayda gerçek gelir = yalnızca 'income' türü işlemler. */
export function monthlyRealIncome(transactions: Transaction[], mKey: string): Kurus {
  return sumK(transactions.filter((t) => t.type === 'income' && isInMonth(t.transaction_date, mKey)).map((t) => t.amount));
}

/** Belirli ayda tüketim gideri = yalnızca 'expense' türü (borç ödemesi/birikim hariç). */
export function monthlyConsumptionExpense(transactions: Transaction[], mKey: string): Kurus {
  return sumK(transactions.filter((t) => t.type === 'expense' && isInMonth(t.transaction_date, mKey)).map((t) => t.amount));
}

/** Belirli ayda borca ödenen = 'debt_payment' türü işlemler. */
export function monthlyDebtPaid(transactions: Transaction[], mKey: string): Kurus {
  return sumK(transactions.filter((t) => t.type === 'debt_payment' && isInMonth(t.transaction_date, mKey)).map((t) => t.amount));
}

/** Belirli ayda birikime ayrılan = 'savings_contribution' türü. */
export function monthlySavings(transactions: Transaction[], mKey: string): Kurus {
  return sumK(
    transactions.filter((t) => t.type === 'savings_contribution' && isInMonth(t.transaction_date, mKey)).map((t) => t.amount),
  );
}

/** Bu ay nakit çıkışı = tüketim gideri + borç ödemeleri. */
export function monthlyCashOutflow(transactions: Transaction[], mKey: string): Kurus {
  return monthlyConsumptionExpense(transactions, mKey) + monthlyDebtPaid(transactions, mKey);
}

/** Bu ay nakit farkı = gelir - gider - borç ödemeleri. */
export function monthlyCashDelta(transactions: Transaction[], mKey: string): Kurus {
  return monthlyRealIncome(transactions, mKey) - monthlyConsumptionExpense(transactions, mKey) - monthlyDebtPaid(transactions, mKey);
}

/**
 * Tasarruf oranı. Gelir 0 ise null döner (sıfıra bölme yok).
 * UI, null durumunda "Bu ay henüz gelir eklenmedi." gösterir.
 */
export function savingsRate(transactions: Transaction[], mKey: string): number | null {
  const income = monthlyRealIncome(transactions, mKey);
  if (income === 0) return null;
  const saved = monthlyCashDelta(transactions, mKey);
  return (saved / income) * 100;
}

/* ------------------------------------------------------------------ */
/* Borç toplamları ve net varlık                                       */
/* ------------------------------------------------------------------ */

/**
 * Bir borcun kalan tutarı = toplam geri ödeme - önceden ödenen - kayıtlı ödemeler.
 * Kalan tutar hiçbir zaman değiştirilebilir bir alan olarak tutulmaz;
 * geçerli ödeme kayıtlarının toplamından yeniden hesaplanır. 0'ın altına düşmez.
 */
export function debtRemaining(debt: Debt, payments: DebtPayment[]): Kurus {
  const paidHere = sumK(payments.filter((p) => p.debt_id === debt.id).map((p) => p.amount));
  const remaining = debt.total_repayment_amount - debt.previously_paid_amount - paidHere;
  return Math.max(0, remaining);
}

/** Bir borca bugüne kadar ödenen toplam (önceden + kayıtlı). */
export function debtPaidTotal(debt: Debt, payments: DebtPayment[]): Kurus {
  const paidHere = sumK(payments.filter((p) => p.debt_id === debt.id).map((p) => p.amount));
  return debt.previously_paid_amount + paidHere;
}

/** Borç ilerleme yüzdesi (0–100). Toplam 0 ise 0. */
export function debtProgressPercent(debt: Debt, payments: DebtPayment[]): number {
  if (debt.total_repayment_amount === 0) return 0;
  const paid = debtPaidTotal(debt, payments);
  return Math.min(100, Math.max(0, (paid / debt.total_repayment_amount) * 100));
}

/** Tüm borçların kalan tutarı = "Toplam kalan borç". Tamamlananlar 0 katkı verir. */
export function totalRemainingDebt(debts: Debt[], payments: DebtPayment[]): Kurus {
  let total = 0;
  for (const d of debts) total += debtRemaining(d, payments);
  return total;
}

/** Net varlık = mevcut toplam para - toplam kalan borç. */
export function netWorth(accounts: Account[], transactions: Transaction[], debts: Debt[], payments: DebtPayment[]): Kurus {
  return totalBalance(accounts, transactions) - totalRemainingDebt(debts, payments);
}

/* ------------------------------------------------------------------ */
/* Kullanılabilir bakiye                                               */
/* ------------------------------------------------------------------ */

/**
 * Kullanılabilir bakiye = mevcut para - ayrılmış zorunlu ödemeler - korumalı birikimler.
 * Gelecekte alınacağı kesin olmayan gelir DAHİL EDİLMEZ.
 */
export function availableBalance(
  totalBalanceK: Kurus,
  reservedUpcomingK: Kurus,
  protectedSavingsK: Kurus,
): Kurus {
  return totalBalanceK - reservedUpcomingK - protectedSavingsK;
}

/* ------------------------------------------------------------------ */
/* İşlem kalemleri doğrulaması                                         */
/* ------------------------------------------------------------------ */

/**
 * İşlem kalemlerinin toplamı ana işlem tutarına eşit olmalı.
 * Fark döner (kalem toplamı - işlem tutarı). 0 değilse işlem kaydedilmemeli.
 */
export function itemsSumDifference(itemTotals: Kurus[], transactionAmountK: Kurus): Kurus {
  return sumK(itemTotals) - transactionAmountK;
}

export function itemsSumMatches(itemTotals: Kurus[], transactionAmountK: Kurus): boolean {
  return itemsSumDifference(itemTotals, transactionAmountK) === 0;
}

/* ------------------------------------------------------------------ */
/* Yardımcı gruplamalar (raporlar/grafikler için)                      */
/* ------------------------------------------------------------------ */

/** Kategori id -> tutar toplamı (yalnızca 'expense' işlemler). */
export function expenseByCategory(transactions: Transaction[], predicate?: (t: Transaction) => boolean): Map<number, Kurus> {
  const map = new Map<number, Kurus>();
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (predicate && !predicate(t)) continue;
    const key = t.category_id ?? -1;
    map.set(key, (map.get(key) ?? 0) + t.amount);
  }
  return map;
}

/** Ay anahtarı -> gelir/gider toplamları (grafik için). */
export function incomeExpenseByMonth(transactions: Transaction[], monthKeys: string[]) {
  return monthKeys.map((k) => ({
    month: k,
    income: monthlyRealIncome(transactions, k),
    expense: monthlyConsumptionExpense(transactions, k),
    debt: monthlyDebtPaid(transactions, k),
  }));
}

/** İşletme -> harcanan toplam (en çok harcanan işletmeler için). */
export function spendByMerchant(transactions: Transaction[]): Map<string, Kurus> {
  const map = new Map<string, Kurus>();
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.merchant) continue;
    map.set(t.merchant, (map.get(t.merchant) ?? 0) + t.amount);
  }
  return map;
}

/** Verilen dönemde harcama yapılmayan gün sayısı (aya göre). */
export function noSpendDaysInMonth(transactions: Transaction[], mKey: string): number {
  const [y, m] = mKey.split('-').map((x) => parseInt(x, 10));
  const totalDays = new Date(y, m, 0).getDate();
  const spentDays = new Set<string>();
  for (const t of transactions) {
    if (t.type === 'expense' && monthKey(t.transaction_date) === mKey) {
      spentDays.add(t.transaction_date.split('T')[0]);
    }
  }
  return totalDays - spentDays.size;
}
