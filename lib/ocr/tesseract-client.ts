'use client'

import { createWorker, PSM } from 'tesseract.js'

export async function extractTextFromImageClient(file: File): Promise<string> {
  let worker: any = null
  
  try {
    console.log('[OCR Client] Starting extraction for file:', file.name)
    
    // Create worker (may take 30-60s on first use - downloading language data)
    console.log('[OCR Client] Creating worker (may take 30-60s on first use)...')
    const workerStartTime = Date.now()
    
    worker = await createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          const progress = m.progress ? Math.round(m.progress * 100) : 0
          console.log(`[OCR Client] Recognition progress: ${progress}%`)
        } else if (m.status) {
          console.log(`[OCR Client] Worker status: ${m.status}`)
        }
      },
    })
    
    const workerTime = Date.now() - workerStartTime
    console.log(`[OCR Client] Worker created in ${workerTime}ms`)
    
    // Optimize OCR settings for speed
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$€£¥-: /',
    })
    console.log('[OCR Client] Worker configured')
    
    // Recognize text from file
    console.log('[OCR Client] Recognizing text (this may take 10-30 seconds)...')
    const recognitionStartTime = Date.now()
    
    const { data: { text } } = await worker.recognize(file)
    const recognitionTime = Date.now() - recognitionStartTime
    
    console.log(`[OCR Client] Recognition complete in ${recognitionTime}ms, text length:`, text.length)
    
    // Clean up worker
    if (worker) {
      await worker.terminate()
      worker = null
    }
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text detected in image')
    }
    
    return text.trim()
  } catch (error) {
    console.error('[OCR Client] Error occurred:', error)
    
    // Clean up worker
    if (worker) {
      try {
        await worker.terminate()
      } catch (e) {
        console.error('[OCR Client] Error terminating worker:', e)
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[OCR Client] Final error:', errorMessage)
    throw new Error(`Failed to extract text from image: ${errorMessage}`)
  }
}


