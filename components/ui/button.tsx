import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg whitespace-nowrap transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500',
          'active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          {
            'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow': variant === 'primary',
            'bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 hover:border-gray-400': variant === 'secondary',
            'bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow focus-visible:ring-red-500': variant === 'danger',
            'text-gray-600 hover:bg-gray-100': variant === 'ghost',
            'px-3 py-1.5 text-xs': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-5 py-2.5 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
