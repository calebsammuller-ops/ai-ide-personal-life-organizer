'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchRules,
  fetchTemplates,
  selectTemplates,
} from '@/state/slices/automationsSlice'
import type { AutomationTemplate } from '@/state/slices/automationsSlice'
import { AutomationList } from '@/components/automations/AutomationList'
import { AutomationBuilder } from '@/components/automations/AutomationBuilder'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Zap } from 'lucide-react'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

export default function AutomationsPage() {
  const dispatch = useAppDispatch()
  const templates = useAppSelector(selectTemplates)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | undefined>(undefined)

  useRegisterPageContext({
    pageTitle: 'Automations',
    visibleContent: {
      type: 'automations',
      templateCount: templates.length,
    },
  })

  useEffect(() => {
    dispatch(fetchRules())
    dispatch(fetchTemplates())
  }, [dispatch])

  const handleOpenBuilder = (template?: AutomationTemplate) => {
    setSelectedTemplate(template)
    setIsBuilderOpen(true)
  }

  const handleCloseBuilder = () => {
    setIsBuilderOpen(false)
    setSelectedTemplate(undefined)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto py-4 px-4 max-w-5xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-5 bg-primary" />
          <h1 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
            <Zap className="h-4 w-4" />
            AUTOMATIONS
          </h1>
        </div>

        <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenBuilder()}
              size="sm"
              className="h-7 px-3 text-[10px] font-mono uppercase tracking-wider rounded-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border/50 max-w-lg rounded-sm">
            <DialogHeader>
              <DialogTitle className="text-xs font-mono uppercase tracking-widest">
                {selectedTemplate ? 'CREATE FROM TEMPLATE' : 'NEW AUTOMATION'}
              </DialogTitle>
            </DialogHeader>
            <AutomationBuilder
              onClose={handleCloseBuilder}
              template={selectedTemplate}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Automation Rules */}
      <div className="mb-6">
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-3">YOUR RULES</p>
        <AutomationList />
      </div>

      {/* Templates Gallery */}
      {templates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-3">TEMPLATES</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <Card
                  className="cursor-pointer border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 rounded-sm"
                  onClick={() => handleOpenBuilder(template)}
                >
                  <CardHeader className="pb-2 px-3 pt-3">
                    <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider">
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <p className="text-[10px] text-muted-foreground font-mono mb-3 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono uppercase tracking-wider border-primary/30 text-primary rounded-sm px-1.5"
                      >
                        {template.triggerType.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-muted-foreground/50 text-[9px] font-mono">then</span>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono uppercase tracking-wider border-primary/30 text-primary rounded-sm px-1.5"
                      >
                        {template.actionType.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
