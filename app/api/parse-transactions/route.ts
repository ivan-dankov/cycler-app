import { NextRequest, NextResponse } from 'next/server'
import { parseTransactionsFromText } from '@/lib/openai/parse-transactions'
import { createClient } from '@/lib/supabase/server'

// Backend-only transaction parsing endpoint
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const TIMEOUT_MS = 60000 // 60 seconds timeout for parsing
  
  // Create a timeout promise
  const timeoutPromise = new Promise<NextResponse>((resolve) => {
    setTimeout(() => {
      resolve(
        NextResponse.json(
          { error: 'Transaction parsing timed out after 60 seconds. Try with a shorter text.' },
          { status: 408 }
        )
      )
    }, TIMEOUT_MS)
  })

  // Main processing function
  const processRequest = async (): Promise<NextResponse> => {
    try {
      console.log('[Parse API] Request received')
      
      // Verify authentication
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.log('[Parse API] Unauthorized')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      console.log('[Parse API] User authenticated:', user.id)

      const { text } = await request.json()

      if (!text || typeof text !== 'string') {
        console.log('[Parse API] Invalid text input')
        return NextResponse.json({ error: 'Text is required' }, { status: 400 })
      }

      if (text.trim().length === 0) {
        return NextResponse.json({ error: 'Text cannot be empty' }, { status: 400 })
      }

      console.log('[Parse API] Text received, length:', text.length, 'characters')

      // Fetch user's categories for better AI suggestions
      const { data: categories } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', user.id)
      
      const categoryNames = categories?.map(c => c.name) || []
      console.log('[Parse API] Found user categories:', categoryNames.length)

      // Parse transactions using OpenAI
      console.log('[Parse API] Starting transaction parsing...')
      const parseStartTime = Date.now()
      const transactions = await parseTransactionsFromText(text, categoryNames)
      const parseDuration = Date.now() - parseStartTime
      
      console.log(`[Parse API] Parsing complete in ${parseDuration}ms, found ${transactions.length} transactions`)

      const totalDuration = Date.now() - startTime
      console.log(`[Parse API] Total processing time: ${totalDuration}ms`)

      return NextResponse.json({ 
        transactions,
        stats: {
          parseTime: parseDuration,
          totalTime: totalDuration,
        }
      })
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[Parse API] Error after ${duration}ms:`, error)
      
      let errorMessage = 'Failed to parse transactions'
      if (error instanceof Error) {
        errorMessage = error.message
        if (errorMessage.includes('timeout')) {
          errorMessage = 'Parsing timed out. Try with a shorter text.'
        }
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  }

  // Race between processing and timeout
  return Promise.race([processRequest(), timeoutPromise])
}

