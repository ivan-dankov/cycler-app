import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromImage } from '@/lib/ocr/tesseract'
import { parseTransactionsFromText } from '@/lib/openai/parse-transactions'
import { createClient } from '@/lib/supabase/server'

// Combined OCR + parsing endpoint for better performance
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const TIMEOUT_MS = 90000 // 90 seconds total timeout
  
  // Create a timeout promise
  const timeoutPromise = new Promise<NextResponse>((resolve) => {
    setTimeout(() => {
      resolve(
        NextResponse.json(
          { error: 'Processing timed out after 90 seconds. Try a smaller image or paste the text directly.' },
          { status: 408 }
        )
      )
    }, TIMEOUT_MS)
  })

  // Main processing function
  const processRequest = async (): Promise<NextResponse> => {
    try {
      console.log('[OCR+Parse API] Request received')
      
      // Verify authentication
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.log('[OCR+Parse API] Unauthorized')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      console.log('[OCR+Parse API] User authenticated:', user.id)

      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        console.log('[OCR+Parse API] No file provided')
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.log('[OCR+Parse API] File too large:', file.size)
        return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
      }

      console.log('[OCR+Parse API] File received:', file.name, 'Size:', file.size, 'bytes')

      // Step 1: Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      console.log('[OCR+Parse API] Buffer created, size:', buffer.length, 'bytes')

      // Step 2: Extract text using OCR
      console.log('[OCR+Parse API] Starting OCR extraction...')
      const ocrStartTime = Date.now()
      let extractedText: string
      let ocrDuration: number
      try {
        extractedText = await extractTextFromImage(buffer)
        ocrDuration = Date.now() - ocrStartTime
        console.log(`[OCR+Parse API] OCR complete in ${ocrDuration}ms, text length:`, extractedText.length)
      } catch (ocrError) {
        ocrDuration = Date.now() - ocrStartTime
        console.error(`[OCR+Parse API] OCR failed after ${ocrDuration}ms:`, ocrError)
        throw ocrError
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return NextResponse.json({ error: 'No text detected in image' }, { status: 400 })
      }

      // Fetch user's categories for better AI suggestions
      const { data: categories } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', user.id)
      
      const categoryNames = categories?.map(c => c.name) || []
      console.log('[OCR+Parse API] Found user categories:', categoryNames.length)

      // Step 3: Parse transactions using OpenAI (combined in same request)
      console.log('[OCR+Parse API] Starting transaction parsing...')
      const parseStartTime = Date.now()
      const transactions = await parseTransactionsFromText(extractedText, categoryNames)
      const parseDuration = Date.now() - parseStartTime
      console.log(`[OCR+Parse API] Parsing complete in ${parseDuration}ms, found ${transactions.length} transactions`)

      const totalDuration = Date.now() - startTime
      console.log(`[OCR+Parse API] Total processing time: ${totalDuration}ms (OCR: ${ocrDuration}ms, Parse: ${parseDuration}ms)`)

      return NextResponse.json({ 
        transactions,
        extractedText, // Include for review
        stats: {
          ocrTime: ocrDuration,
          parseTime: parseDuration,
          totalTime: totalDuration,
        }
      })
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[OCR+Parse API] Error after ${duration}ms:`, error)
      
      let errorMessage = 'Failed to process image'
      if (error instanceof Error) {
        errorMessage = error.message
        if (errorMessage.includes('timeout')) {
          errorMessage = 'Processing timed out. Try a smaller image or paste the text directly.'
        }
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  }

  // Race between processing and timeout
  try {
    return await Promise.race([processRequest(), timeoutPromise])
  } catch (error) {
    // Ensure we always return JSON, even on unexpected errors
    console.error('[OCR+Parse API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

