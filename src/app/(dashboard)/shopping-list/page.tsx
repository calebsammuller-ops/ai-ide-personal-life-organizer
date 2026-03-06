'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Plus, Trash2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

interface ShoppingItem {
  id: string
  name: string
  quantity: string | null
  category: string
  is_checked: boolean
  created_at: string
}

const CATEGORIES = ['produce', 'protein', 'dairy', 'grains', 'pantry', 'frozen', 'beverages', 'general']

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [isAdding, setIsAdding] = useState(false)
  const [showInput, setShowInput] = useState(false)

  useRegisterPageContext({ pageTitle: 'Shopping List' })

  const fetchItems = useCallback(async () => {
    const res = await fetch('/api/shopping-list')
    if (res.ok) {
      const { data } = await res.json()
      setItems(data || [])
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const addItem = async () => {
    if (!newItem.trim()) return
    setIsAdding(true)
    await fetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItem.trim(), quantity: newQty.trim() || null, category: newCategory }),
    })
    setNewItem('')
    setNewQty('')
    setNewCategory('general')
    setShowInput(false)
    await fetchItems()
    setIsAdding(false)
  }

  const toggleItem = async (id: string, checked: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_checked: checked } : i))
    await fetch('/api/shopping-list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_checked: checked }),
    })
  }

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/shopping-list?id=${id}`, { method: 'DELETE' })
  }

  const clearChecked = async () => {
    setItems(prev => prev.filter(i => !i.is_checked))
    await fetch('/api/shopping-list?clearChecked=true', { method: 'DELETE' })
  }

  const grouped = CATEGORIES.reduce<Record<string, ShoppingItem[]>>((acc, cat) => {
    const catItems = items.filter(i => (i.category || 'general') === cat)
    if (catItems.length > 0) acc[cat] = catItems
    return acc
  }, {})

  const checkedCount = items.filter(i => i.is_checked).length
  const totalCount = items.length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto py-4 px-4 max-w-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-5 bg-primary" />
          <h1 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            SHOPPING LIST
          </h1>
          {totalCount > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {checkedCount}/{totalCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {checkedCount > 0 && (
            <button
              onClick={clearChecked}
              className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear done
            </button>
          )}
          <button
            onClick={() => setShowInput(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            {showInput ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {showInput ? 'Cancel' : 'Add Item'}
          </button>
        </div>
      </div>

      {/* Add item form */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 border border-primary/30 bg-card/50 p-3 space-y-2"
          >
            <input
              autoFocus
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Item name..."
              className="w-full bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground font-mono border-b border-border/40 pb-1"
            />
            <div className="flex gap-2">
              <input
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
                placeholder="Qty (optional)"
                className="flex-1 bg-transparent text-xs outline-none text-muted-foreground font-mono"
              />
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="bg-transparent text-[10px] font-mono uppercase text-muted-foreground outline-none border border-border/30 px-1"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={addItem}
                disabled={isAdding || !newItem.trim()}
                className="px-3 py-1 text-[10px] font-mono uppercase bg-primary text-white disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-xs font-mono uppercase tracking-wider">No items yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Add items or ask the Strategist to plan meals</p>
        </div>
      )}

      {/* Grouped items */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, catItems]) => (
          <div key={category}>
            <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 mb-1.5">
              {category}
            </p>
            <div className="space-y-1">
              {catItems.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 border transition-all',
                    item.is_checked
                      ? 'border-border/20 bg-card/20'
                      : 'border-border/40 bg-card/50 hover:border-primary/30'
                  )}
                >
                  <button
                    onClick={() => toggleItem(item.id, !item.is_checked)}
                    className={cn(
                      'w-4 h-4 border flex items-center justify-center shrink-0 transition-colors',
                      item.is_checked
                        ? 'border-primary bg-primary text-white'
                        : 'border-border/60 hover:border-primary'
                    )}
                  >
                    {item.is_checked && <Check className="h-2.5 w-2.5" />}
                  </button>
                  <span className={cn(
                    'flex-1 text-sm font-mono transition-all',
                    item.is_checked ? 'line-through text-muted-foreground/40' : 'text-foreground'
                  )}>
                    {item.name}
                    {item.quantity && (
                      <span className="text-muted-foreground text-xs ml-2">({item.quantity})</span>
                    )}
                  </span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="opacity-0 hover:opacity-100 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
