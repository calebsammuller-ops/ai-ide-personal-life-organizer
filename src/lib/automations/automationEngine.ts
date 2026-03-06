import { createClient } from '@/lib/supabase/server'

type TriggerType = 'task_completed' | 'habit_completed' | 'habit_streak' | 'task_created'

interface AutomationRule {
  id: string
  trigger_type: TriggerType
  conditions: Record<string, unknown>
  action_type: string
  action_config: Record<string, unknown>
  is_active: boolean
}

interface TriggerContext {
  userId: string
  triggerType: TriggerType
  data: Record<string, unknown>
}

export async function evaluateTrigger(context: TriggerContext) {
  const supabase = createClient()

  // Fetch active rules matching this trigger
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('user_id', context.userId)
    .eq('trigger_type', context.triggerType)
    .eq('is_active', true)

  if (!rules || rules.length === 0) return []

  const results = []

  for (const rule of rules) {
    if (checkConditions(rule.conditions, context.data)) {
      const result = await executeAction(supabase, context.userId, rule)
      results.push({ ruleId: rule.id, success: result })

      // Update execution count
      await supabase
        .from('automation_rules')
        .update({
          execution_count: (rule.execution_count || 0) + 1,
          last_executed_at: new Date().toISOString(),
        })
        .eq('id', rule.id)
    }
  }

  return results
}

export function checkConditions(
  conditions: Record<string, unknown>,
  data: Record<string, unknown>
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true

  for (const [key, value] of Object.entries(conditions)) {
    if (data[key] !== value) return false
  }

  return true
}

async function executeAction(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  rule: AutomationRule
): Promise<boolean> {
  try {
    switch (rule.action_type) {
      case 'award_xp': {
        const amount = (rule.action_config.amount as number) || 50
        const reason = (rule.action_config.reason as string) || 'Automation reward'

        await supabase.from('xp_events').insert({
          user_id: userId,
          amount,
          reason,
          category: 'automation',
        })
        return true
      }

      case 'create_task': {
        const title = (rule.action_config.title as string) || 'Follow-up task'
        const priority = (rule.action_config.priority as string) || 'medium'

        await supabase.from('tasks').insert({
          user_id: userId,
          title,
          priority,
          status: 'todo',
        })
        return true
      }

      case 'notify': {
        // For now, just log. Could integrate with push notifications later.
        console.log(`[Automation] Notification for user ${userId}:`, rule.action_config.message)
        return true
      }

      case 'add_tag': {
        // Tags could be added to the triggering entity
        console.log(`[Automation] Tag action for user ${userId}:`, rule.action_config.tag)
        return true
      }

      default:
        console.warn(`Unknown action type: ${rule.action_type}`)
        return false
    }
  } catch (error) {
    console.error(`Automation action failed for rule ${rule.id}:`, error)
    return false
  }
}
