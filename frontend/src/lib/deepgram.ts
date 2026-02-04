/**
 * Deepgram Token Service
 *
 * Provides temporary Deepgram API tokens for authenticated users.
 * Tokens are generated via a Supabase Edge Function that holds the actual API key.
 * This allows users to use cloud transcription without configuring their own API key.
 */

import { supabase } from './supabase'

export interface DeepgramTokenResponse {
  token: string
  expires_in: number
}

export interface DeepgramTokenError {
  error: string
  details?: string
}

// Cache for the current token
let cachedToken: DeepgramTokenResponse | null = null
let tokenExpiresAt: number = 0

// Supabase project URL (same as used in supabase.ts)
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nhlrtflkxoojvhbyocet.supabase.co'

/**
 * Get a temporary Deepgram token for streaming transcription.
 * Tokens are cached until they expire (with a 30-second buffer).
 *
 * @returns Promise<DeepgramTokenResponse> - Token and expiration info
 * @throws Error if user is not authenticated or token generation fails
 */
export async function getDeepgramToken(): Promise<DeepgramTokenResponse> {
  // Check if we have a valid cached token (with 30s buffer before expiry)
  const now = Date.now()
  if (cachedToken && tokenExpiresAt > now + 30000) {
    console.log('[deepgram] Using cached token, expires in', Math.round((tokenExpiresAt - now) / 1000), 's')
    return cachedToken
  }

  // Get current session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    console.error('[deepgram] Session error:', sessionError.message)
    throw new Error(`Authentication error: ${sessionError.message}`)
  }

  if (!session) {
    console.error('[deepgram] No active session - user must be logged in')
    throw new Error('User must be authenticated to use Deepgram transcription')
  }

  console.log('[deepgram] Requesting new token from edge function...')
  console.log('[deepgram] URL:', `${SUPABASE_URL}/functions/v1/deepgram-token`)
  console.log('[deepgram] User ID:', session.user?.id)
  console.log('[deepgram] Token present:', !!session.access_token)
  console.log('[deepgram] Token length:', session.access_token?.length || 0)

  // Call the edge function
  const response = await fetch(`${SUPABASE_URL}/functions/v1/deepgram-token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  console.log('[deepgram] Response status:', response.status, response.statusText)

  if (!response.ok) {
    let errorMessage = 'Failed to get Deepgram token'
    try {
      // Read raw text first to see the full response
      const responseText = await response.text()
      console.error('[deepgram] Raw error response:', responseText)

      // Try to parse as JSON
      try {
        const errorData: DeepgramTokenError = JSON.parse(responseText)
        errorMessage = errorData.details || errorData.error || errorMessage
        console.error('[deepgram] Parsed error data:', errorData)
      } catch {
        // Response wasn't JSON, use raw text
        errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`
        console.error('[deepgram] Response was not JSON')
      }
    } catch (readError) {
      console.error('[deepgram] Failed to read error response:', readError)
      errorMessage = `HTTP ${response.status}: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  const tokenData: DeepgramTokenResponse = await response.json()

  // Cache the token
  cachedToken = tokenData
  tokenExpiresAt = now + tokenData.expires_in * 1000

  console.log('[deepgram] New token obtained, expires in', tokenData.expires_in, 's')

  return tokenData
}

/**
 * Clear the cached token.
 * Call this when the user logs out or when you need to force a new token.
 */
export function clearDeepgramTokenCache(): void {
  cachedToken = null
  tokenExpiresAt = 0
  console.log('[deepgram] Token cache cleared')
}

/**
 * Check if a valid token is currently cached.
 *
 * @returns boolean - True if a valid token is available
 */
export function hasValidCachedToken(): boolean {
  return cachedToken !== null && tokenExpiresAt > Date.now() + 30000
}
