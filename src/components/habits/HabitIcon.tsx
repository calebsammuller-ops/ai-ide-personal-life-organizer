'use client'

import {
  Dumbbell,
  Brain,
  Heart,
  BookOpen,
  Moon,
  Droplets,
  Salad,
  Pen,
  Target,
  Clock,
  Footprints,
  Bike,
  Flame,
  Zap,
  Eye,
  Shield,
  Swords,
  Crown,
  Gem,
  Star,
  Sparkles,
  Music,
  Palette,
  Camera,
  Code,
  MessageCircle,
  Users,
  Phone,
  Leaf,
  Sun,
  Coffee,
  Wine,
  Cigarette,
  Ban,
  Trophy,
  Medal,
  Compass,
  Map,
  Mountain,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Map keywords to icons
const iconMappings: { keywords: string[]; icon: LucideIcon; category?: string }[] = [
  // Fitness
  { keywords: ['run', 'running', 'jog', 'sprint', 'walk', 'steps'], icon: Footprints, category: 'Fitness' },
  { keywords: ['gym', 'workout', 'exercise', 'lift', 'weights', 'strength', 'muscle'], icon: Dumbbell, category: 'Fitness' },
  { keywords: ['bike', 'cycling', 'bicycle'], icon: Bike, category: 'Fitness' },
  { keywords: ['swim', 'swimming'], icon: Waves, category: 'Fitness' },
  { keywords: ['yoga', 'stretch'], icon: Wind, category: 'Mindfulness' },
  { keywords: ['hike', 'hiking', 'climb'], icon: Mountain, category: 'Fitness' },

  // Health
  { keywords: ['water', 'hydrate', 'drink'], icon: Droplets, category: 'Health' },
  { keywords: ['sleep', 'rest', 'bed', 'nap'], icon: Moon, category: 'Health' },
  { keywords: ['vitamin', 'medicine', 'pill', 'supplement'], icon: Shield, category: 'Health' },
  { keywords: ['vegetable', 'salad', 'healthy', 'eat', 'food', 'meal', 'diet'], icon: Salad, category: 'Health' },
  { keywords: ['coffee', 'caffeine'], icon: Coffee, category: 'Health' },
  { keywords: ['alcohol', 'wine', 'beer', 'drink'], icon: Wine, category: 'Health' },
  { keywords: ['smoke', 'smoking', 'cigarette', 'quit'], icon: Cigarette, category: 'Health' },
  { keywords: ['no', 'stop', 'avoid', 'quit'], icon: Ban, category: 'Health' },

  // Learning
  { keywords: ['read', 'book', 'study', 'learn'], icon: BookOpen, category: 'Learning' },
  { keywords: ['write', 'journal', 'diary', 'note'], icon: Pen, category: 'Learning' },
  { keywords: ['code', 'coding', 'programming', 'developer'], icon: Code, category: 'Learning' },
  { keywords: ['language', 'spanish', 'french', 'learn'], icon: MessageCircle, category: 'Learning' },

  // Mindfulness
  { keywords: ['meditate', 'meditation', 'mindful', 'zen', 'calm'], icon: Brain, category: 'Mindfulness' },
  { keywords: ['gratitude', 'grateful', 'thankful'], icon: Heart, category: 'Mindfulness' },
  { keywords: ['focus', 'concentrate', 'attention'], icon: Eye, category: 'Mindfulness' },
  { keywords: ['breathe', 'breathing'], icon: Wind, category: 'Mindfulness' },
  { keywords: ['morning', 'wake', 'early'], icon: Sun, category: 'Productivity' },

  // Productivity
  { keywords: ['goal', 'target', 'aim'], icon: Target, category: 'Productivity' },
  { keywords: ['time', 'schedule', 'plan'], icon: Clock, category: 'Productivity' },
  { keywords: ['work', 'productive', 'task'], icon: Zap, category: 'Productivity' },
  { keywords: ['habit', 'routine', 'daily'], icon: Flame, category: 'Productivity' },
  { keywords: ['explore', 'adventure', 'travel'], icon: Compass, category: 'Productivity' },

  // Social
  { keywords: ['call', 'phone', 'contact'], icon: Phone, category: 'Social' },
  { keywords: ['friend', 'social', 'family', 'people'], icon: Users, category: 'Social' },

  // Creative
  { keywords: ['music', 'play', 'instrument', 'sing'], icon: Music, category: 'Creative' },
  { keywords: ['art', 'draw', 'paint', 'creative'], icon: Palette, category: 'Creative' },
  { keywords: ['photo', 'photography', 'camera'], icon: Camera, category: 'Creative' },
  { keywords: ['nature', 'plant', 'garden'], icon: Leaf, category: 'Creative' },

  // Achievement
  { keywords: ['win', 'achieve', 'success'], icon: Trophy, category: 'Productivity' },
  { keywords: ['complete', 'finish', 'done'], icon: Medal, category: 'Productivity' },
]

// Get the best matching icon for a habit
export function getHabitIcon(name: string, description?: string): LucideIcon {
  const searchText = `${name} ${description || ''}`.toLowerCase()

  let bestMatch: LucideIcon = Star
  let bestScore = 0

  for (const mapping of iconMappings) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        const score = keyword.length
        if (score > bestScore) {
          bestScore = score
          bestMatch = mapping.icon
        }
      }
    }
  }

  return bestMatch
}

