'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Brain, BarChart3 } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { MathScanner } from '@/components/math/MathScanner'
import { MathSolution } from '@/components/math/MathSolution'
import { PracticeMode } from '@/components/math/PracticeMode'
import { MathProgress } from '@/components/math/MathProgress'
import { useAppSelector } from '@/state/hooks'
import { selectCurrentSolution } from '@/state/slices/mathSlice'
import { cn } from '@/lib/utils'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'
import { SUBJECTS } from '@/lib/subjects'

type MathTab = 'solve' | 'practice' | 'progress'

const TABS: { id: MathTab; label: string; icon: typeof Calculator }[] = [
  { id: 'solve', label: 'Solve', icon: Calculator },
  { id: 'practice', label: 'Practice', icon: Brain },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
]

export default function MathPage() {
  const [activeTab, setActiveTab] = useState<MathTab>('solve')
  const [selectedSubject, setSelectedSubject] = useState('Mathematics')
  const currentSolution = useAppSelector(selectCurrentSolution)

  useRegisterPageContext({
    pageTitle: 'Study Assistant',
    activeView: activeTab,
    visibleContent: {
      type: 'study',
      subject: selectedSubject,
      hasSolution: !!currentSolution,
    },
  })

  return (
    <PageContainer>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Study Assistant</h1>
          <p className="text-muted-foreground">Solve, practice, and master any subject</p>
        </div>

        {/* Subject picker */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SUBJECTS.map((subject) => (
            <button
              key={subject.id}
              onClick={() => setSelectedSubject(subject.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0',
                selectedSubject === subject.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-purple-500/10'
              )}
            >
              <span>{subject.emoji}</span>
              <span>{subject.label}</span>
            </button>
          ))}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg border border-purple-500/20">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all relative',
                  isActive
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="math-tab-bg"
                    className="absolute inset-0 bg-purple-600 rounded-md shadow-lg shadow-purple-500/25"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'solve' && (
            <div className="space-y-6">
              <MathScanner subject={selectedSubject} />
              {currentSolution && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <MathSolution solution={currentSolution} subject={selectedSubject} showAlternatives />
                </motion.div>
              )}
            </div>
          )}

          {activeTab === 'practice' && <PracticeMode subject={selectedSubject} />}

          {activeTab === 'progress' && <MathProgress />}
        </motion.div>
      </motion.div>
    </PageContainer>
  )
}
