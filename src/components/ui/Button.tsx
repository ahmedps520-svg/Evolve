import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  loading?: boolean;
  block?: boolean;
  /** Game-style call to action: display font, uppercase, tracked. */
  cta?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-[0_10px_28px_-12px_var(--accent)] hover:brightness-110 active:brightness-95 border border-transparent',
  secondary: 'bg-surface-3 text-fg border border-line hover:bg-surface-4',
  ghost: 'bg-transparent text-muted hover:text-fg hover:bg-surface-3/70 border border-transparent',
  outline: 'bg-transparent text-fg border border-line-strong hover:bg-surface-2',
  danger: 'bg-danger/12 text-danger border border-danger/35 hover:bg-danger/20',
  success: 'bg-success/14 text-success border border-success/35 hover:bg-success/22',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-[52px] px-6 text-[15px] gap-2.5 rounded-[14px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, iconRight, loading, block, cta, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 19 : 17;
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-[transform,background-color,filter,color,border-color] duration-150 select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        cta && 'font-display tracking-[0.12em] uppercase',
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : (
        icon && <Icon name={icon} size={iconSize} />
      )}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'ghost', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  const dims = size === 'sm' ? 'size-9 rounded-[10px]' : size === 'lg' ? 'size-12 rounded-[14px]' : 'size-11 rounded-xl';
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition-[transform,background-color,color] duration-150 active:scale-[0.94] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        dims,
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : size === 'lg' ? 22 : 19} />
    </button>
  );
});
