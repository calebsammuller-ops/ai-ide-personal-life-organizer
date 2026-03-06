/**
 * Smart icon suggestion system for habits
 * Analyzes habit names and descriptions to suggest appropriate emojis
 */

interface IconMapping {
  keywords: string[]
  icon: string
  category?: string
}

// Comprehensive mapping of keywords to icons
const iconMappings: IconMapping[] = [
  // Fitness & Exercise
  { keywords: ['run', 'running', 'jog', 'jogging', 'sprint'], icon: '🏃', category: 'Fitness' },
  { keywords: ['walk', 'walking', 'steps', 'stroll'], icon: '🚶', category: 'Fitness' },
  { keywords: ['gym', 'workout', 'exercise', 'lift', 'weights', 'strength', 'muscle'], icon: '💪', category: 'Fitness' },
  { keywords: ['yoga', 'stretch', 'stretching', 'flexibility'], icon: '🧘', category: 'Mindfulness' },
  { keywords: ['swim', 'swimming', 'pool'], icon: '🏊', category: 'Fitness' },
  { keywords: ['bike', 'cycling', 'bicycle', 'cycle'], icon: '🚴', category: 'Fitness' },
  { keywords: ['hike', 'hiking', 'trail', 'mountain'], icon: '🥾', category: 'Fitness' },
  { keywords: ['dance', 'dancing'], icon: '💃', category: 'Fitness' },
  { keywords: ['martial', 'karate', 'boxing', 'fight', 'mma'], icon: '🥊', category: 'Fitness' },
  { keywords: ['climb', 'climbing', 'boulder'], icon: '🧗', category: 'Fitness' },
  { keywords: ['tennis', 'racket'], icon: '🎾', category: 'Fitness' },
  { keywords: ['basketball', 'hoops'], icon: '🏀', category: 'Fitness' },
  { keywords: ['soccer', 'football'], icon: '⚽', category: 'Fitness' },
  { keywords: ['golf'], icon: '⛳', category: 'Fitness' },

  // Health & Wellness
  { keywords: ['water', 'hydrate', 'hydration', 'drink'], icon: '💧', category: 'Health' },
  { keywords: ['sleep', 'sleeping', 'bed', 'rest', 'nap'], icon: '😴', category: 'Health' },
  { keywords: ['vitamin', 'supplement', 'medicine', 'medication', 'pill'], icon: '💊', category: 'Health' },
  { keywords: ['doctor', 'checkup', 'health', 'medical'], icon: '🏥', category: 'Health' },
  { keywords: ['teeth', 'brush', 'floss', 'dental'], icon: '🦷', category: 'Health' },
  { keywords: ['skincare', 'skin', 'moisturize', 'face'], icon: '🧴', category: 'Health' },
  { keywords: ['shower', 'bath', 'hygiene', 'clean'], icon: '🚿', category: 'Health' },
  { keywords: ['sunscreen', 'spf', 'sun protection'], icon: '🧴', category: 'Health' },
  { keywords: ['posture', 'back', 'spine', 'ergonomic'], icon: '🧍', category: 'Health' },
  { keywords: ['eye', 'eyes', 'vision', 'screen break'], icon: '👁️', category: 'Health' },

  // Nutrition & Diet
  { keywords: ['eat', 'meal', 'food', 'nutrition', 'diet'], icon: '🍽️', category: 'Health' },
  { keywords: ['vegetable', 'vegetables', 'veggies', 'greens', 'salad'], icon: '🥗', category: 'Health' },
  { keywords: ['fruit', 'fruits', 'apple'], icon: '🍎', category: 'Health' },
  { keywords: ['protein', 'meat', 'chicken'], icon: '🍗', category: 'Health' },
  { keywords: ['breakfast'], icon: '🥐', category: 'Health' },
  { keywords: ['lunch'], icon: '🥪', category: 'Health' },
  { keywords: ['dinner'], icon: '🍝', category: 'Health' },
  { keywords: ['cook', 'cooking', 'recipe'], icon: '👨‍🍳', category: 'Health' },
  { keywords: ['coffee', 'caffeine'], icon: '☕', category: 'Health' },
  { keywords: ['tea'], icon: '🍵', category: 'Health' },
  { keywords: ['fast', 'fasting', 'intermittent'], icon: '⏰', category: 'Health' },
  { keywords: ['no sugar', 'sugar free', 'cut sugar'], icon: '🚫', category: 'Health' },
  { keywords: ['alcohol', 'sober', 'no drinking'], icon: '🚱', category: 'Health' },

  // Learning & Education
  { keywords: ['read', 'reading', 'book', 'books'], icon: '📚', category: 'Learning' },
  { keywords: ['study', 'studying', 'learn', 'learning', 'course'], icon: '📖', category: 'Learning' },
  { keywords: ['language', 'spanish', 'french', 'german', 'chinese', 'japanese', 'duolingo'], icon: '🗣️', category: 'Learning' },
  { keywords: ['write', 'writing', 'journal', 'journaling', 'diary'], icon: '✍️', category: 'Learning' },
  { keywords: ['code', 'coding', 'programming', 'developer', 'software'], icon: '💻', category: 'Learning' },
  { keywords: ['math', 'mathematics', 'calculate'], icon: '🔢', category: 'Learning' },
  { keywords: ['science', 'research', 'experiment'], icon: '🔬', category: 'Learning' },
  { keywords: ['news', 'current events', 'informed'], icon: '📰', category: 'Learning' },
  { keywords: ['podcast', 'listen', 'audio'], icon: '🎧', category: 'Learning' },
  { keywords: ['lecture', 'class', 'lesson'], icon: '🎓', category: 'Learning' },
  { keywords: ['practice', 'skill'], icon: '🎯', category: 'Learning' },

  // Mindfulness & Mental Health
  { keywords: ['meditate', 'meditation', 'mindful', 'mindfulness', 'zen'], icon: '🧘', category: 'Mindfulness' },
  { keywords: ['breathe', 'breathing', 'breath'], icon: '🌬️', category: 'Mindfulness' },
  { keywords: ['gratitude', 'grateful', 'thankful', 'appreciate'], icon: '🙏', category: 'Mindfulness' },
  { keywords: ['affirmation', 'positive', 'mantra'], icon: '✨', category: 'Mindfulness' },
  { keywords: ['therapy', 'therapist', 'mental health'], icon: '🧠', category: 'Mindfulness' },
  { keywords: ['relax', 'relaxation', 'calm', 'destress'], icon: '😌', category: 'Mindfulness' },
  { keywords: ['mood', 'emotion', 'feeling', 'check-in'], icon: '💭', category: 'Mindfulness' },
  { keywords: ['reflect', 'reflection', 'introspect'], icon: '🪞', category: 'Mindfulness' },
  { keywords: ['prayer', 'pray', 'spiritual'], icon: '🙏', category: 'Mindfulness' },
  { keywords: ['nature', 'outdoor', 'outside', 'fresh air'], icon: '🌳', category: 'Mindfulness' },

  // Productivity & Work
  { keywords: ['work', 'task', 'productive', 'productivity'], icon: '💼', category: 'Productivity' },
  { keywords: ['plan', 'planning', 'schedule', 'organize'], icon: '📋', category: 'Productivity' },
  { keywords: ['goal', 'goals', 'target'], icon: '🎯', category: 'Productivity' },
  { keywords: ['email', 'inbox', 'messages'], icon: '📧', category: 'Productivity' },
  { keywords: ['meeting', 'call', 'conference'], icon: '📞', category: 'Productivity' },
  { keywords: ['review', 'evaluate', 'assess'], icon: '📊', category: 'Productivity' },
  { keywords: ['focus', 'concentrate', 'deep work', 'pomodoro'], icon: '🎯', category: 'Productivity' },
  { keywords: ['clean', 'cleaning', 'tidy', 'declutter', 'organize'], icon: '🧹', category: 'Productivity' },
  { keywords: ['budget', 'finance', 'money', 'save', 'savings', 'invest'], icon: '💰', category: 'Productivity' },
  { keywords: ['no phone', 'screen time', 'digital detox', 'unplug'], icon: '📵', category: 'Productivity' },
  { keywords: ['wake', 'morning', 'early'], icon: '🌅', category: 'Productivity' },
  { keywords: ['night routine', 'evening', 'bedtime'], icon: '🌙', category: 'Productivity' },

  // Social & Relationships
  { keywords: ['family', 'parents', 'kids', 'children'], icon: '👨‍👩‍👧‍👦', category: 'Social' },
  { keywords: ['friend', 'friends', 'social', 'hangout'], icon: '👥', category: 'Social' },
  { keywords: ['call', 'phone', 'text', 'message', 'reach out'], icon: '📱', category: 'Social' },
  { keywords: ['date', 'partner', 'relationship', 'spouse'], icon: '❤️', category: 'Social' },
  { keywords: ['pet', 'dog', 'cat', 'animal'], icon: '🐾', category: 'Social' },
  { keywords: ['volunteer', 'help', 'community', 'charity'], icon: '🤝', category: 'Social' },
  { keywords: ['network', 'networking', 'connect'], icon: '🔗', category: 'Social' },

  // Creative & Hobbies
  { keywords: ['art', 'draw', 'drawing', 'paint', 'painting', 'sketch'], icon: '🎨', category: 'Creative' },
  { keywords: ['music', 'play', 'instrument', 'guitar', 'piano', 'sing'], icon: '🎵', category: 'Creative' },
  { keywords: ['photo', 'photography', 'camera'], icon: '📷', category: 'Creative' },
  { keywords: ['garden', 'gardening', 'plant', 'plants'], icon: '🌱', category: 'Creative' },
  { keywords: ['craft', 'diy', 'make', 'create', 'build'], icon: '🔨', category: 'Creative' },
  { keywords: ['knit', 'crochet', 'sew', 'sewing'], icon: '🧶', category: 'Creative' },
  { keywords: ['game', 'gaming', 'play'], icon: '🎮', category: 'Creative' },
  { keywords: ['puzzle', 'crossword', 'sudoku', 'brain'], icon: '🧩', category: 'Creative' },
  { keywords: ['chess'], icon: '♟️', category: 'Creative' },
  { keywords: ['movie', 'film', 'watch'], icon: '🎬', category: 'Creative' },
  { keywords: ['travel', 'trip', 'adventure', 'explore'], icon: '✈️', category: 'Creative' },

  // Habits to quit/reduce
  { keywords: ['quit', 'stop', 'no', 'avoid', 'reduce'], icon: '🚫', category: 'Health' },
  { keywords: ['smoke', 'smoking', 'cigarette', 'vape'], icon: '🚭', category: 'Health' },
  { keywords: ['junk food', 'fast food', 'unhealthy'], icon: '🍔', category: 'Health' },
]

