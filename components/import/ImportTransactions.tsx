'use client'

import { useState } from 'react'
import { ParsedTransaction } from '@/types/transactions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button, Input, Label, Select, Textarea, Alert, AlertDescription, Card, CardContent, CardHeader, CardTitle, Modal, Checkbox } from '@/components/ui'
import { AlertTriangle } from '@untitledui/icons'
import { extractTextFromImageClient } from '@/lib/ocr/tesseract-client'

interface ImportTransactionsProps {
  categories: Array<{ id: string; name: string }>
}

interface TransactionWithMetadata extends ParsedTransaction {
  sourceFile?: string
  isDuplicate?: boolean
  duplicateOf?: number
  existingTransactionId?: string
  isExistingDuplicate?: boolean
}

interface ExistingTransaction {
  id: string
  amount: number
  description: string
  date: string
  type: 'income' | 'expense'
  category_id: string | null
}

export default function ImportTransactions({ categories }: ImportTransactionsProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [textInput, setTextInput] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [parsedTransactions, setParsedTransactions] = useState<TransactionWithMetadata[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set())
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({})
  const [amountMap, setAmountMap] = useState<Record<number, number>>({})
  const [typeMap, setTypeMap] = useState<Record<number, 'income' | 'expense'>>({})
  const [mergeMap, setMergeMap] = useState<Record<number, boolean>>({}) // Track which existing duplicates to merge
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [statusDetail, setStatusDetail] = useState<string>('')
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null)
  const [existingTransactions, setExistingTransactions] = useState<ExistingTransaction[]>([])
  const router = useRouter()
  const supabase = createClient()

  // Helper function to find category by name (case-insensitive, fuzzy match)
  const findCategoryByName = (name: string | undefined): string | undefined => {
    if (!name) return undefined
    const normalizedName = name.trim().toLowerCase()
    
    // Exact match first
    const exactMatch = categories.find(cat => cat.name.toLowerCase() === normalizedName)
    if (exactMatch) return exactMatch.id
    
    // Partial match (contains)
    const partialMatch = categories.find(cat => 
      cat.name.toLowerCase().includes(normalizedName) || 
      normalizedName.includes(cat.name.toLowerCase())
    )
    if (partialMatch) return partialMatch.id
    
    return undefined
  }

  // Create a key for transaction comparison
  const createTransactionKey = (transaction: { amount: number; description: string; date: string; type: string }) => {
    const normalizedDesc = transaction.description.trim().toLowerCase().replace(/\s+/g, ' ')
    const amountKey = Math.round(transaction.amount * 100) / 100
    return `${amountKey}|${normalizedDesc}|${transaction.date}|${transaction.type}`
  }

  // Deduplication function (within imported transactions)
  const deduplicateTransactions = (transactions: TransactionWithMetadata[]): TransactionWithMetadata[] => {
    const seen = new Map<string, number>()
    const result: TransactionWithMetadata[] = []

    transactions.forEach((transaction, index) => {
      const key = createTransactionKey(transaction)

      if (seen.has(key)) {
        // Mark as duplicate
        const originalIndex = seen.get(key)!
        transaction.isDuplicate = true
        transaction.duplicateOf = originalIndex
        result.push(transaction)
      } else {
        // First occurrence
        seen.set(key, index)
        transaction.isDuplicate = false
        result.push(transaction)
      }
    })

    return result
  }

  // Check for duplicates against existing transactions
  const checkExistingDuplicates = async (transactions: TransactionWithMetadata[]): Promise<TransactionWithMetadata[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return transactions
    }

    // Fetch existing transactions
    const { data: existing } = await supabase
      .from('transactions')
      .select('id, amount, description, date, type, category_id')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(500) // Limit to recent transactions for performance

    if (!existing || existing.length === 0) {
      setExistingTransactions([])
      return transactions
    }

    const existingList = existing.map(t => ({
      id: t.id,
      amount: Number(t.amount),
      description: t.description,
      date: t.date,
      type: t.type as 'income' | 'expense',
      category_id: t.category_id,
    }))

    setExistingTransactions(existingList)

    // Create a map of existing transactions by key
    const existingMap = new Map<string, ExistingTransaction>()
    existingList.forEach(t => {
      const key = createTransactionKey(t)
      existingMap.set(key, t)
    })

    // Check each imported transaction against existing ones
    return transactions.map(transaction => {
      const key = createTransactionKey(transaction)
      const existing = existingMap.get(key)
      
      if (existing) {
        transaction.isExistingDuplicate = true
        transaction.existingTransactionId = existing.id
      } else {
        transaction.isExistingDuplicate = false
      }
      
      return transaction
    })
  }

  const processFile = async (file: File): Promise<TransactionWithMetadata[]> => {
    try {
      // Step 1: Extract text using client-side OCR (no server timeout!)
      const extractedText = await extractTextFromImageClient(file)
      
      if (!extractedText || extractedText.trim().length === 0) {
        return []
      }

      // Step 2: Parse transactions using OpenAI (server-side, but much faster)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 60000) // 60 second timeout for parsing

      let response: Response
      try {
        response = await fetch('/api/parse-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: extractedText }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('Parsing timed out after 60 seconds. Try with a shorter text or split into multiple parts.')
        }
        throw new Error(`Network error: ${fetchError.message || 'Unable to connect to server'}`)
      }

      if (!response.ok) {
        let errorMessage = 'Failed to parse transactions'
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json()
            errorMessage = data.error || errorMessage
          } else {
            // Handle non-JSON responses
            const text = await response.text()
            if (response.status === 504 || response.status === 408) {
              errorMessage = 'Request timed out. Try with shorter text or split into multiple parts.'
            } else {
              errorMessage = `Server error: ${response.status} ${response.statusText}`
            }
          }
        } catch (parseError) {
          // If we can't parse the error, use status-based messages
          if (response.status === 504 || response.status === 408) {
            errorMessage = 'Request timed out. Try with shorter text or split into multiple parts.'
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.'
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server. Please try again.')
      }
      
      if (!data.transactions || data.transactions.length === 0) {
        return []
      }

      // Add source file metadata to transactions
      return data.transactions.map((t: ParsedTransaction) => ({
        ...t,
        sourceFile: file.name,
      }))
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`File "${file.name}" timed out. Try a smaller image or paste the text directly.`)
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check your connection and try again.')
      }
      throw error
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    setFiles(selectedFiles)
    setError(null)
  }

  const startProcessing = async () => {
    if (files.length === 0) return
    
    setError(null)
    setStatusMessage('')
    setStatusDetail('')
    setLoading(true)
    setProcessingProgress({ current: 0, total: files.length })

    try {
      let allTransactions: TransactionWithMetadata[] = []

      // Process files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProcessingProgress({ current: i + 1, total: files.length })
        
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
        setStatusMessage(`Processing file ${i + 1} of ${files.length}...`)
        setStatusDetail(`File: ${file.name} (${fileSizeMB} MB) - Extracting text from image...`)

        try {
          const fileTransactions = await processFile(file)
          allTransactions = [...allTransactions, ...fileTransactions]
          
          if (fileTransactions.length > 0) {
            setStatusDetail(`Found ${fileTransactions.length} transaction(s) in ${file.name}. Processing next file...`)
          } else {
            setStatusDetail(`No transactions found in ${file.name}. Processing next file...`)
          }
        } catch (err) {
          console.error(`Error processing file ${file.name}:`, err)
          setStatusDetail(`Error processing ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}. Continuing with other files...`)
          // Continue processing other files
        }
      }

      if (allTransactions.length === 0) {
        setError('No transactions found in any of the images. Try clearer images.')
        setStatusMessage('')
        setStatusDetail('')
        setProcessingProgress(null)
        setLoading(false)
        return
      }

      // Deduplicate transactions
      setStatusMessage('Deduplicating transactions...')
      setStatusDetail('Checking for duplicate transactions across files...')
      
      const deduplicated = deduplicateTransactions(allTransactions)
      const duplicateCount = deduplicated.filter(t => t.isDuplicate).length
      const uniqueCount = deduplicated.length - duplicateCount

      // Check against existing transactions in database
      setStatusMessage('Checking against existing transactions...')
      setStatusDetail('Comparing with transactions already in your account...')
      
      const withExistingCheck = await checkExistingDuplicates(deduplicated)
      const existingDuplicateCount = withExistingCheck.filter(t => t.isExistingDuplicate).length

      setStatusMessage('Processing complete!')
      setStatusDetail(
        `Found ${allTransactions.length} transaction(s) total. ` +
        `${uniqueCount} unique, ${duplicateCount} duplicate(s) within import, ` +
        `${existingDuplicateCount} already exist in your account. Preparing for review...`
      )

      // Small delay to show completion message
      await new Promise(resolve => setTimeout(resolve, 1000))

      setExtractedText('')
      setParsedTransactions(withExistingCheck)
      // Select all non-duplicate transactions (both internal and existing) by default
      const indicesToSelect = withExistingCheck
        .map((_, index) => index)
        .filter(index => !withExistingCheck[index].isDuplicate && !withExistingCheck[index].isExistingDuplicate)
      setSelectedTransactions(new Set(indicesToSelect))
      
      // Initialize amount map, type map, and category map with suggested categories
      const initialAmountMap: Record<number, number> = {}
      const initialTypeMap: Record<number, 'income' | 'expense'> = {}
      const initialCategoryMap: Record<number, string> = {}
      
      withExistingCheck.forEach((t, i) => {
        initialAmountMap[i] = t.amount
        initialTypeMap[i] = t.type
        
        // Pre-select suggested category if it exists and transaction is an expense
        if (t.type === 'expense' && t.suggested_category) {
          const matchedCategoryId = findCategoryByName(t.suggested_category)
          if (matchedCategoryId) {
            initialCategoryMap[i] = matchedCategoryId
          }
        }
      })
      
      setAmountMap(initialAmountMap)
      setTypeMap(initialTypeMap)
      setCategoryMap(initialCategoryMap)
      
      setStep('review')
      setStatusMessage('')
      setStatusDetail('')
      setProcessingProgress(null)
      setLoading(false)
    } catch (err) {
      console.error('File upload error:', err)
      setStatusMessage('Error processing files')
      setStatusDetail(err instanceof Error ? err.message : 'An unexpected error occurred')
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to process files')
      }
      setProcessingProgress(null)
      setLoading(false)
    }
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      setError('Please enter some text')
      return
    }

    setError(null)
    setStatusMessage('')
    setStatusDetail('')
    setLoading(true)
    setExtractedText(textInput)
    const textLength = textInput.length
    setStatusMessage('Analyzing text...')
    setStatusDetail(`Processing ${textLength} characters. Identifying transactions...`)
    await parseTransactions(textInput)
    setStatusMessage('')
    setStatusDetail('')
  }

  const parseTransactions = async (text: string) => {
    try {
      setStatusMessage('Using AI to extract transactions...')
      setStatusDetail('Analyzing text structure and identifying financial transactions...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 95000) // 95 second timeout

      let response: Response
      try {
        response = await fetch('/api/parse-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 95 seconds. Please try with shorter text or split into multiple parts.')
        }
        throw new Error(`Network error: ${fetchError.message || 'Failed to connect to server'}`)
      }

      if (!response.ok) {
        let errorMessage = 'Failed to parse transactions'
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json()
            errorMessage = data.error || errorMessage
          } else {
            // Handle non-JSON responses (like 504 Gateway Timeout HTML pages)
            const text = await response.text()
            if (response.status === 504 || response.status === 408) {
              errorMessage = 'Request timed out. The text may be too long. Try splitting it into smaller parts.'
            } else {
              errorMessage = `Server error: ${response.status} ${response.statusText}`
            }
          }
        } catch (parseError) {
          // If we can't parse the error, use status-based messages
          if (response.status === 504 || response.status === 408) {
            errorMessage = 'Request timed out. The text may be too long. Try splitting it into smaller parts.'
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.'
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }

      setStatusMessage('Finalizing results...')
      setStatusDetail('Processing extracted transaction data...')

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server. Please try again.')
      }
      const transactions = data.transactions || []
      
      console.log('Parsing complete:', {
        transactions: transactions.length,
        stats: data.stats
      })
      
      if (transactions.length === 0) {
        setError('No transactions found in the text')
        setStatusMessage('')
        setStatusDetail('')
        setLoading(false)
        return
      }

      const incomeCount = transactions.filter((t: ParsedTransaction) => t.type === 'income').length
      const expenseCount = transactions.length - incomeCount

      setStatusMessage('Processing complete!')
      setStatusDetail(`Found ${transactions.length} transaction(s): ${incomeCount} income, ${expenseCount} expense. Preparing for review...`)

      // Small delay to show completion message
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Add metadata and deduplicate
      const transactionsWithMetadata: TransactionWithMetadata[] = transactions.map((t: ParsedTransaction) => ({
        ...t,
        sourceFile: 'Pasted text',
      }))
      
      const deduplicated = deduplicateTransactions(transactionsWithMetadata)
      const duplicateCount = deduplicated.filter(t => t.isDuplicate).length
      const uniqueCount = deduplicated.length - duplicateCount

      // Check against existing transactions in database
      setStatusMessage('Checking against existing transactions...')
      setStatusDetail('Comparing with transactions already in your account...')
      
      const withExistingCheck = await checkExistingDuplicates(deduplicated)
      const existingDuplicateCount = withExistingCheck.filter(t => t.isExistingDuplicate).length

      setExtractedText(text)
      setParsedTransactions(withExistingCheck)
      // Select all non-duplicate transactions (both internal and existing) by default
      const indicesToSelect = withExistingCheck
        .map((_, index) => index)
        .filter(index => !withExistingCheck[index].isDuplicate && !withExistingCheck[index].isExistingDuplicate)
      setSelectedTransactions(new Set(indicesToSelect))
      
      // Initialize amount map, type map, and category map with suggested categories
      const initialAmountMap: Record<number, number> = {}
      const initialTypeMap: Record<number, 'income' | 'expense'> = {}
      const initialCategoryMap: Record<number, string> = {}
      
      withExistingCheck.forEach((t, i) => {
        initialAmountMap[i] = t.amount
        initialTypeMap[i] = t.type
        
        // Pre-select suggested category if it exists and transaction is an expense
        if (t.type === 'expense' && t.suggested_category) {
          const matchedCategoryId = findCategoryByName(t.suggested_category)
          if (matchedCategoryId) {
            initialCategoryMap[i] = matchedCategoryId
          }
        }
      })
      
      setAmountMap(initialAmountMap)
      setTypeMap(initialTypeMap)
      setCategoryMap(initialCategoryMap)
      setStep('review')
      setStatusMessage('')
      setStatusDetail('')
      setLoading(false)
      
      if (duplicateCount > 0) {
        setStatusMessage(`Found ${uniqueCount} unique transactions, ${duplicateCount} duplicate(s) removed.`)
        setTimeout(() => setStatusMessage(''), 3000)
      }
    } catch (err) {
      console.error('Parse transactions error:', err)
      setStatusMessage('Error parsing transactions')
      setStatusDetail(err instanceof Error ? err.message : 'An unexpected error occurred')
      setError(err instanceof Error ? err.message : 'Failed to parse transactions')
      setLoading(false)
    }
  }

  const toggleTransaction = (index: number) => {
    const newSet = new Set(selectedTransactions)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedTransactions(newSet)
  }

  const handleSaveTransactions = async () => {
    setLoading(true)
    setError(null)
    setStatusMessage('Saving transactions...')
    setStatusDetail(`Preparing ${selectedTransactions.size} transaction(s) for import...`)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Separate new transactions and merges
      const selectedIndices = Array.from(selectedTransactions)
      const transactionsToSave: Array<{
        user_id: string
        amount: number
        description: string
        date: string
        type: 'income' | 'expense'
        category_id: string | null
      }> = []
      
      const transactionsToMerge: Array<{
        id: string
        amount?: number
        category_id?: string | null
      }> = []

      selectedIndices.forEach((index) => {
        const transaction = parsedTransactions[index]
        
        if (transaction.isDuplicate) {
          // Skip internal duplicates
          return
        }
        
        if (transaction.isExistingDuplicate && transaction.existingTransactionId) {
          // Check if merge is requested
          if (mergeMap[index]) {
            const transactionType = typeMap[index] ?? transaction.type
            const newAmount = amountMap[index] ?? transaction.amount
            const newCategoryId = transactionType === 'income' ? null : (categoryMap[index] || null)
            const existingTransaction = existingTransactions.find(t => t.id === transaction.existingTransactionId)
            
            if (existingTransaction) {
              // Only update if there are changes
              const hasChanges = 
                Math.abs(existingTransaction.amount - newAmount) > 0.01 ||
                existingTransaction.category_id !== newCategoryId
              
              if (hasChanges) {
                transactionsToMerge.push({
                  id: transaction.existingTransactionId,
                  ...(Math.abs(existingTransaction.amount - newAmount) > 0.01 && { amount: newAmount }),
                  ...(existingTransaction.category_id !== newCategoryId && { category_id: newCategoryId }),
                })
              }
            }
          }
          // Skip existing duplicates that aren't being merged
          return
        }
        
        // New transaction to save
        const transactionType = typeMap[index] ?? transaction.type
        transactionsToSave.push({
          user_id: user.id,
          amount: amountMap[index] ?? transaction.amount,
          description: transaction.description,
          date: transaction.date,
          type: transactionType as 'income' | 'expense',
          category_id: transactionType === 'income' ? null : (categoryMap[index] || null),
        })
      })

      const skippedCount = selectedIndices.length - transactionsToSave.length - transactionsToMerge.length
      if (transactionsToSave.length > 0 || transactionsToMerge.length > 0) {
        const parts = []
        if (transactionsToSave.length > 0) parts.push(`saving ${transactionsToSave.length} new`)
        if (transactionsToMerge.length > 0) parts.push(`merging ${transactionsToMerge.length}`)
        if (skippedCount > 0) parts.push(`skipping ${skippedCount} duplicate(s)`)
        setStatusDetail(parts.join(', ') + '...')
      } else {
        setStatusMessage('No transactions to save')
        setStatusDetail('All selected transactions are duplicates or already exist in your account.')
        setLoading(false)
        return
      }

      setStatusMessage('Saving to database...')
      setStatusDetail('Storing transactions...')

      // Save new transactions
      if (transactionsToSave.length > 0) {
        const { error } = await supabase
          .from('transactions')
          .insert(transactionsToSave as any)

        if (error) {
          throw error
        }
      }

      // Merge existing transactions
      if (transactionsToMerge.length > 0) {
        for (const merge of transactionsToMerge) {
          const { id, ...updates } = merge
          const { error } = await supabase
            .from('transactions')
            .update(updates as any)
            .eq('id', id)

          if (error) {
            console.error('Error merging transaction:', error)
            // Continue with other merges even if one fails
          }
        }
      }

      // Reset form and go back to upload state
      setStep('upload')
      setFiles([])
      setTextInput('')
      setExtractedText('')
      setParsedTransactions([])
      setSelectedTransactions(new Set())
      setCategoryMap({})
      setAmountMap({})
      setTypeMap({})
      setMergeMap({})
      setExistingTransactions([])
      setStatusMessage('')
      setStatusDetail('')
      setProcessingProgress(null)
      setLoading(false)
      router.refresh()
      // Force reload to ensure data consistency
      window.location.reload()
    } catch (err) {
      setStatusMessage('Error saving transactions')
      setStatusDetail(err instanceof Error ? err.message : 'An unexpected error occurred')
      setError(err instanceof Error ? err.message : 'Failed to save transactions')
      setLoading(false)
    }
  }


  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none">
        <CardContent className="p-0 space-y-8">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-semibold text-gray-900">Upload Screenshot</Label>
            <div className="relative group cursor-pointer">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-colors group-hover:border-blue-500 bg-gray-50">
                <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Take a photo or upload screenshot
                </p>
                <p className="text-xs text-gray-500">
                  Bank statements, receipts, or transaction lists
                </p>
              </div>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Selected Files ({files.length})
                </p>
                <div className="bg-gray-50 rounded-lg divide-y divide-gray-100 border border-gray-100">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 text-sm">
                      <span className="truncate flex-1 font-medium text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 ml-2">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={startProcessing}
                  disabled={loading}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? 'Processing...' : 'Process Images'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4">
            <Card className="w-full max-w-sm bg-white border-none shadow-xl mx-2">
              <CardContent className="pt-5 pb-5 sm:pt-6 sm:pb-6 px-4 sm:px-6 text-center space-y-3 sm:space-y-4">
                {/* Minimal loading animation */}
                <div className="flex justify-center gap-1.5">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                </div>
                
                {/* Single status message - no duplication */}
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-gray-900">
                    {statusMessage || 'Processing...'}
                  </h3>
                  {statusDetail && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {statusDetail}
                    </p>
                  )}
                </div>

                {/* Simple progress bar - only show if processing multiple files */}
                {processingProgress && processingProgress.total > 1 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {processingProgress.current} of {processingProgress.total} files
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Review Modal - Redesigned from Scratch */}
      <Modal
        isOpen={step === 'review'}
        onClose={() => {
          setStep('upload')
          setFiles([])
          setTextInput('')
          setExtractedText('')
          setParsedTransactions([])
          setSelectedTransactions(new Set())
          setCategoryMap({})
          setAmountMap({})
          setTypeMap({})
          setMergeMap({})
          setExistingTransactions([])
          setStatusMessage('')
          setStatusDetail('')
          setProcessingProgress(null)
          setLoading(false)
        }}
        title="Review Transactions"
        className="max-w-2xl w-full mx-0 max-h-[calc(100vh-1rem)] sm:max-h-[90vh]"
      >
        <div className="flex flex-col h-full bg-white">
          {/* Stats Header */}
          <div className="flex-shrink-0 grid grid-cols-3 gap-3 pb-4 mb-4 border-b border-gray-100">
            {(() => {
              const internalDupes = parsedTransactions.filter(t => t.isDuplicate).length
              const existingDupes = parsedTransactions.filter(t => t.isExistingDuplicate).length
              const unique = parsedTransactions.filter(t => !t.isDuplicate && !t.isExistingDuplicate).length
              const totalDupes = internalDupes + existingDupes

              return (
                <>
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-2xl font-bold text-gray-900 leading-none">{selectedTransactions.size}</span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1.5">Selected</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <span className="text-2xl font-bold text-blue-600 leading-none">{unique}</span>
                    <span className="text-xs font-medium text-blue-600/80 uppercase tracking-wider mt-1.5">New</span>
                  </div>
                  <div className={`flex flex-col items-center justify-center p-3 rounded-xl border ${totalDupes > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                    <span className={`text-2xl font-bold leading-none ${totalDupes > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{totalDupes}</span>
                    <span className={`text-xs font-medium uppercase tracking-wider mt-1.5 ${totalDupes > 0 ? 'text-amber-600/80' : 'text-gray-400'}`}>Duplicates</span>
                  </div>
                </>
              )
            })()}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Transactions List */}
          <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 space-y-3 pb-4 custom-scrollbar">
            {parsedTransactions.map((transaction, index) => {
              const isDuplicate = transaction.isDuplicate
              const isExistingDuplicate = transaction.isExistingDuplicate
              const existingTransaction = isExistingDuplicate && transaction.existingTransactionId
                ? existingTransactions.find(t => t.id === transaction.existingTransactionId)
                : null
              
              const isSelected = selectedTransactions.has(index)
              const transactionType = typeMap[index] ?? transaction.type
              const transactionAmount = amountMap[index] ?? transaction.amount

              return (
                <div 
                  key={index}
                  className={`
                    relative rounded-xl border-2 transition-all duration-200
                    ${isSelected ? 'border-blue-600 bg-white shadow-md z-10' : 'border-gray-200 bg-white hover:border-gray-300'}
                    ${isDuplicate || isExistingDuplicate ? 'bg-amber-50/30' : ''}
                  `}
                >
                  <div className="p-4">
                    {/* Header: Checkbox + Description */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="pt-0.5">
                        <div className="relative flex items-center">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleTransaction(index)}
                            disabled={isDuplicate || isExistingDuplicate}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-semibold text-base leading-snug ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                            {transaction.description}
                          </h4>
                          {(isDuplicate || isExistingDuplicate) && (
                            <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${isExistingDuplicate ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {isExistingDuplicate ? 'Existing' : 'Duplicate'}
                            </span>
                          )}
                        </div>
                        {transaction.sourceFile && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{transaction.sourceFile}</p>
                        )}
                      </div>
                    </div>

                    {/* Inputs Row */}
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 ml-1">Amount</label>
                        <div className="relative">
                          <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-medium ${isSelected ? 'text-gray-900' : 'text-gray-400'}`}>$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={transactionAmount}
                            onChange={(e) => {
                              const newAmount = parseFloat(e.target.value) || 0
                              setAmountMap({ ...amountMap, [index]: newAmount })
                            }}
                            disabled={!isSelected}
                            className={`w-full h-11 pl-7 pr-3 rounded-lg border text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-gray-50 disabled:text-gray-400 ${isSelected ? 'border-gray-300 bg-white text-gray-900 focus:border-blue-600' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 ml-1">Date</label>
                        <input
                          type="date"
                          value={transaction.date}
                          onChange={(e) => {
                            const newParsed = [...parsedTransactions]
                            newParsed[index] = { ...transaction, date: e.target.value }
                            setParsedTransactions(newParsed)
                          }}
                          disabled={!isSelected}
                          className={`w-full h-11 px-3 rounded-lg border text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-gray-50 disabled:text-gray-400 ${isSelected ? 'border-gray-300 bg-white text-gray-900 focus:border-blue-600' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
                        />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isSelected && (
                      <div className="pt-3 mt-3 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-3">
                          {/* Type Selector */}
                          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                            <button
                              onClick={() => {
                                const newType = 'income'
                                setTypeMap({ ...typeMap, [index]: newType })
                                const newCategoryMap = { ...categoryMap }
                                delete newCategoryMap[index]
                                setCategoryMap(newCategoryMap)
                              }}
                              className={`h-9 text-sm font-medium rounded-md transition-all ${transactionType === 'income' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                              Income
                            </button>
                            <button
                              onClick={() => setTypeMap({ ...typeMap, [index]: 'expense' })}
                              className={`h-9 text-sm font-medium rounded-md transition-all ${transactionType === 'expense' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                              Expense
                            </button>
                          </div>

                          {/* Category Selector */}
                          {transactionType === 'expense' && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-gray-500 ml-1">Category</label>
                              <div className="relative">
                                <select
                                  value={categoryMap[index] || ''}
                                  onChange={(e) => {
                                    const newCategoryMap = { ...categoryMap }
                                    if (e.target.value) {
                                      newCategoryMap[index] = e.target.value
                                    } else {
                                      delete newCategoryMap[index]
                                    }
                                    setCategoryMap(newCategoryMap)
                                  }}
                                  className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 appearance-none"
                                >
                                  <option value="">Uncategorized</option>
                                  {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                              </div>
                              {transaction.suggested_category && !categoryMap[index] && (
                                <div className="flex items-center gap-1.5 mt-1.5 px-2">
                                  <span className="text-blue-500 text-xs">💡</span>
                                  <span className="text-xs text-blue-600 font-medium">Suggestion: {transaction.suggested_category}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Merge Conflict Resolution */}
                    {isExistingDuplicate && existingTransaction && (
                      <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <label className="flex gap-3 cursor-pointer">
                          <Checkbox
                            checked={mergeMap[index] || false}
                            onChange={(e) => setMergeMap({ ...mergeMap, [index]: e.target.checked })}
                            className="mt-1 w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-amber-900">Update existing transaction</div>
                            <div className="text-xs text-amber-700 mt-0.5">
                              Matches: {formatDate(existingTransaction.date)} • {formatCurrency(existingTransaction.amount)}
                            </div>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 pt-4 mt-auto border-t border-gray-100 bg-white modal-footer">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('upload')
                  setFiles([])
                  setTextInput('')
                  setExtractedText('')
                  setParsedTransactions([])
                  setSelectedTransactions(new Set())
                  setCategoryMap({})
                  setAmountMap({})
                  setTypeMap({})
                  setMergeMap({})
                  setExistingTransactions([])
                  setStatusMessage('')
                  setStatusDetail('')
                  setProcessingProgress(null)
                  setLoading(false)
                }}
                className="flex-1 h-12 rounded-xl border border-gray-200 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTransactions}
                disabled={loading || selectedTransactions.size === 0}
                className="flex-[2] h-12 rounded-xl bg-blue-600 text-base font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all"
              >
                {loading ? 'Saving...' : `Import ${selectedTransactions.size} Items`}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

