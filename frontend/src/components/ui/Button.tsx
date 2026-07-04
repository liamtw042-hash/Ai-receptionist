import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] hover:scale-[1.02] will-change-transform gap-2',
          {
            'bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30': variant === 'primary',
            'glass border border-white/10 hover:bg-white/8 hover:border-white/20 text-white': variant === 'secondary',
            'text-gray-400 hover:text-white hover:bg-white/5': variant === 'ghost',
            'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/50': variant === 'danger',
            'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/20': variant === 'success',
          },
          {
            'text-xs px-3 py-1.5': size === 'sm',
            'text-sm px-4 py-2': size === 'md',
            'text-base px-6 py-3': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
