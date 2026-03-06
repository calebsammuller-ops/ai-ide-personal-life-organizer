'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ShoppingCart } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  selectShoppingList,
  selectSelectedWeek,
  fetchShoppingList,
  toggleShoppingItem,
} from '@/state/slices/mealPlanningSlice'

interface ShoppingListModalProps {
  open: boolean
  onClose: () => void
}

export function ShoppingListModal({ open, onClose }: ShoppingListModalProps) {
  const dispatch = useAppDispatch()
  const shoppingList = useAppSelector(selectShoppingList)
  const selectedWeek = useAppSelector(selectSelectedWeek)

  useEffect(() => {
    if (open) {
      dispatch(fetchShoppingList(selectedWeek.start))
    }
  }, [dispatch, open, selectedWeek.start])

  // Group items by category
  const groupedItems = shoppingList.reduce((acc, item, index) => {
    const category = item.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push({ ...item, index })
    return acc
  }, {} as Record<string, Array<typeof shoppingList[0] & { index: number }>>)

  const categories = Object.keys(groupedItems).sort()

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping List
          </DialogTitle>
          <DialogDescription>
            Ingredients for the week of {new Date(selectedWeek.start).toLocaleDateString('default', {
              month: 'short',
              day: 'numeric'
            })} - {new Date(selectedWeek.end).toLocaleDateString('default', {
              month: 'short',
              day: 'numeric'
            })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {shoppingList.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No items in your shopping list</p>
              <p className="text-sm">Add meals to your plan to generate a shopping list</p>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category}>
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {groupedItems[category].map((item) => (
                      <div
                        key={item.index}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50"
                      >
                        <Checkbox
                          id={`item-${item.index}`}
                          checked={item.checked}
                          onCheckedChange={() => dispatch(toggleShoppingItem(item.index))}
                        />
                        <label
                          htmlFor={`item-${item.index}`}
                          className={`flex-1 cursor-pointer ${
                            item.checked ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {item.amount} {item.unit}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