// Default icons for categories when no specific match is found
const categoryDefaults: Record<string, string> = {
  Health: '❤️',
  Fitness: '🏋️',
  Learning: '📚',
  Mindfulness: '🧘',
  Productivity: '⚡',
  Social: '👥',
  Creative: '🎨',
  default: '⭐',
}

/**
 * Suggests an appropriate icon based on the habit name and description
 */
export function suggestHabitIcon(name: string, description?: string): { icon: string; category?: string } {
  const searchText = `${name} ${description || ''}`.toLowerCase()

  // Find the best matching icon
  let bestMatch: IconMapping | null = null
  let bestScore = 0

  for (const mapping of iconMappings) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        // Longer keyword matches are more specific, so give them higher scores
        const score = keyword.length
        if (score > bestScore) {
          bestScore = score
          bestMatch = mapping
        }
      }
    }
  }

  if (bestMatch) {
    return { icon: bestMatch.icon, category: bestMatch.category }
  }

  // No match found, return default
  return { icon: categoryDefaults.default }
}

/**
 * Get default icon for a category
 */
export function getCategoryDefaultIcon(category: string): string {
  return categoryDefaults[category] || categoryDefaults.default
}

/**
 * Get all available icons grouped by category (for manual selection)
 */
export function getIconsByCategory(): Record<string, string[]> {
  const grouped: Record<string, Set<string>> = {}

  for (const mapping of iconMappings) {
    const category = mapping.category || 'Other'
    if (!grouped[category]) {
      grouped[category] = new Set()
    }
    grouped[category].add(mapping.icon)
  }

  // Convert Sets to arrays
  const result: Record<string, string[]> = {}
  for (const [category, icons] of Object.entries(grouped)) {
    result[category] = Array.from(icons)
  }

  return result
}

/**
 * Get a flat list of unique icons
 */
export function getAllIcons(): string[] {
  const icons = new Set<string>()
  for (const mapping of iconMappings) {
    icons.add(mapping.icon)
  }
  // Add some extras
  const extras = ['⭐', '🌟', '💫', '🔥', '💎', '🏆', '🎖️', '🌈', '☀️', '🌸', '🍀', '🦋']
  extras.forEach(icon => icons.add(icon))
  return Array.from(icons)
}
