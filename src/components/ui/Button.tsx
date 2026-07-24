import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-400 shadow-[0_8px_24px_-8px_rgba(255,90,54,0.6)]',
  secondary: 'bg-ink-700 text-mist-100 hover:bg-ink-600',
  ghost: 'bg-transparent text-mist-200 hover:bg-ink-800',
  outline: 'bg-transparent border border-ink-500 text-mist-100 hover:border-brand-400 hover:text-brand-300',
  danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

/** Shared with any element (e.g. a router Link) that needs to look like a Button. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props },
  ref,
) {
  return <button ref={ref} className={buttonClasses(variant, size, className)} {...props} />
})
