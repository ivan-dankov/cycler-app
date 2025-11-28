import { NextResponse } from 'next/server'
import { seedDefaultCategoriesForUser } from '@/lib/utils/seed-default-categories'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await seedDefaultCategoriesForUser(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error seeding categories:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to seed categories' },
      { status: 500 }
    )
  }
}
