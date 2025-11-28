import { createWorker, PSM } from 'tesseract.js'
import sharp from 'sharp'
import path from 'path'

// Optimize image before OCR for faster processing
async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    // Resize if too large (max 2000px width/height), convert to grayscale, optimize
    const image = sharp(buffer)
    const metadata = await image.metadata()
    
    // If image is large, resize it
    if (metadata.width && metadata.width > 2000) {
      return await image
        .resize(2000, null, { withoutEnlargement: true })
        .greyscale()
        .normalize()
        .toBuffer()
    }
    
    // Convert to grayscale for faster OCR
    return await image
      .greyscale()
      .normalize()
      .toBuffer()
  } catch (error) {
    console.log('Image optimization failed, using original:', error)
    return buffer
  }
}

export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  let worker: any = null
  
  try {
    console.log('[OCR] Starting extraction...')
    console.log('[OCR] Step 1: Skipping optimization as requested (using original image)...')
    const optimizedBuffer = imageBuffer
    console.log('[OCR] Using original image, size:', optimizedBuffer.length, 'bytes')
    
    console.log('[OCR] Step 2: Creating worker (may take 30-60s on first use - downloading language data)...')
    const workerStartTime = Date.now()
    
    // Fix path resolution for Next.js - use absolute paths
    const tesseractPath = path.join(process.cwd(), 'node_modules', 'tesseract.js')
    
    worker = await createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          const progress = m.progress ? Math.round(m.progress * 100) : 0
          console.log(`[OCR] Recognition progress: ${progress}%`)
        } else if (m.status) {
          console.log(`[OCR] Worker status: ${m.status}`)
        }
      },
      // Explicitly set paths to fix Next.js/Turbopack path resolution
      workerPath: path.join(tesseractPath, 'src', 'worker-script', 'node', 'index.js'),
    })
    const workerTime = Date.now() - workerStartTime
    console.log(`[OCR] Worker created in ${workerTime}ms`)
    
    // Optimize OCR settings for speed
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$€£¥-: /',
    })
    console.log('[OCR] Worker configured')
    
    console.log('[OCR] Step 3: Recognizing text (this may take 10-30 seconds)...')
    const recognitionStartTime = Date.now()
    
    // Add timeout wrapper
    const recognitionPromise = worker.recognize(optimizedBuffer)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OCR timeout after 45 seconds')), 45000)
    )
    
    const result = await Promise.race([recognitionPromise, timeoutPromise]) as any
    const recognitionTime = Date.now() - recognitionStartTime
    
    // Handle different result formats
    let text = ''
    if (result?.data?.text) {
      text = result.data.text
    } else if (result?.text) {
      text = result.text
    } else if (typeof result === 'string') {
      text = result
    }
    
    console.log(`[OCR] Recognition complete in ${recognitionTime}ms, text length:`, text.length)
    
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
    console.error('[OCR] Error occurred:', error)
    
    // Clean up worker
    if (worker) {
      try {
        await worker.terminate()
      } catch (e) {
        console.error('[OCR] Error terminating worker:', e)
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[OCR] Final error:', errorMessage)
    throw new Error(`Failed to extract text from image: ${errorMessage}`)
  }
}

