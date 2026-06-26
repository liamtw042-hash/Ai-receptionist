import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className, hover, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'glass rounded-xl p-5 border border-white/8',
        hover && 'glass-hover cursor-pointer transition-all duration-200 hover:border-white/15',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
