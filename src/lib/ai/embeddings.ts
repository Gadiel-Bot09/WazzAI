/**
 * embeddings.ts
 * 
 * Utilities for generating text embeddings and chunking long documents
 * using OpenAI's text-embedding-3-small model (1536 dimensions).
 * 
 * Server-side ONLY — never import this in client components.
 */

import OpenAI from 'openai'

// Lazy singleton to avoid instantiating on import
let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('[Embeddings] OPENAI_API_KEY is not set in environment variables.')
    }
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

/**
 * Generate a vector embedding for a text string.
 * Returns a 1536-dimensional float array.
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const client = getOpenAI()

  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.replace(/\n/g, ' '), // normalize newlines
    encoding_format: 'float',
  })

  return response.data[0].embedding
}

/**
 * Split a long text into overlapping chunks suitable for embedding.
 * 
 * @param text          Source text
 * @param chunkSize     Approximate chars per chunk (default 1500)
 * @param chunkOverlap  Overlap between chunks to preserve context (default 200)
 */
export function chunkText(
  text: string,
  chunkSize = 1500,
  chunkOverlap = 200
): string[] {
  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)

  let currentChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        // Start next chunk with overlapping tail for context continuity
        const words = currentChunk.split(' ')
        const overlapWords = words.slice(
          Math.max(0, words.length - Math.floor(chunkOverlap / 5))
        )
        currentChunk = overlapWords.join(' ') + ' ' + sentence
      } else {
        // Single sentence exceeds chunkSize — include as-is
        chunks.push(sentence.trim())
        currentChunk = ''
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(c => c.length > 10) // drop trivial chunks
}
