import { useEffect, useState } from 'react';
import { useUIStore } from '../store/useUIStore';

export interface ThemeColors {
  ink: string;
  muted: string;
  line: string;
  brand: string;
  income: string;
  expense: string;
  debt: string;
  savings: string;
  surface: string;
  base: string;
}

function readVar(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  // "247 245 240" -> "rgb(247 245 240)"
  if (/^\d/.test(raw)) return `rgb(${raw})`;
  return raw || '#000';
}

function readAll(): ThemeColors {
  return {
    ink: readVar('--k-ink'),
    muted: readVar('--k-muted'),
    line: readVar('--k-line'),
    brand: readVar('--k-brand'),
    income: readVar('--k-income'),
    expense: readVar('--k-expense'),
    debt: readVar('--k-debt'),
    savings: readVar('--k-savings'),
    surface: readVar('--k-surface'),
    base: readVar('--k-base'),
  };
}

/** Grafiklerin (recharts) tema renklerini okuyabilmesi için; tema değişince yeniden okunur. */
export function useThemeColors(): ThemeColors {
  const theme = useUIStore((s) => s.theme);
  const [colors, setColors] = useState<ThemeColors>(() => readAll());
  useEffect(() => {
    // Tema class'ı DOM'a uygulandıktan sonra oku
    const id = requestAnimationFrame(() => setColors(readAll()));
    return () => cancelAnimationFrame(id);
  }, [theme]);
  return colors;
}
