'use client'

import { useState, useEffect } from 'react'
import {
  Flame,
  Drumstick,
  Wheat,
  Droplets,
  Leaf,
  Edit2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  ChefHat,
  History,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FoodScanner } from '@/components/food/FoodScanner'
import { useToast } from '@/components/ui/toaster'
import { useAppDispatch } from '@/state/hooks'
import { openModal } from '@/state/slices/uiSlice'
import { cn } from '@/lib/utils'

interface FoodItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

interface RecipeSuggestion {
  name: string
  description: string
  additionalIngredients: string[]
  estimatedTime: number
  difficulty: 'easy' | 'medium' | 'hard'
}

interface DietaryNote {
  type: 'warning' | 'info' | 'success'
  message: string
}

interface EnhancedFoodScanResult {
  items: FoodItem[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number
  mealName: string
  recipeSuggestions: RecipeSuggestion[]
  dietaryNotes: DietaryNote[]
  healthScore: number
  matchedDietaryGoals: string[]
  missingNutrients: string[]
}

interface DietaryComparison {
  goals: Record<string, number>
  consumed: Record<string, number>
  afterMeal: Record<string, number>
  percentages: Record<string, number>
  remaining: Record<string, number>
  warnings: string[]
  recommendations: string[]
}

interface FoodScanModalProps {
  open: boolean
  onClose: () => void
}

export function FoodScanModal({ open, onClose }: FoodScanModalProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanResult, setScanResult] = useState<EnhancedFoodScanResult | null>(null)
  const [editedResult, setEditedResult] = useState<EnhancedFoodScanResult | null>(null)
  const [showRecipes, setShowRecipes] = useState(false)
  const [showGoals, setShowGoals] = useState(false)
  const [dietaryComparison, setDietaryComparison] = useState<DietaryComparison | null>(null)
  const [isSavingToHistory, setIsSavingToHistory] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSuggestion | null>(null)

  // Fetch dietary comparison when result is received
  useEffect(() => {
    if (scanResult) {
      fetchDietaryComparison(scanResult)
    }
  }, [scanResult])

  const fetchDietaryComparison = async (result: EnhancedFoodScanResult) => {
    try {
      const response = await fetch('/api/food-scan/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanResult: result }),
      })
      if (response.ok) {
        const data = await response.json()
        setDietaryComparison(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch dietary comparison:', error)
    }
  }

  const handleCapture = async (imageData: string) => {
    setIsProcessing(true)

    try {
      const response = await fetch('/api/food-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze food')
      }

      setScanResult(data.data)
      setEditedResult(data.data)
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Could not analyze the food image',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLogToHistory = async () => {
    if (!editedResult) return
    setIsSavingToHistory(true)

    try {
      const response = await fetch('/api/food-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedResult),
      })

      if (response.ok) {
        toast({
          title: 'Logged',
          description: 'Food logged to your history',
          variant: 'success',
        })
      }
    } catch (error) {
      console.error('Failed to log food:', error)
    } finally {
      setIsSavingToHistory(false)
    }
  }

  const handleAddToMeal = () => {
    if (!editedResult) return

    dispatch(openModal({
      modalName: 'createMeal',
      data: {
        prefill: {
          name: editedResult.mealName,
          calories: editedResult.totalCalories,
          nutritionalInfo: {
            calories: editedResult.totalCalories,
            protein: editedResult.totalProtein,
            carbs: editedResult.totalCarbs,
            fat: editedResult.totalFat,
            fiber: editedResult.totalFiber,
          },
        },
      },
    }))

    toast({
      title: 'Food analyzed',
      description: `${editedResult.mealName} - ${editedResult.totalCalories} calories`,
      variant: 'success',
    })

    handleClose()
  }

  const handleClose = () => {
    setScanResult(null)
    setEditedResult(null)
    setDietaryComparison(null)
    setIsProcessing(false)
    setShowRecipes(false)
    setShowGoals(false)
    setSelectedRecipe(null)
    onClose()
  }

  const handleAddRecipeToMeal = (recipe: RecipeSuggestion) => {
    dispatch(openModal({
      modalName: 'createMeal',
      data: {
        prefill: {
          name: recipe.name,
          description: recipe.description,
          prepTimeMinutes: recipe.estimatedTime,
        },
      },
    }))

    toast({
      title: 'Recipe selected',
      description: `${recipe.name} added to meal planning`,
      variant: 'success',
    })

    setSelectedRecipe(null)
  }

