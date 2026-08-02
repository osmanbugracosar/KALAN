import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

const control =
  'w-full h-10 px-3 rounded-lg bg-elevate border border-line text-ink text-sm placeholder:text-muted/70 focus:border-brand focus:bg-surface transition-colors outline-none';

export function Field({ label, hint, error, children, htmlFor }: { label?: string; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      {label && <span className="block text-[13px] font-medium text-ink mb-1.5">{label}</span>}
      {children}
      {error ? (
        <span className="block text-[12px] text-expense mt-1">{error}</span>
      ) : hint ? (
        <span className="block text-[12px] text-muted mt-1">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(control, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(control, 'h-auto py-2 min-h-[72px] resize-y', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(control, 'pr-8 appearance-none cursor-pointer', className)} {...rest}>
      {children}
    </select>
  );
}

/** Kuruş girişi için ₺ ön ekli metin kutusu (serbest metin; parse dışarıda). */
export function MoneyInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">₺</span>
      <input inputMode="decimal" className={cx(control, 'pl-7 tabular', className)} {...rest} />
    </div>
  );
}
