import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/75 focus-visible:ring-secondary/60',
        ghost: 'text-foreground hover:bg-muted focus-visible:ring-muted',
        outline:
          'border border-border bg-card text-foreground hover:bg-muted focus-visible:ring-muted',
      },
      size: {
        default: 'h-10 px-4 text-sm',
        sm: 'h-8 px-3 text-xs',
        icon: 'size-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)
