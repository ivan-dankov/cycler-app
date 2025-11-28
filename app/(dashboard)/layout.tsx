import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MobileNav from '@/components/navigation/MobileNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {children}
      <MobileNav />
    </div>
  )
}

