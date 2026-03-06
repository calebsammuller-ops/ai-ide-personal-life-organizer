'use client'

import Link from 'next/link'
import { User, Bell, Palette, LogOut, ChevronRight, Shield, HelpCircle, Brain, History, CreditCard, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'
import { useSupabase } from '@/components/providers'
import { useRouter } from 'next/navigation'

const settingsItems = [
  {
    href: '/settings/profile',
    icon: User,
    title: 'Profile',
    description: 'Manage your account details',
  },
  {
    href: '/settings/subscription',
    icon: CreditCard,
    title: 'Subscription & Billing',
    description: 'Manage your plan and payment settings',
  },
  {
    href: '/settings/preferences',
    icon: Bell,
    title: 'Preferences',
    description: 'Notifications, reminders, and schedules',
  },
  {
    href: '/settings/scheduling',
    icon: Calendar,
    title: 'AI Scheduling',
    description: 'Configure auto-scheduling and focus time',
  },
  {
    href: '/settings/memories',
    icon: Brain,
    title: 'AI Memories',
    description: 'View and manage what the AI remembers about you',
  },
  {
    href: '/food-history',
    icon: History,
    title: 'Food History',
    description: 'View your food scanning history and nutrition',
  },
  {
    href: '/settings/preferences',
    icon: Palette,
    title: 'Appearance',
    description: 'Theme and display settings',
  },
  {
    href: '/settings/preferences',
    icon: Shield,
    title: 'Privacy',
    description: 'Data and security settings',
  },
  {
    href: '#',
    icon: HelpCircle,
    title: 'Help & Support',
    description: 'Get help and contact support',
  },
]

export default function SettingsPage() {
  const { supabase } = useSupabase()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Manage your account and preferences</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {settingsItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-4 p-4 hover:bg-accent transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-4 p-4 w-full hover:bg-accent transition-colors text-destructive"
            >
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">Sign out of your account</p>
              </div>
            </button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Life Organizer v0.1.0
        </p>
      </div>
    </PageContainer>
  )
}
