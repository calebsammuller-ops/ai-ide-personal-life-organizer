'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Flame,
  Timer,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MathExpression } from './MathExpression'
import { getSubject } from '@/lib/subjects'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  generateProblems,
  checkAnswer,
  nextProblem,
  resetPracticeSession,
  setPracticeTopic,
  setPracticeDifficulty,
  selectPracticeSession,
  selectCurrentPracticeProblem,
  selectPracticeProgress,
  selectMathLoading,
} from '@/state/slices/mathSlice'
import { type MathDifficulty } from '@/types/math'
import { SUBJECT_TOPICS } from '@/lib/subjects'
import { cn } from '@/lib/utils'

const DIFFICULTIES: { id: MathDifficulty; label: string; color: string }[] = [
  { id: 'easy', label: 'Easy', color: 'text-green-400 border-green-500/30' },
  { id: 'medium', label: 'Medium', color: 'text-yellow-400 border-yellow-500/30' },
  { id: 'hard', label: 'Hard', color: 'text-orange-400 border-orange-500/30' },
  { id: 'advanced', label: 'Advanced', color: 'text-red-400 border-red-500/30' },
]

export function PracticeMode({ subject = 'Mathematics' }: { subject?: string }) {
  const dispatch = useAppDispatch()
  const session = useAppSelector(selectPracticeSession)
  const currentProblem = useAppSelector(selectCurrentPracticeProblem)
  const progress = useAppSelector(selectPracticeProgress)
  const isLoading = useAppSelector(selectMathLoading)

  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState<'correct' | 'incorrect' | null>(null)
  const [showSolution, setShowSolution] = useState(false)
  const [timer, setTimer] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Timer
  useEffect(() => {
    if (session.isActive && currentProblem && !showResult) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [session.isActive, currentProblem, showResult])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartPractice = () => {
    dispatch(
      generateProblems({
        topic: session.topic,
        difficulty: session.difficulty,
        count: 5,
        subject,
      })
    )
  }

  const handleSubmitAnswer = useCallback(async () => {
    if (!userAnswer.trim() || !currentProblem) return

    // Simple check: compare with final answer (strip LaTeX formatting for comparison)
    const correctAnswer = currentProblem.solution.finalAnswer
      .replace(/\\[a-zA-Z]+\{?/g, '')
      .replace(/[{}\\]/g, '')
      .trim()
    const userClean = userAnswer.trim()
    const isCorrect =
      userClean.toLowerCase() === correctAnswer.toLowerCase() ||
      userClean === correctAnswer

    setShowResult(isCorrect ? 'correct' : 'incorrect')

    await dispatch(
      checkAnswer({
        userAnswer: userClean,
        isCorrect,
        sessionId: session.sessionId ?? undefined,
        timeTakenSeconds: timer,
      })
    )
  }, [userAnswer, currentProblem, dispatch, session.sessionId, timer])

  const handleNextProblem = () => {
    setUserAnswer('')
    setShowResult(null)
    setShowSolution(false)
    setTimer(0)
    dispatch(nextProblem())
    inputRef.current?.focus()
  }

  const handleRestart = () => {
    setUserAnswer('')
    setShowResult(null)
    setShowSolution(false)
    setTimer(0)
    dispatch(resetPracticeSession())
  }

  const isSessionComplete =
    session.isActive &&
    session.problems.length > 0 &&
    session.currentIndex >= session.problems.length - 1 &&
    showResult !== null

  // Setup screen
  if (!session.isActive) {
    return (
      <div className="space-y-6">
        {/* Topic selection */}
        <Card className="border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-purple-300">Choose Topic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(SUBJECT_TOPICS[subject] ?? SUBJECT_TOPICS['Mathematics']).map((topic) => (
                <Button
                  key={topic}
                  variant="outline"
                  className={cn(
                    'h-auto py-3 text-xs transition-all',
                    session.topic === topic
                      ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                      : 'border-purple-500/20 hover:border-purple-500/40'
                  )}
                  onClick={() => dispatch(setPracticeTopic(topic))}
                >
                  {topic}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Difficulty selection */}
        <Card className="border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-purple-300">Choose Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {DIFFICULTIES.map((diff) => (
                <Button
                  key={diff.id}
                  variant="outline"
                  className={cn(
                    'transition-all',
                    session.difficulty === diff.id
                      ? `border-purple-500 bg-purple-500/10 ${diff.color}`
                      : 'border-purple-500/20 hover:border-purple-500/40'
                  )}
                  onClick={() => dispatch(setPracticeDifficulty(diff.id))}
                >
                  {diff.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Start button */}
        <Button
          onClick={handleStartPractice}
          disabled={isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating Problems...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Start Practice
            </>
          )}
        </Button>
      </div>
    )
  }

  // Session complete screen
  if (isSessionComplete) {
    const accuracy =
      progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="p-8 text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="text-6xl"
            >
              {accuracy >= 80 ? '🏆' : accuracy >= 50 ? '👍' : '💪'}
            </motion.div>
            <h2 className="text-2xl font-bold">Practice Complete!</h2>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-2xl font-bold text-purple-300">{progress.correct}/{progress.total}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-300">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-300">{progress.streak}</p>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
            </div>
            <Button
              onClick={handleRestart}
              className="bg-purple-600 hover:bg-purple-700 mt-4"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Practice Again
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Active problem
  if (!currentProblem) return null

  return (
    <div className="space-y-4">
      {/* Progress bar and stats */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Progress
            value={(progress.current / progress.total) * 100}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Problem {progress.current} of {progress.total}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-orange-500/30 text-orange-400 gap-1">
            <Flame className="h-3 w-3" />
            {progress.streak}
          </Badge>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 gap-1">
            <Timer className="h-3 w-3" />
            {formatTime(timer)}
          </Badge>
        </div>
      </div>

      {/* Problem card */}
      <Card className="border-purple-500/20">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            {getSubject(subject).useLatex
              ? <MathExpression expression={currentProblem.problemText} display className="text-xl" />
              : <p className="text-base font-medium">{currentProblem.problemText}</p>
            }
          </div>

          {/* Answer input */}
          <AnimatePresence mode="wait">
            {showResult === null ? (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <Input
                  ref={inputRef}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Enter your answer..."
                  className="text-center text-lg bg-background/50 border-purple-500/20"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                  autoFocus
                />
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSolution(!showSolution)}
                  >
                    {showSolution ? 'Hide' : 'Show'} Hint
                  </Button>
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!userAnswer.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Check Answer
                  </Button>
                </div>
                {showSolution && currentProblem.hint && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-muted-foreground text-center italic"
                  >
                    Hint: {currentProblem.hint}
                  </motion.p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                <div
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-lg',
                    showResult === 'correct'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  )}
                >
                  {showResult === 'correct' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    {showResult === 'correct' ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>

                {showResult === 'incorrect' && (
                  <div className="text-center text-sm text-muted-foreground">
                    <p>The correct answer is:</p>
                    {getSubject(subject).useLatex
                      ? <MathExpression expression={currentProblem.solution.finalAnswer} display />
                      : <p className="font-medium text-foreground mt-1">{currentProblem.solution.finalAnswer}</p>
                    }
                  </div>
                )}

                <div className="flex justify-center">
                  {!isSessionComplete && (
                    <Button
                      onClick={handleNextProblem}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Next Problem
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
