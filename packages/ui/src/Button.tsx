'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Visual variant. */
  variant?: ButtonVariant;
  /** When true, disables the button and sets aria-busy. */
  loading?: boolean;
  /** Content shown when loading is true. Default: "Loading…" */
  loadingChildren?: ReactNode;
  children: ReactNode;
}

/**
 * Design-system button with primary/secondary variant and optional loading state.
 * Use for consistent CTAs; consumer classes are merged with the component classes.
 */
export function Button({
  variant = 'primary',
  loading = false,
  loadingChildren = 'Loading…',
  children,
  disabled,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === 'secondary' ? 'button button--secondary' : 'button button--primary';
  const mergedClassName = [variantClass, className].filter(Boolean).join(' ');
  return (
    <button
      type={type}
      className={mergedClassName}
      disabled={Boolean(disabled || loading)}
      aria-busy={loading}
      {...rest}
    >
      {loading ? loadingChildren : children}
    </button>
  );
}
