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
export type DeepgramErrorType = 'auth' | 'network' | 'server' | 'unknown'

export class DeepgramError extends Error {
  public readonly errorType: DeepgramErrorType

  constructor(message: string, errorType: DeepgramErrorType) {
    super(message)
    this.name = 'DeepgramError'
    this.errorType = errorType
  }
}

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
    throw new DeepgramError(
      `Error de sesión: ${sessionError.message}. Intenta cerrar sesión y volver a iniciar.`,
      'auth'
    )
  }

  if (!session) {
    console.error('[deepgram] No active session - user must be logged in')
    throw new DeepgramError('Debes iniciar sesión para grabar', 'auth')
  }

  // Helper to call the edge function with a given access token
  const fetchToken = async (accessToken: string): Promise<Response> => {
    return fetch(`${SUPABASE_URL}/functions/v1/deepgram-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
  }

  console.log('[deepgram] Requesting new token from edge function...')
  console.log('[deepgram] URL:', `${SUPABASE_URL}/functions/v1/deepgram-token`)
  console.log('[deepgram] User ID:', session.user?.id)
  console.log('[deepgram] Token present:', !!session.access_token)
  console.log('[deepgram] Token length:', session.access_token?.length || 0)

  let response: Response
  try {
    response = await fetchToken(session.access_token)
  } catch (fetchError) {
    console.error('[deepgram] Network error calling edge function:', fetchError)
    throw new DeepgramError(
      'Error de conexión. Verifica tu internet e intenta de nuevo.',
      'network'
    )
  }

  console.log('[deepgram] Response status:', response.status, response.statusText)

  // If 401, try refreshing the session and retry once
  if (response.status === 401) {
    console.warn('[deepgram] Got 401 - attempting session refresh and retry...')
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

    if (refreshError || !refreshData.session) {
      console.error('[deepgram] Session refresh failed:', refreshError?.message)
      throw new DeepgramError(
        'Tu sesión ha expirado. Por favor cierra sesión y vuelve a iniciar.',
        'auth'
      )
    }

    console.log('[deepgram] Session refreshed, retrying with new token...')
    try {
      response = await fetchToken(refreshData.session.access_token)
    } catch (fetchError) {
      console.error('[deepgram] Network error on retry:', fetchError)
      throw new DeepgramError(
        'Error de conexión. Verifica tu internet e intenta de nuevo.',
        'network'
      )
    }

    console.log('[deepgram] Retry response status:', response.status, response.statusText)

    if (response.status === 401) {
      console.error('[deepgram] Still 401 after session refresh')
      throw new DeepgramError(
        'Tu sesión ha expirado. Por favor cierra sesión y vuelve a iniciar.',
        'auth'
      )
    }
  }

  if (!response.ok) {
    let errorDetail = ''
    try {
      const responseText = await response.text()
      console.error('[deepgram] Raw error response:', responseText)
      try {
        const errorData: DeepgramTokenError = JSON.parse(responseText)
        errorDetail = errorData.details || errorData.error || ''
        console.error('[deepgram] Parsed error data:', errorData)
      } catch {
        errorDetail = responseText
        console.error('[deepgram] Response was not JSON')
      }
    } catch (readError) {
      console.error('[deepgram] Failed to read error response:', readError)
    }

    if (response.status >= 500) {
      throw new DeepgramError(
        `Error del servidor al obtener credenciales de transcripción${errorDetail ? `: ${errorDetail}` : ''}`,
        'server'
      )
    }

    throw new DeepgramError(
      errorDetail || `HTTP ${response.status}: ${response.statusText}`,
      'unknown'
    )
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
