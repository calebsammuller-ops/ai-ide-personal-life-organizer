'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Plus, FileText, Timer, Calculator, Zap } from 'lucide-react'

const quickActions = [
  {
    label: 'New Task',
    href: '/tasks',
    icon: Plus,
    color: 'from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30',
  },
  {
    label: 'New Doc',
    href: '/docs/new',
    icon: FileText,
    color: 'from-blue-600/20 to-cyan-600/20 hover:from-blue-600/30 hover:to-cyan-600/30',
  },
  {
    label: 'Start Timer',
    href: '/time-tracking',
    icon: Timer,
    color: 'from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30',
  },
  {
    label: 'Practice Math',
    href: '/math',
    icon: Calculator,
    color: 'from-orange-600/20 to-yellow-600/20 hover:from-orange-600/30 hover:to-yellow-600/30',
  },
]

export function QuickActionsWidget() {
  return (
    <Card
      className={cn(
        'border border-purple-500/15 bg-black/40 backdrop-blur-sm',
        'hover:border-purple-500/30 transition-all duration-200'
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-purple-100 flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={action.href}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg',
                    'bg-gradient-to-br border border-purple-500/10',
                    'transition-all duration-200',
                    'hover:border-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]',
                    'hover:scale-105',
                    action.color
                  )}
                >
                  <Icon className="h-5 w-5 text-purple-300" />
                  <span className="text-[10px] font-medium text-purple-200">
                    {action.label}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
