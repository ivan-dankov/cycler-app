import { NextResponse } from 'next/server'
import { initializeWorkers, getPoolSize } from '@/lib/ocr/worker-pool'

// Endpoint to manually trigger OCR worker initialization
export async function GET() {
  try {
    const poolSizeBefore = getPoolSize()
    await initializeWorkers()
    const poolSizeAfter = getPoolSize()
    
    return NextResponse.json({
      success: true,
      message: 'OCR workers initialized',
      poolSize: poolSizeAfter,
      wasAlreadyInitialized: poolSizeBefore > 0,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize workers',
      },
      { status: 500 }
    )
  }
}


