'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Clock, Flame, Users } from 'lucide-react'
import type { MealPlan } from '@/types'

interface ViewMealModalProps {
  open: boolean
  onClose: () => void
  meal?: MealPlan
}

const mealTypeLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export function ViewMealModal({ open, onClose, meal }: ViewMealModalProps) {
  if (!meal) return null

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{mealTypeLabels[meal.mealType]}</Badge>
            {meal.isFavorite && <Badge variant="secondary">Favorite</Badge>}
          </div>
          <DialogTitle className="text-xl">{meal.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {meal.description && (
            <p className="text-muted-foreground">{meal.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            {meal.calories && (
              <div className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>{meal.calories} calories</span>
              </div>
            )}
            {meal.prepTimeMinutes && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>{meal.prepTimeMinutes} min prep</span>
              </div>
            )}
            {meal.cookTimeMinutes && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-red-500" />
                <span>{meal.cookTimeMinutes} min cook</span>
              </div>
            )}
            {meal.servings > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-green-500" />
                <span>{meal.servings} serving{meal.servings > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {meal.ingredients.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Ingredients</h4>
              <ul className="space-y-1 text-sm">
                {meal.ingredients.map((ingredient, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {ingredient.amount} {ingredient.unit} {ingredient.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {meal.instructions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Instructions</h4>
              <ol className="space-y-2 text-sm">
                {meal.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {meal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {meal.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {meal.recipeUrl && (
            <a
              href={meal.recipeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm hover:underline"
            >
              View full recipe
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
