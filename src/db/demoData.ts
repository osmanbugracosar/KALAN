/**
 * Demo verisi üreteci — düz domain nesneleri üretir (veritabanı bağımsız).
 * Hem SQLite tohumlaması hem de tarayıcı önizleme modu bu üreteci kullanır.
 * Deterministiktir (aynı çıktı) — grafik/rapor testleri tutarlı olsun diye.
 */

import { todayLocalDate, monthsBack } from '../core/date';
import { buildDefaultCategoryRows } from './categoryFactory';
import type {
  Account,
  Budget,
  Category,
  Debt,
  DebtPayment,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
  TransactionItem,
  WishlistItem,
} from '../domain/types';

const NOW = '2026-07-15T10:00:00';

export interface DemoData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  savingsGoals: SavingsGoal[];
  budgets: Budget[];
  wishlist: WishlistItem[];
  recurring: RecurringTransaction[];
  transactionItems: TransactionItem[];
}

/** Basit deterministik sözde-rastgele üreteç. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

export function generateDemoData(today = todayLocalDate()): DemoData {
  const rng = makeRng(20260715);
  const { categories, idOf } = buildDefaultCategoryRows();

  const accounts: Account[] = [
    acc(1, 'Nakit', 'cash', 320000, '#1E8E5A', 'banknote', 0, 0),
    acc(2, 'Vakıf Banka', 'bank', 1180000, '#2563C7', 'landmark', 0, 1),
    acc(3, 'Banka Kartı', 'card', 240000, '#0E5E63', 'credit-card', 0, 2),
    acc(4, 'Papara Cüzdan', 'wallet', 65000, '#8B5CF6', 'wallet', 0, 3),
    acc(5, 'Birikim Hesabı', 'savings', 450000, '#2563C7', 'piggy-bank', 1, 4),
  ];

  const transactions: Transaction[] = [];
  let tid = 1;
  const months = monthsBack(6, today); // eskiden yeniye 6 ay

  const merchantsByCat: Record<string, string[]> = {
    Market: ['Migros', 'BİM', 'A101', 'ŞOK', 'CarrefourSA'],
    Yemek: ['Burger Lab', 'Kahve Dünyası', 'Dominos', 'Yerel Lokanta', 'Starbucks'],
    Ulaşım: ['Shell', 'BP', 'İETT', 'BiTaksi', 'Opet'],
    Faturalar: ['Türk Telekom', 'Enerjisa', 'İSKİ', 'Turkcell', 'İGDAŞ'],
    Alışveriş: ['Trendyol', 'LC Waikiki', 'MediaMarkt', 'Hepsiburada'],
    Eğlence: ['Cinemaximum', 'Steam', 'Spotify', 'Bilet.com'],
    Sağlık: ['Eczane', 'MAC Fit', 'Özel Klinik'],
    Ev: ['Site Yönetimi', 'IKEA', 'Koçtaş'],
    Abonelikler: ['Netflix', 'YouTube Premium', 'iCloud'],
    Teknoloji: ['JetBrains', 'Amazon Web', 'Apple'],
    Seyahat: ['Pegasus', 'THY', 'Booking'],
  };

  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const vary = (base: number, spread: number) => base + Math.floor((rng() - 0.5) * 2 * spread);

  const addTxn = (t: Partial<Transaction>) => {
    transactions.push({
      id: tid++,
      type: 'expense',
      amount: 0,
      account_id: null,
      destination_account_id: null,
      category_id: null,
      debt_id: null,
      savings_goal_id: null,
      merchant: null,
      description: null,
      payment_method: null,
      transaction_date: `${today}T10:00:00`,
      note: null,
      include_in_budget: 1,
      has_receipt: 0,
      linked_transaction_id: null,
      is_recurring_instance: 0,
      created_at: NOW,
      updated_at: NOW,
      ...t,
    });
  };

  months.forEach((mKey, mi) => {
    const isRecent = mi >= months.length - 2; // son 2 ay daha yoğun (günlük grafikler için)
    const dim = new Date(parseInt(mKey.slice(0, 4)), parseInt(mKey.slice(5, 7)), 0).getDate();

    // --- Gelirler (değişken, sabit maaş YOK) ---
    addTxn({
      type: 'income',
      amount: vary(1850000, 250000),
      account_id: 2,
      category_id: idOf('Proje Geliri'),
      merchant: 'Serbest Proje',
      description: 'Aylık proje ödemesi',
      payment_method: 'Havale/EFT',
      transaction_date: `${mKey}-${pad2(5 + Math.floor(rng() * 4))}T14:00:00`,
    });
    // Günlük kazanç birkaç kez
    for (let i = 0; i < 3; i++) {
      addTxn({
        type: 'income',
        amount: vary(120000, 40000),
        account_id: 1,
        category_id: idOf('Günlük Kazanç'),
        merchant: 'Nakit İş',
        payment_method: 'Nakit',
        transaction_date: `${mKey}-${pad2(3 + Math.floor(rng() * 24))}T18:00:00`,
      });
    }
    if (rng() > 0.5) {
      addTxn({
        type: 'income',
        amount: vary(90000, 30000),
        account_id: 4,
        category_id: idOf('Satış'),
        merchant: 'İkinci El Satış',
        transaction_date: `${mKey}-${pad2(10 + Math.floor(rng() * 15))}T12:00:00`,
      });
    }

    // --- Sabit giderler ---
    addTxn({ type: 'expense', amount: 950000, account_id: 2, category_id: idOf('Ev'), merchant: 'Site Yönetimi', description: 'Kira', payment_method: 'Havale/EFT', transaction_date: `${mKey}-02T09:00:00` });
    addTxn({ type: 'expense', amount: vary(48000, 8000), account_id: 2, category_id: idOf('Faturalar'), merchant: pick(['Turkcell', 'Türk Telekom']), description: 'Telefon', payment_method: 'Otomatik Ödeme', transaction_date: `${mKey}-08T09:00:00` });
    addTxn({ type: 'expense', amount: 39900, account_id: 2, category_id: idOf('Faturalar'), merchant: 'Türk Telekom', description: 'İnternet', payment_method: 'Otomatik Ödeme', transaction_date: `${mKey}-08T09:05:00` });
    addTxn({ type: 'expense', amount: vary(72000, 15000), account_id: 2, category_id: idOf('Faturalar'), merchant: 'Enerjisa', description: 'Elektrik', payment_method: 'Otomatik Ödeme', transaction_date: `${mKey}-14T09:00:00` });
    addTxn({ type: 'expense', amount: 6499, account_id: 3, category_id: idOf('Abonelikler'), merchant: 'Netflix', payment_method: 'Kredi Kartı', transaction_date: `${mKey}-11T00:00:00` });

    // --- Market (haftalık) ---
    const marketRuns = isRecent ? 8 : 4;
    for (let i = 0; i < marketRuns; i++) {
      addTxn({
        type: 'expense',
        amount: vary(58000, 30000),
        account_id: pick([2, 3, 1]),
        category_id: idOf('Market'),
        merchant: pick(merchantsByCat.Market),
        payment_method: pick(['Banka Kartı', 'Kredi Kartı', 'Nakit']),
        has_receipt: rng() > 0.6 ? 1 : 0,
        transaction_date: `${mKey}-${pad2(1 + Math.floor((i / marketRuns) * dim))}T${pad2(10 + Math.floor(rng() * 9))}:${pad2(Math.floor(rng() * 60))}:00`,
      });
    }

    // --- Yemek / Ulaşım / diğer değişkenler ---
    const others = ['Yemek', 'Ulaşım', 'Alışveriş', 'Eğlence', 'Sağlık', 'Teknoloji'];
    const count = isRecent ? 22 : 10;
    for (let i = 0; i < count; i++) {
      const catName = pick(others);
      addTxn({
        type: 'expense',
        amount: vary(catName === 'Alışveriş' ? 120000 : catName === 'Ulaşım' ? 35000 : 28000, 20000),
        account_id: pick([2, 3, 4, 1]),
        category_id: idOf(catName),
        merchant: pick(merchantsByCat[catName] ?? ['Çeşitli']),
        payment_method: pick(['Banka Kartı', 'Kredi Kartı', 'QR / Dijital Cüzdan']),
        transaction_date: `${mKey}-${pad2(1 + Math.floor(rng() * dim))}T${pad2(9 + Math.floor(rng() * 12))}:${pad2(Math.floor(rng() * 60))}:00`,
      });
    }

    // --- Birikime aktarma (aylık, normal gider DEĞİL) ---
    addTxn({
      type: 'savings_contribution',
      amount: 200000,
      account_id: 2,
      destination_account_id: 5,
      savings_goal_id: 1,
      description: 'Aylık birikim',
      transaction_date: `${mKey}-06T10:00:00`,
    });

    // --- Hesaplar arası transfer (gelir/gider değil) ---
    if (rng() > 0.4) {
      addTxn({
        type: 'transfer',
        amount: vary(150000, 50000),
        account_id: 2,
        destination_account_id: 1,
        description: 'ATM nakit çekim',
        transaction_date: `${mKey}-${pad2(15 + Math.floor(rng() * 10))}T13:00:00`,
      });
    }
  });

  // --- Borçlar ---
  const firstMonth = months[0];
  const debts: Debt[] = [
    debt(1, 'İhtiyaç Kredisi', 'Vakıf Banka', 3000000, 3600000, 600000, `${firstMonth}-01`, `${today.slice(0, 7)}-25`, 300000, 'active', '#D9822B', 'landmark'),
    debt(2, 'Telefon Taksiti', 'MediaMarkt', 2400000, 2400000, 800000, `${months[1]}-10`, `${months[months.length - 1].slice(0, 7)}-20`, 400000, 'active', '#2563C7', 'smartphone'),
    debt(3, 'Arkadaş Borcu', 'Mehmet', 500000, 500000, 500000, `${months[2]}-05`, null, null, 'completed', '#1E8E5A', 'user'),
  ];

  // --- Borç ödemeleri (kalan borç bunlardan hesaplanır) ---
  const debtPayments: DebtPayment[] = [];
  let pid = 1;
  const addPay = (p: Partial<DebtPayment>) => {
    debtPayments.push({
      id: pid++,
      debt_id: 0,
      account_id: 2,
      amount: 0,
      payment_date: `${today}`,
      description: 'Taksit ödemesi',
      linked_income_transaction_id: null,
      linked_transaction_id: null,
      created_at: NOW,
      updated_at: NOW,
      ...p,
    });
  };
  // İhtiyaç kredisi: her ay 300.000 (borç inflow'dan sonra)
  months.forEach((mKey, mi) => {
    if (mi === 0) return;
    addPay({ debt_id: 1, amount: 300000, payment_date: `${mKey}-25` });
  });
  // Telefon taksiti: birkaç ödeme
  months.slice(2).forEach((mKey) => addPay({ debt_id: 2, amount: 400000, payment_date: `${mKey}-20` }));
  // Arkadaş borcu tamamlanmış
  addPay({ debt_id: 3, amount: 500000, payment_date: `${months[3]}-05` });

  // İhtiyaç kredisi başlangıçta hesaba giren para (borç kaynaklı — gelir değil)
  addTxn({
    type: 'debt_inflow',
    amount: 3000000,
    account_id: 2,
    debt_id: 1,
    description: 'Kredi kullanımı',
    transaction_date: `${firstMonth}-01T11:00:00`,
  });

  // --- Birikim hedefleri ---
  const savingsGoals: SavingsGoal[] = [
    goal(1, 'Acil Durum Fonu', 3000000, 5, `${months[0]}-01`, null, '#2563C7', 'shield'),
    goal(2, 'Tatil', 1500000, 5, `${months[2]}-01`, `${today.slice(0, 4)}-12-01`, '#0891B2', 'plane'),
    goal(3, 'Yeni Laptop', 5500000, 5, `${months[1]}-01`, `${parseInt(today.slice(0, 4)) + 1}-03-01`, '#8B5CF6', 'laptop'),
  ];

  // --- Bütçeler ---
  const budgets: Budget[] = [
    { id: 1, name: 'Market', method: 'category_based', category_id: idOf('Market'), limit_amount: 500000, period: 'monthly', is_active: 1, created_at: NOW, updated_at: NOW },
    { id: 2, name: 'Yemek', method: 'category_based', category_id: idOf('Yemek'), limit_amount: 250000, period: 'monthly', is_active: 1, created_at: NOW, updated_at: NOW },
    { id: 3, name: 'Aylık Harcama Sınırı', method: 'manual_limit', category_id: null, limit_amount: 2500000, period: 'monthly', is_active: 1, created_at: NOW, updated_at: NOW },
  ];

  // --- Satın alma bekleme listesi ---
  const wishlist: WishlistItem[] = [
    { id: 1, name: 'Kablosuz Kulaklık', estimated_price: 350000, priority: 'medium', planned_date: null, savings_goal_id: null, note: null, is_purchased: 0, created_at: NOW, updated_at: NOW },
    { id: 2, name: 'Ofis Sandalyesi', estimated_price: 780000, priority: 'high', planned_date: `${today.slice(0, 7)}-28`, savings_goal_id: null, note: 'Bel desteği olan', is_purchased: 0, created_at: NOW, updated_at: NOW },
  ];

  // --- Düzenli ödemeler ---
  const recurring: RecurringTransaction[] = [
    { id: 1, name: 'Kira', type: 'expense', amount: 950000, account_id: 2, destination_account_id: null, category_id: idOf('Ev'), debt_id: null, merchant: 'Site Yönetimi', frequency: 'monthly', interval_days: null, next_due_date: `${today.slice(0, 7)}-02`, last_run_date: null, status: 'pending', is_active: 1, note: null, created_at: NOW, updated_at: NOW },
    { id: 2, name: 'İnternet', type: 'expense', amount: 39900, account_id: 2, destination_account_id: null, category_id: idOf('Faturalar'), debt_id: null, merchant: 'Türk Telekom', frequency: 'monthly', interval_days: null, next_due_date: `${today.slice(0, 7)}-08`, last_run_date: null, status: 'pending', is_active: 1, note: null, created_at: NOW, updated_at: NOW },
    { id: 3, name: 'Netflix', type: 'expense', amount: 6499, account_id: 3, destination_account_id: null, category_id: idOf('Abonelikler'), debt_id: null, merchant: 'Netflix', frequency: 'monthly', interval_days: null, next_due_date: `${today.slice(0, 7)}-11`, last_run_date: null, status: 'pending', is_active: 1, note: null, created_at: NOW, updated_at: NOW },
  ];

  return { accounts, categories, transactions, debts, debtPayments, savingsGoals, budgets, wishlist, recurring, transactionItems: [] };
}

/* --- küçük kurucular --- */
function acc(id: number, name: string, type: Account['type'], initial: number, color: string, icon: string, prot: number, order: number): Account {
  return { id, name, type, initial_balance: initial, currency: 'TRY', color, icon, is_protected: prot, is_active: 1, sort_order: order, created_at: NOW, updated_at: NOW };
}
function debt(id: number, name: string, creditor: string, original: number, total: number, prevPaid: number, start: string, due: string | null, planned: number | null, status: Debt['status'], color: string, icon: string): Debt {
  return { id, name, creditor, original_amount: original, total_repayment_amount: total, previously_paid_amount: prevPaid, start_date: start, due_date: due, planned_payment_amount: planned, payment_frequency: 'monthly', status, color, icon, note: null, created_at: NOW, updated_at: NOW };
}
function goal(id: number, name: string, target: number, accountId: number, start: string, targetDate: string | null, color: string, icon: string): SavingsGoal {
  return { id, name, target_amount: target, account_id: accountId, start_date: start, target_date: targetDate, contribution_type: 'manual', color, icon, note: null, is_completed: 0, created_at: NOW, updated_at: NOW };
}
