'use client'

import { useState } from 'react'
import { ParsedTransaction } from '@/types/transactions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button, Input, Label, Select, Textarea, Alert, AlertDescription, Card, CardContent, CardHeader, CardTitle, Modal } from '@/components/ui'
import { AlertTriangle } from '@untitledui/icons'

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
    const formData = new FormData()
    formData.append('file', file)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 95000)

    try {
      const response = await fetch('/api/ocr-and-parse', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = 'Failed to process image'
        try {
          const data = await response.json()
          errorMessage = data.error || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.transactions || data.transactions.length === 0) {
        return []
      }

      // Add source file metadata to transactions
      return data.transactions.map((t: ParsedTransaction) => ({
        ...t,
        sourceFile: file.name,
      }))
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        throw new Error(`File "${file.name}" timed out after 95 seconds. Try a smaller image or paste the text directly.`)
      }
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check your connection and try again.')
      }
      throw fetchError
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
        setStatusDetail(`File: ${file.name} (${fileSizeMB} MB)`)

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
          const data = await response.json()
          errorMessage = data.error || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      setStatusMessage('Finalizing results...')
      setStatusDetail('Processing extracted transaction data...')

      const data = await response.json()
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
            <Label className="text-base font-semibold text-gray-900 dark:text-white">Upload Screenshot</Label>
            <div className="relative group cursor-pointer">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
              />
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center transition-colors group-hover:border-blue-500 dark:group-hover:border-blue-400 bg-gray-50 dark:bg-gray-800/50">
                <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Take a photo or upload screenshot
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Bank statements, receipts, or transaction lists
                </p>
              </div>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Selected Files ({files.length})
                </p>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 text-sm">
                      <span className="truncate flex-1 font-medium text-gray-700 dark:text-gray-300">{file.name}</span>
                      <span className="text-xs text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 ml-2">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={startProcessing}
                  disabled={loading}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {loading ? 'Processing...' : 'Process Images'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
            <Card className="w-full max-w-md bg-white dark:bg-gray-900 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
              <CardContent className="pt-8 pb-8 text-center space-y-6">
                {/* No circular spinner, just a clean loading animation */}
                <div className="flex justify-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {statusMessage || 'Processing...'}
                    </h3>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Please wait while we analyze your documents
                    </p>
                  </div>

                  {/* Detailed Status Steps */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left space-y-3 max-h-48 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-tight">
                        {statusDetail || 'Initializing...'}
                      </p>
                    </div>
                    
                    {processingProgress && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500/50 shrink-0"></div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                          Processing file {processingProgress.current} of {processingProgress.total}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {processingProgress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
                      <span>Progress</span>
                      <span>{Math.round((processingProgress.current / processingProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Review Modal */}
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
        className="max-w-4xl max-h-[calc(100vh-2rem)] sm:max-h-[90vh]"
      >
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select and review transactions to import
            </p>
            
            {(() => {
              const internalDupes = parsedTransactions.filter(t => t.isDuplicate).length
              const existingDupes = parsedTransactions.filter(t => t.isExistingDuplicate).length
              const unique = parsedTransactions.filter(t => !t.isDuplicate && !t.isExistingDuplicate).length
              
              return (
                <div className="flex flex-wrap gap-2 sm:gap-3 text-sm">
                  <div className="px-2.5 sm:px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium border border-blue-100 dark:border-blue-800 whitespace-nowrap">
                    {unique} New
                  </div>
                  {(internalDupes > 0 || existingDupes > 0) && (
                    <div className="px-2.5 sm:px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium border border-amber-100 dark:border-amber-800 whitespace-nowrap">
                      {internalDupes + existingDupes} Duplicates
                    </div>
                  )}
                  <div className="px-2.5 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                    {selectedTransactions.size} Selected
                  </div>
                </div>
              )
            })()}
          </div>

          <div className="space-y-6 pr-2 custom-scrollbar">
            {(() => {
              // Group transactions by amount (rounded to 2 decimals)
              const groupedByAmount = new Map<string, Array<{ transaction: TransactionWithMetadata; index: number }>>()
              
              parsedTransactions.forEach((transaction, index) => {
                const amountKey = (amountMap[index] ?? transaction.amount).toFixed(2)
                if (!groupedByAmount.has(amountKey)) {
                  groupedByAmount.set(amountKey, [])
                }
                groupedByAmount.get(amountKey)!.push({ transaction, index })
              })
              
              // Sort groups by amount (descending) and within each group, show non-duplicates first
              const sortedGroups = Array.from(groupedByAmount.entries())
                .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
                .map(([amount, items]) => ({
                  amount: parseFloat(amount),
                  items: items.sort((a, b) => {
                    // Priority: new transactions > internal duplicates > existing duplicates
                    if (a.transaction.isExistingDuplicate !== b.transaction.isExistingDuplicate) {
                      return a.transaction.isExistingDuplicate ? 1 : -1
                    }
                    if (a.transaction.isDuplicate !== b.transaction.isDuplicate) {
                      return a.transaction.isDuplicate ? 1 : -1
                    }
                    return a.transaction.description.localeCompare(b.transaction.description)
                  })
                }))
              
              return sortedGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-3">
                  {group.items.length > 1 && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                        Amount Group: {formatCurrency(group.amount)} ({group.items.length})
                      </span>
                      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                  )}
                  {group.items.map(({ transaction, index }) => {
                    const isDuplicate = transaction.isDuplicate
                    const isExistingDuplicate = transaction.isExistingDuplicate
                    const existingTransaction = isExistingDuplicate && transaction.existingTransactionId
                      ? existingTransactions.find(t => t.id === transaction.existingTransactionId)
                      : null
                    
                    const isSelected = selectedTransactions.has(index)
                    
                    return (
                      <div
                        key={index}
                        className={`group relative rounded-xl border transition-all duration-200 ${
                          isExistingDuplicate
                            ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/50'
                            : isDuplicate
                            ? 'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800/50'
                            : isSelected
                            ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-100 dark:bg-gray-800 dark:border-blue-800 dark:ring-blue-900/30'
                            : 'bg-white border-gray-100 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700'
                        }`}
                      >
                        {/* Duplicate Indicators */}
                        {(isExistingDuplicate || isDuplicate) && (
                          <div className={`absolute -top-2.5 right-4 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border shadow-sm ${
                            isExistingDuplicate 
                              ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700'
                          }`}>
                            {isExistingDuplicate ? 'Existing Match' : 'Duplicate'}
                          </div>
                        )}

                        <div className="p-3 sm:p-4 flex gap-3 sm:gap-4">
                          {/* Checkbox */}
                          <div className="pt-1 flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTransaction(index)}
                              disabled={isDuplicate || isExistingDuplicate}
                              className="w-5 h-5 sm:w-5 sm:h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-900 cursor-pointer disabled:opacity-50 touch-manipulation"
                            />
                          </div>

                          <div className="flex-1 space-y-4">
                            {/* Header: Description & Source */}
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white leading-tight">
                                  {transaction.description}
                                </h4>
                                {transaction.sourceFile && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                    {transaction.sourceFile}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Main Input Grid */}
                            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 ${!isSelected ? 'opacity-50 pointer-events-none' : ''}`}>
                              {/* Date */}
                              <div className="sm:col-span-1 lg:col-span-3 space-y-1.5">
                                <Label className="text-xs text-gray-500 font-medium">Date</Label>
                                <Input
                                  type="date"
                                  value={transaction.date}
                                  onChange={(e) => {
                                    const newParsed = [...parsedTransactions]
                                    newParsed[index] = { ...transaction, date: e.target.value }
                                    setParsedTransactions(newParsed)
                                  }}
                                  className="h-10 sm:h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 touch-manipulation"
                                />
                              </div>

                              {/* Amount */}
                              <div className="sm:col-span-1 lg:col-span-3 space-y-1.5">
                                <Label className="text-xs text-gray-500 font-medium">Amount</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={amountMap[index] ?? transaction.amount}
                                    onChange={(e) => {
                                      const newAmount = parseFloat(e.target.value) || 0
                                      setAmountMap({ ...amountMap, [index]: newAmount })
                                    }}
                                    className="h-10 sm:h-9 pl-7 text-sm font-mono bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 touch-manipulation"
                                  />
                                </div>
                              </div>

                              {/* Type */}
                              <div className="sm:col-span-1 lg:col-span-3 space-y-1.5">
                                <Label className="text-xs text-gray-500 font-medium">Type</Label>
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 h-10 sm:h-9">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newType = 'income'
                                      setTypeMap({ ...typeMap, [index]: newType })
                                      const newCategoryMap = { ...categoryMap }
                                      delete newCategoryMap[index]
                                      setCategoryMap(newCategoryMap)
                                    }}
                                    className={`flex-1 rounded-md text-xs font-medium transition-all touch-manipulation ${
                                      (typeMap[index] ?? transaction.type) === 'income'
                                        ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                  >
                                    Income
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTypeMap({ ...typeMap, [index]: 'expense' })}
                                    className={`flex-1 rounded-md text-xs font-medium transition-all touch-manipulation ${
                                      (typeMap[index] ?? transaction.type) === 'expense'
                                        ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                  >
                                    Expense
                                  </button>
                                </div>
                              </div>

                              {/* Category */}
                              <div className="sm:col-span-1 lg:col-span-3 space-y-1.5">
                                <Label className="text-xs text-gray-500 font-medium">
                                  Category <span className="text-gray-400 font-normal">(Optional)</span>
                                </Label>
                                {(typeMap[index] ?? transaction.type) === 'expense' ? (
                                  <div className="space-y-1">
                                    {categories.length > 0 ? (
                                      <Select
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
                                        className="h-10 sm:h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 touch-manipulation"
                                      >
                                        <option value="">Uncategorized</option>
                                        {categories.map((cat) => (
                                          <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                          </option>
                                        ))}
                                      </Select>
                                    ) : (
                                      <Select value="" disabled className="h-10 sm:h-9 text-sm bg-gray-50">
                                        <option value="">No categories</option>
                                      </Select>
                                    )}
                                    {transaction.suggested_category && !categoryMap[index] && (
                                      <p className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                        <span className="opacity-70">Suggested:</span> {transaction.suggested_category}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-10 sm:h-9 flex items-center px-3 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-800 italic">
                                    Not applicable
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Duplicate Resolution Actions */}
                            {isExistingDuplicate && existingTransaction && (
                              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/50">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="text-xs text-amber-800 dark:text-amber-200">
                                    <span className="font-medium">Found existing transaction:</span>{' '}
                                    {formatDate(existingTransaction.date)} • {existingTransaction.description}
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <div className="relative flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={mergeMap[index] || false}
                                        onChange={(e) => {
                                          setMergeMap({ ...mergeMap, [index]: e.target.checked })
                                        }}
                                        className="peer sr-only"
                                      />
                                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
                                    </div>
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                      Update Existing
                                    </span>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            })()}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="outline"
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
              className="flex-1 h-11 sm:h-10 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 touch-manipulation"
            >
              Back
            </Button>
            <Button
              onClick={handleSaveTransactions}
              disabled={loading || selectedTransactions.size === 0}
              className="flex-1 sm:flex-[2] h-11 sm:h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none touch-manipulation text-sm sm:text-base text-white"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  <span className="hidden sm:inline">{statusMessage || 'Saving...'}</span>
                  <span className="sm:hidden">Saving...</span>
                </span>
              ) : (
                <>
                  <span className="hidden sm:inline">Save {selectedTransactions.size} Transaction{selectedTransactions.size !== 1 ? 's' : ''}</span>
                  <span className="sm:hidden">Save ({selectedTransactions.size})</span>
                </>
              )}
            </Button>
          </div>
          {loading && statusDetail && (
            <div className="mt-3 text-center animate-pulse">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{statusDetail}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

