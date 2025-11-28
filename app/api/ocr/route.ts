import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromImage } from '@/lib/ocr/tesseract'
import { createClient } from '@/lib/supabase/server'

// Increase timeout for OCR processing
// Vercel Hobby: 10s, Pro: 60s, Enterprise: 300s
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const TIMEOUT_MS = 90000 // 90 seconds total timeout
  
  // Create a timeout promise
  const timeoutPromise = new Promise<NextResponse>((resolve) => {
    setTimeout(() => {
      resolve(
        NextResponse.json(
          { error: 'OCR processing timed out after 90 seconds. Try a smaller image or paste the text directly.' },
          { status: 408 }
        )
      )
    }, TIMEOUT_MS)
  })

  // Main processing function
  const processRequest = async (): Promise<NextResponse> => {
    try {
      console.log('[OCR API] Request received')
      
      // Verify authentication
      console.log('[OCR API] Verifying authentication...')
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.log('[OCR API] Unauthorized')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      console.log('[OCR API] User authenticated:', user.id)

      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        console.log('[OCR API] No file provided')
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.log('[OCR API] File too large:', file.size)
        return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
      }

      console.log('[OCR API] File received:', file.name, 'Size:', file.size, 'bytes')

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      console.log('[OCR API] Buffer created, size:', buffer.length, 'bytes')

      // Extract text using OCR (this has its own 60s timeout)
      console.log('[OCR API] Starting OCR extraction...')
      const extractedText = await extractTextFromImage(buffer)
      console.log('[OCR API] OCR complete, extracted text length:', extractedText.length)

      const duration = Date.now() - startTime
      console.log(`[OCR API] Total time: ${duration}ms`)

      return NextResponse.json({ text: extractedText })
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[OCR API] Error after ${duration}ms:`, error)
      
      let errorMessage = 'Failed to process image'
      if (error instanceof Error) {
        errorMessage = error.message
        if (errorMessage.includes('timeout')) {
          errorMessage = 'OCR processing timed out. Try a smaller image or paste the text directly.'
        }
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  }

  // Race between processing and timeout
  return Promise.race([processRequest(), timeoutPromise])
}

