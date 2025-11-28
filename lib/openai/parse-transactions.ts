import OpenAI from 'openai'
import { ParsedTransaction } from '@/types/transactions'

// Lazy initialization to avoid build-time errors
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function parseTransactionsFromText(text: string, existingCategories: string[] = []): Promise<ParsedTransaction[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const openai = getOpenAIClient()

  const categoryContext = existingCategories.length > 0 
    ? `\n- Suggest category names ONLY from this list: ${existingCategories.join(', ')}. If no category from this list fits, suggest a new one or return null.`
    : '\n- Suggest appropriate category names when possible'

  const systemPrompt = `You are a financial transaction parser. Extract transactions from financial statement text and return them as a JSON array.

Rules:
- Extract all transactions (both income and expenses)
- Parse amounts as positive numbers (the type field indicates income/expense)
- Extract dates in YYYY-MM-DD format. IMPORTANT: If the year is not specified in the text, assume the current year is ${new Date().getFullYear()}. If a specific year IS in the text, use that year. If NO date can be found in the text, use today's date: ${new Date().toISOString().split('T')[0]}.
- Extract clear descriptions of each transaction${categoryContext}
- Return ONLY valid JSON, no additional text
- If no transactions found, return empty array []

Example format:
[
  {
    "amount": 45.50,
    "description": "Coffee Shop Purchase",
    "date": "2024-01-15",
    "type": "expense",
    "suggested_category": "Food"
  },
  {
    "amount": 1200.00,
    "description": "Salary Deposit",
    "date": "2024-01-01",
    "type": "income",
    "suggested_category": null
  }
]`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract transactions from this financial statement:\n\n${text}` },
      ],
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\[.*?\]|\{.*?\})\s*```/s)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('Invalid JSON response from OpenAI')
      }
    }
    
    // Handle both { transactions: [...] } and direct array formats
    const transactions = Array.isArray(parsed) ? parsed : parsed.transactions || []

    // Validate and normalize transactions
    return transactions
      .filter((t: any) => t.amount && t.description && t.type)
      .map((t: any) => ({
        amount: Math.abs(Number(t.amount)),
        description: String(t.description).trim(),
        date: t.date ? String(t.date) : new Date().toISOString().split('T')[0],
        type: t.type === 'income' ? 'income' : 'expense',
        suggested_category: t.suggested_category || undefined,
      }))
  } catch (error) {
    console.error('OpenAI parsing error:', error)
    throw new Error(`Failed to parse transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

