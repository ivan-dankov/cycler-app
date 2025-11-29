import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CyclesManager from '@/components/cycles/CyclesManager'
import { format } from 'date-fns'

async function getCurrentCycle(userId: string) {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: cycle } = await supabase
    .from('budget_cycles')
    .select('*')
    .eq('user_id', userId)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  return cycle || null
}

async function getCycles(userId: string) {
  const supabase = await createClient()

  const { data: cycles } = await supabase
    .from('budget_cycles')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })

  return cycles || []
}

export default async function CyclesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const currentCycle = await getCurrentCycle(user.id)
  const cycles = await getCycles(user.id)

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Cycles</h1>
        <CyclesManager
          cycles={cycles}
          currentCycle={currentCycle}
        />
      </div>
    </div>
  )
}


