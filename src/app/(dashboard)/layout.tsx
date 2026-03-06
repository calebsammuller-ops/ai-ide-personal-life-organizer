import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { ModalManager } from '@/components/modals'
import { SearchModal } from '@/components/modals/SearchModal'
import { ConsentGate } from '@/components/consent/ConsentGate'
import { Toaster } from '@/components/ui/toaster'
import { ReminderBanner } from '@/components/common/ReminderBanner'
import { DashboardClientLayout } from '@/components/layout/DashboardClientLayout'
import { AIContextProvider } from '@/providers/AIContextProvider'
import { MotionProvider } from '@/providers/MotionProvider'
import { FloatingAssistant } from '@/components/floating-assistant/FloatingAssistant'
import { GlitchBackground } from '@/components/layout/GlitchBackground'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Toaster>
      <DashboardClientLayout>
        <MotionProvider>
          <AIContextProvider>
            <div className="flex min-h-screen">
              <GlitchBackground />
              <Sidebar />
              <div className="flex flex-1 flex-col">
                <Header />
                <ReminderBanner />
                {children}
                <BottomNav />
              </div>
              <ModalManager />
              <SearchModal />
              <ConsentGate><span /></ConsentGate>
            </div>
            <FloatingAssistant />
          </AIContextProvider>
        </MotionProvider>
      </DashboardClientLayout>
    </Toaster>
  )
}
