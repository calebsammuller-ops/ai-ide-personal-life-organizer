import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { ModalManager } from '@/components/modals'
import { SearchModal } from '@/components/modals/SearchModal'
import { ConsentGate } from '@/components/consent/ConsentGate'
import { Toaster } from '@/components/ui/toaster'
import { DashboardClientLayout } from '@/components/layout/DashboardClientLayout'
import { AIContextProvider } from '@/providers/AIContextProvider'
import { MotionProvider } from '@/providers/MotionProvider'
import { FloatingAssistant } from '@/components/floating-assistant/FloatingAssistant'
import { GlitchBackground } from '@/components/layout/GlitchBackground'
import { RightPanel } from '@/components/layout/RightPanel'
import { LockInBanner } from '@/components/lock-in/LockInBanner'
import { MicroReward } from '@/components/ui/MicroReward'
import { StarfieldBackground } from '@/components/ui/StarfieldBackground'
import { CursorGlow } from '@/components/ui/CursorGlow'
import { SessionFadeIn } from '@/components/ui/SessionFadeIn'
import { IdleWatcher } from '@/components/ui/IdleWatcher'
import { MicroObservation } from '@/components/ui/MicroObservation'

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
              <StarfieldBackground />
              <CursorGlow />
              <SessionFadeIn />
              <IdleWatcher />
              <MicroObservation />
              <GlitchBackground />
              <Sidebar />
              <div className="flex flex-1 flex-col min-w-0">
                <Header />
                <LockInBanner />
                {children}
                <BottomNav />
              </div>
              <RightPanel />
              <ModalManager />
              <SearchModal />
              <ConsentGate><span /></ConsentGate>
            </div>
            <FloatingAssistant />
            <MicroReward />
          </AIContextProvider>
        </MotionProvider>
      </DashboardClientLayout>
    </Toaster>
  )
}
