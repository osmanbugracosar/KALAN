/** Varsayılan kategoriler (ilk kurulumda eklenir). */

export interface DefaultCategory {
  name: string;
  kind: 'expense' | 'income';
  color: string;
  icon: string;
  children?: string[];
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { name: 'Market', kind: 'expense', color: '#E5484D', icon: 'shopping-cart', children: ['Gıda', 'Temizlik', 'Kişisel Bakım'] },
  { name: 'Yemek', kind: 'expense', color: '#F2820B', icon: 'utensils', children: ['Restoran', 'Kafe', 'Paket Servis'] },
  { name: 'Ulaşım', kind: 'expense', color: '#0E9BA0', icon: 'bus', children: ['Yakıt', 'Toplu Taşıma', 'Taksi'] },
  { name: 'Faturalar', kind: 'expense', color: '#2563C7', icon: 'receipt', children: ['Elektrik', 'Su', 'Doğalgaz', 'İnternet', 'Telefon'] },
  { name: 'Alışveriş', kind: 'expense', color: '#8B5CF6', icon: 'shopping-bag', children: ['Giyim', 'Elektronik', 'Ev Eşyası'] },
  { name: 'Eğitim', kind: 'expense', color: '#0EA5E9', icon: 'graduation-cap', children: ['Kurs', 'Kitap', 'Okul'] },
  { name: 'Sağlık', kind: 'expense', color: '#EC4899', icon: 'heart-pulse', children: ['İlaç', 'Doktor', 'Spor Salonu'] },
  { name: 'Eğlence', kind: 'expense', color: '#F59E0B', icon: 'party-popper', children: ['Sinema', 'Oyun', 'Etkinlik'] },
  { name: 'Abonelikler', kind: 'expense', color: '#6366F1', icon: 'repeat', children: ['Dijital', 'Müzik', 'Yayın'] },
  { name: 'Ev', kind: 'expense', color: '#D9822B', icon: 'home', children: ['Kira', 'Aidat', 'Bakım'] },
  { name: 'Teknoloji', kind: 'expense', color: '#14B8A6', icon: 'cpu', children: ['Yazılım', 'Donanım'] },
  { name: 'Kişisel Bakım', kind: 'expense', color: '#F472B6', icon: 'scissors' },
  { name: 'Hediye', kind: 'expense', color: '#E11D48', icon: 'gift' },
  { name: 'Seyahat', kind: 'expense', color: '#0891B2', icon: 'plane', children: ['Konaklama', 'Bilet'] },
  { name: 'Diğer', kind: 'expense', color: '#6B7280', icon: 'circle-ellipsis' },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { name: 'Günlük Kazanç', kind: 'income', color: '#1E8E5A', icon: 'sun' },
  { name: 'Proje Geliri', kind: 'income', color: '#0E5E63', icon: 'briefcase' },
  { name: 'Ek İş', kind: 'income', color: '#059669', icon: 'hammer' },
  { name: 'Satış', kind: 'income', color: '#16A34A', icon: 'tag' },
  { name: 'Harçlık', kind: 'income', color: '#65A30D', icon: 'wallet' },
  { name: 'İade', kind: 'income', color: '#0D9488', icon: 'undo-2' },
  { name: 'Hediye', kind: 'income', color: '#22C55E', icon: 'gift' },
  { name: 'Diğer', kind: 'income', color: '#6B7280', icon: 'circle-ellipsis' },
];
