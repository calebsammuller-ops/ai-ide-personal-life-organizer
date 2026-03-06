'use client'

import { PageContainer } from '@/components/layout/PageContainer'
import { InsightsDashboard } from '@/components/insights/InsightsDashboard'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

export default function InsightsPage() {
  useRegisterPageContext({
    pageTitle: 'Insights',
  })

  return (
    <PageContainer>
      <InsightsDashboard />
    </PageContainer>
  )
}
