'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Lightbulb, Layers } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MathExpression } from './MathExpression'
import { cn } from '@/lib/utils'
import type { MathSolution as MathSolutionType } from '@/types/math'
import { getSubject } from '@/lib/subjects'

interface MathSolutionProps {
  solution: MathSolutionType
  showAlternatives?: boolean
  subject?: string
}

function StepExpression({ expression, subject }: { expression: string; subject: string }) {
  const s = getSubject(subject)
  if (!expression) return null
  if (s.useLatex) return <MathExpression expression={expression} display />
  if (s.useCode) return (
    <pre className="mt-2 p-2 rounded bg-background/50 text-xs font-mono text-purple-200 overflow-x-auto whitespace-pre-wrap">
      {expression}
    </pre>
  )
  return <p className="mt-1 text-sm italic text-muted-foreground">{expression}</p>
}

export function MathSolution({ solution, showAlternatives = true, subject = 'Mathematics' }: MathSolutionProps) {
  const subjectMeta = getSubject(subject)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]))
  const [showAlts, setShowAlts] = useState(false)

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-purple-300 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Solution Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{solution.explanation}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-purple-500/30 text-purple-300">
              {solution.difficulty}
            </Badge>
            {solution.topics.map((topic) => (
              <Badge key={topic} variant="secondary">
                {topic}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step-by-step solution */}
      <div className="space-y-2">
        {solution.steps.map((step, index) => {
          const isExpanded = expandedSteps.has(index)
          return (
            <motion.div
              key={step.stepNumber}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  'cursor-pointer transition-colors hover:border-purple-500/30',
                  isExpanded && 'border-purple-500/20 bg-purple-500/5'
                )}
                onClick={() => toggleStep(index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Step number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">
                      {step.stepNumber}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Step description */}
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{step.description}</p>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>

                      {/* Expression (always visible) */}
                      {step.expression && (
                        <div className="mt-2 p-2 rounded bg-background/50">
                          <StepExpression expression={step.expression} subject={subject} />
                        </div>
                      )}

                      {/* Explanation (expandable) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                              {step.explanation}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Final answer */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: solution.steps.length * 0.1 }}
      >
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-green-400 uppercase tracking-wide mb-2 font-medium">
              Final Answer
            </p>
            {subjectMeta.useLatex
              ? <MathExpression expression={solution.finalAnswer} display className="text-lg" />
              : <p className="text-base font-medium">{solution.finalAnswer}</p>
            }
          </CardContent>
        </Card>
      </motion.div>

      {/* Alternative methods */}
      {showAlternatives && solution.alternativeMethods && solution.alternativeMethods.length > 0 && (
        <div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-purple-300"
            onClick={() => setShowAlts(!showAlts)}
          >
            <Layers className="h-4 w-4 mr-2" />
            {showAlts ? 'Hide' : 'Show'} Alternative Methods ({solution.alternativeMethods.length})
            {showAlts ? (
              <ChevronDown className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronRight className="h-4 w-4 ml-auto" />
            )}
          </Button>

          <AnimatePresence>
            {showAlts && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4 mt-2"
              >
                {solution.alternativeMethods.map((method, mIndex) => (
                  <Card key={mIndex} className="border-dashed">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{method.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {method.steps.map((step) => (
                        <div key={step.stepNumber} className="flex items-start gap-2">
                          <span className="text-xs font-bold text-muted-foreground mt-1">
                            {step.stepNumber}.
                          </span>
                          <div>
                            <p className="text-sm">{step.description}</p>
                            <StepExpression expression={step.expression} subject={subject} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