  const updateTotals = (items: FoodItem[]) => {
    return {
      totalCalories: items.reduce((sum, item) => sum + item.calories, 0),
      totalProtein: items.reduce((sum, item) => sum + item.protein, 0),
      totalCarbs: items.reduce((sum, item) => sum + item.carbs, 0),
      totalFat: items.reduce((sum, item) => sum + item.fat, 0),
      totalFiber: items.reduce((sum, item) => sum + item.fiber, 0),
    }
  }

  const updateItemField = (index: number, field: keyof FoodItem, value: string | number) => {
    if (!editedResult) return

    const newItems = [...editedResult.items]
    newItems[index] = { ...newItems[index], [field]: value }

    const totals = updateTotals(newItems)
    setEditedResult({
      ...editedResult,
      items: newItems,
      ...totals,
    })
  }

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getNoteColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200'
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200'
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan Food</DialogTitle>
          <DialogDescription>
            Take a photo or upload an image to analyze calories and nutrition
          </DialogDescription>
        </DialogHeader>

        {!scanResult ? (
          <FoodScanner onCapture={handleCapture} isProcessing={isProcessing} />
        ) : (
          <div className="space-y-4">
            {/* Health Score */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold",
                  editedResult?.healthScore && editedResult.healthScore >= 7
                    ? "bg-green-100 text-green-700"
                    : editedResult?.healthScore && editedResult.healthScore >= 4
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                )}
              >
                {editedResult?.healthScore || 5}/10
              </div>
              <div>
                <p className="font-medium">Health Score</p>
                <p className="text-xs text-muted-foreground">Based on nutritional balance</p>
              </div>
            </div>

            {/* Meal Name */}
            <div className="space-y-2">
              <Label>Meal Name</Label>
              <Input
                value={editedResult?.mealName || ''}
                onChange={(e) => setEditedResult(prev => prev ? { ...prev, mealName: e.target.value } : null)}
              />
            </div>

            {/* Totals Summary */}
            <div className="grid grid-cols-5 gap-2 p-3 rounded-lg bg-muted">
              <div className="text-center">
                <Flame className="h-4 w-4 mx-auto text-orange-500" />
                <p className="text-lg font-bold">{editedResult?.totalCalories}</p>
                <p className="text-xs text-muted-foreground">cal</p>
              </div>
              <div className="text-center">
                <Drumstick className="h-4 w-4 mx-auto text-red-500" />
                <p className="text-lg font-bold">{editedResult?.totalProtein}g</p>
                <p className="text-xs text-muted-foreground">protein</p>
              </div>
              <div className="text-center">
                <Wheat className="h-4 w-4 mx-auto text-amber-500" />
                <p className="text-lg font-bold">{editedResult?.totalCarbs}g</p>
                <p className="text-xs text-muted-foreground">carbs</p>
              </div>
              <div className="text-center">
                <Droplets className="h-4 w-4 mx-auto text-blue-500" />
                <p className="text-lg font-bold">{editedResult?.totalFat}g</p>
                <p className="text-xs text-muted-foreground">fat</p>
              </div>
              <div className="text-center">
                <Leaf className="h-4 w-4 mx-auto text-green-500" />
                <p className="text-lg font-bold">{editedResult?.totalFiber}g</p>
                <p className="text-xs text-muted-foreground">fiber</p>
              </div>
            </div>

            {/* Daily Goal Progress */}
            {dietaryComparison && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto"
                  onClick={() => setShowGoals(!showGoals)}
                >
                  <span className="font-medium text-sm">Daily Goal Progress</span>
                  {showGoals ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {showGoals && (
                  <div className="space-y-3 p-3 rounded-lg border">
                    {['calories', 'protein', 'carbs', 'fat', 'fiber'].map((nutrient) => (
                      <div key={nutrient} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize">{nutrient}</span>
                          <span className={cn(
                            dietaryComparison.percentages[nutrient] > 100 && "text-red-600 font-medium"
                          )}>
                            {dietaryComparison.percentages[nutrient]}%
                          </span>
                        </div>
                        <Progress
                          value={Math.min(dietaryComparison.percentages[nutrient], 100)}
                          className={cn(
                            "h-2",
                            dietaryComparison.percentages[nutrient] > 100 && "[&>div]:bg-red-500"
                          )}
                        />
                      </div>
                    ))}
                    {dietaryComparison.warnings.length > 0 && (
                      <div className="space-y-1 pt-2">
                        {dietaryComparison.warnings.map((warning, i) => (
                          <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}
                    {dietaryComparison.recommendations.length > 0 && (
                      <div className="space-y-1">
                        {dietaryComparison.recommendations.map((rec, i) => (
                          <p key={i} className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {rec}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Dietary Notes */}
            {editedResult?.dietaryNotes && editedResult.dietaryNotes.length > 0 && (
              <div className="space-y-2">
                <Label>Dietary Notes</Label>
                <div className="space-y-2">
                  {editedResult.dietaryNotes.map((note, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-2 rounded-lg text-sm flex items-start gap-2 border",
                        getNoteColor(note.type)
                      )}
                    >
                      {getNoteIcon(note.type)}
                      <span>{note.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipe Suggestions */}
            {editedResult?.recipeSuggestions && editedResult.recipeSuggestions.length > 0 && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto"
                  onClick={() => setShowRecipes(!showRecipes)}
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    <ChefHat className="h-4 w-4" />
                    Recipe Suggestions ({editedResult.recipeSuggestions.length})
                  </span>
                  {showRecipes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {showRecipes && (
                  <div className="space-y-2">
                    {editedResult.recipeSuggestions.map((recipe, index) => (
                      <button
                        key={index}
                        className={cn(
                          "w-full p-3 rounded-lg border text-left transition-colors hover:bg-muted/50",
                          selectedRecipe?.name === recipe.name && "border-primary bg-primary/5"
                        )}
                        onClick={() => setSelectedRecipe(selectedRecipe?.name === recipe.name ? null : recipe)}
                      >
                        <p className="font-medium">{recipe.name}</p>
                        <p className="text-sm text-muted-foreground">{recipe.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {recipe.estimatedTime} min
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {recipe.difficulty}
                          </Badge>
                        </div>
                        {recipe.additionalIngredients && recipe.additionalIngredients.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Also needs: {recipe.additionalIngredients.join(', ')}
                          </p>
                        )}
                      </button>
                    ))}

                    {/* Selected recipe actions */}
                    {selectedRecipe && (
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-3">
                        <div className="flex items-center gap-2">
                          <ChefHat className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">Recipe Selected</span>
                        </div>
                        <p className="text-sm">{selectedRecipe.name}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRecipe(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAddRecipeToMeal(selectedRecipe)}
                          >
                            Add to Meal Plan
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Individual Items */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Food Items</Label>
                <Edit2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Click to edit</span>
              </div>
              {editedResult?.items.map((item, index) => (
                <div key={index} className="p-3 rounded-lg border space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItemField(index, 'name', e.target.value)}
                      className="font-medium"
                    />
                    <Input
                      value={item.portion}
                      onChange={(e) => updateItemField(index, 'portion', e.target.value)}
                      className="w-24"
                    />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <div>
                      <Label className="text-xs">Calories</Label>
                      <Input
                        type="number"
                        value={item.calories}
                        onChange={(e) => updateItemField(index, 'calories', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Protein</Label>
                      <Input
                        type="number"
                        value={item.protein}
                        onChange={(e) => updateItemField(index, 'protein', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Carbs</Label>
                      <Input
                        type="number"
                        value={item.carbs}
                        onChange={(e) => updateItemField(index, 'carbs', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fat</Label>
                      <Input
                        type="number"
                        value={item.fat}
                        onChange={(e) => updateItemField(index, 'fat', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fiber</Label>
                      <Input
                        type="number"
                        value={item.fiber}
                        onChange={(e) => updateItemField(index, 'fiber', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {scanResult && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setScanResult(null); setEditedResult(null); setDietaryComparison(null); }}>
              Scan Again
            </Button>
            <Button
              variant="outline"
              onClick={handleLogToHistory}
              disabled={isSavingToHistory}
            >
              <History className="h-4 w-4 mr-2" />
              {isSavingToHistory ? 'Logging...' : 'Log to History'}
            </Button>
            <Button onClick={handleAddToMeal}>
              Add to Meal Plan
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
