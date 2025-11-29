import { createWorker, PSM } from 'tesseract.js'

// Pre-loaded worker pool for faster OCR
let workerPool: any[] = []
let isInitialized = false
const MAX_WORKERS = 2 // Keep 2 workers ready

export async function initializeWorkers() {
  if (isInitialized) {
    return
  }

  console.log('[OCR] Pre-loading Tesseract workers and language data...')
  const startTime = Date.now()

  try {
    // Pre-load workers in parallel
    const initPromises = Array.from({ length: MAX_WORKERS }, async () => {
      const worker = await createWorker('eng', 1)
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$€£¥-: /',
      })
      return worker
    })

    workerPool = await Promise.all(initPromises)
    isInitialized = true

    const duration = Date.now() - startTime
    console.log(`[OCR] Workers pre-loaded in ${duration}ms (${MAX_WORKERS} workers ready)`)
  } catch (error) {
    console.error('[OCR] Failed to pre-load workers:', error)
    // Continue anyway - workers will be created on-demand
  }
}

export function getWorker(): any | null {
  return workerPool.pop() || null
}

export function returnWorker(worker: any) {
  if (worker && workerPool.length < MAX_WORKERS) {
    workerPool.push(worker)
  } else if (worker) {
    // Pool is full, terminate this worker
    worker.terminate().catch(() => {})
  }
}

export function getPoolSize(): number {
  return workerPool.length
}