interface HabitIconProps {
  name: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  isCompleted?: boolean
  isHovered?: boolean
  className?: string
}

export function HabitIcon({
  name,
  description,
  size = 'md',
  isCompleted = false,
  isHovered = false,
  className,
}: HabitIconProps) {
  const Icon = getHabitIcon(name, description)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      {/* Hexagonal frame background */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          {/* Gradient for frame */}
          <linearGradient id={`frame-gradient-${isCompleted ? 'complete' : 'default'}`} x1="0%" y1="0%" x2="100%" y2="100%">
            {isCompleted ? (
              <>
                <stop offset="0%" stopColor="hsl(145 80% 45%)" />
                <stop offset="100%" stopColor="hsl(160 80% 35%)" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="hsl(220 60% 50%)" />
                <stop offset="100%" stopColor="hsl(250 60% 40%)" />
              </>
            )}
          </linearGradient>

          {/* Glow filter */}
          <filter id="icon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Hexagon shape */}
        <polygon
          points="50,2 95,25 95,75 50,98 5,75 5,25"
          fill="hsl(260 30% 12%)"
          stroke={`url(#frame-gradient-${isCompleted ? 'complete' : 'default'})`}
          strokeWidth="3"
          className={cn(
            'transition-all duration-300',
            isHovered && 'filter drop-shadow-[0_0_10px_hsl(220,100%,60%)]'
          )}
        />

        {/* Inner glow */}
        <polygon
          points="50,10 88,30 88,70 50,90 12,70 12,30"
          fill="transparent"
          stroke={isCompleted ? 'hsl(145 80% 45% / 0.3)' : 'hsl(220 100% 60% / 0.2)'}
          strokeWidth="1"
        />
      </svg>

      {/* Icon */}
      <Icon
        className={cn(
          'relative z-10 transition-all duration-300',
          iconSizes[size],
          isCompleted
            ? 'text-emerald-400 drop-shadow-[0_0_8px_hsl(145,80%,45%)]'
            : 'text-blue-400 drop-shadow-[0_0_6px_hsl(220,100%,60%)]',
          isHovered && 'scale-110'
        )}
      />
    </div>
  )
}

// Animated skill icon with effects
interface AnimatedHabitIconProps extends HabitIconProps {
  pulseOnHover?: boolean
}

export function AnimatedHabitIcon({
  pulseOnHover = true,
  ...props
}: AnimatedHabitIconProps) {
  return (
    <div className={cn('relative', pulseOnHover && 'group')}>
      {/* Pulse effect on hover */}
      {pulseOnHover && (
        <div className="absolute inset-0 rounded-full bg-primary/20 scale-0 group-hover:scale-150 group-hover:opacity-0 transition-all duration-500" />
      )}
      <HabitIcon {...props} />
    </div>
  )
}
