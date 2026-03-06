import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main
      className={cn(
        'flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto',
        className
      )}
    >
      {children}
    </main>
  )
}
