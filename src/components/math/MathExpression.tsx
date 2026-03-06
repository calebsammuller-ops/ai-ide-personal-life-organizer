'use client'

import { useMemo } from 'react'
import katex from 'katex'
import { cn } from '@/lib/utils'

interface MathExpressionProps {
  expression: string
  display?: boolean
  className?: string
}

export function MathExpression({ expression, display = false, className }: MathExpressionProps) {
  const rendered = useMemo(() => {
    try {
      return katex.renderToString(expression, {
        displayMode: display,
        throwOnError: false,
        trust: true,
        strict: false,
      })
    } catch {
      return null
    }
  }, [expression, display])

  if (!rendered) {
    return (
      <span className={cn('font-mono text-sm text-muted-foreground', className)}>
        {expression}
      </span>
    )
  }

  return (
    <span
      className={cn(display ? 'block text-center my-2' : 'inline', className)}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  )
}
