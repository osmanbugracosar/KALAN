/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Kalan marka paleti — CSS değişkenlerinden okunur (tema geçişi için)
        base: 'rgb(var(--k-base) / <alpha-value>)',
        surface: 'rgb(var(--k-surface) / <alpha-value>)',
        elevate: 'rgb(var(--k-elevate) / <alpha-value>)',
        line: 'rgb(var(--k-line) / <alpha-value>)',
        ink: 'rgb(var(--k-ink) / <alpha-value>)',
        muted: 'rgb(var(--k-muted) / <alpha-value>)',
        brand: 'rgb(var(--k-brand) / <alpha-value>)',
        'brand-soft': 'rgb(var(--k-brand-soft) / <alpha-value>)',
        income: 'rgb(var(--k-income) / <alpha-value>)',
        expense: 'rgb(var(--k-expense) / <alpha-value>)',
        debt: 'rgb(var(--k-debt) / <alpha-value>)',
        savings: 'rgb(var(--k-savings) / <alpha-value>)',
        warn: 'rgb(var(--k-warn) / <alpha-value>)',
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 30 45 / 0.04), 0 4px 16px rgb(15 30 45 / 0.06)',
        pop: '0 8px 30px rgb(15 30 45 / 0.14)',
      },
      fontFamily: {
        sans: ['Segoe UI Variable', 'Segoe UI', 'system-ui', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
