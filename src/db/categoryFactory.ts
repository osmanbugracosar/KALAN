/** Varsayılan kategori satırlarını id atayarak üretir (demo ve kurulum ortak kullanır). */

import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './defaults';
import type { Category } from '../domain/types';

const NOW = '2026-07-15T10:00:00';

export function buildDefaultCategoryRows(): { categories: Category[]; idOf: (name: string) => number | null } {
  const categories: Category[] = [];
  const nameToId = new Map<string, number>();
  let id = 1;
  let order = 0;

  for (const c of [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]) {
    const parentId = id++;
    categories.push({
      id: parentId,
      name: c.name,
      parent_id: null,
      kind: c.kind,
      color: c.color,
      icon: c.icon,
      is_default: 1,
      sort_order: order++,
      created_at: NOW,
      updated_at: NOW,
    });
    nameToId.set(`${c.kind}:${c.name}`, parentId);
    for (const child of c.children ?? []) {
      categories.push({
        id: id++,
        name: child,
        parent_id: parentId,
        kind: c.kind,
        color: c.color,
        icon: 'dot',
        is_default: 1,
        sort_order: order++,
        created_at: NOW,
        updated_at: NOW,
      });
    }
  }

  const idOf = (name: string) => nameToId.get(`expense:${name}`) ?? nameToId.get(`income:${name}`) ?? null;
  return { categories, idOf };
}
