import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand/90 active:bg-brand/95 shadow-sm',
  secondary: 'bg-brand-soft text-brand hover:bg-brand-soft/70 border border-brand/15',
  ghost: 'text-ink/80 hover:bg-ink/5',
  subtle: 'bg-elevate text-ink border border-line hover:bg-line/40',
  danger: 'bg-expense text-white hover:bg-expense/90',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(base, variants[variant], sizes[size], block && 'w-full', className)}
      {...rest}
    />
  );
});
