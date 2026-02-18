/**
 * Deepgram Proxy Config Service
 *
 * Provides proxy configuration for Deepgram transcription via Cloudflare Worker proxy.
 * The Deepgram API key never reaches the client — the proxy holds it server-side.
 *
 * Flow: Desktop → Vercel GET /api/deepgram-token → receives proxy URL + JWT (5 min)
 *       → connects to Cloudflare Worker → Worker connects to Deepgram
 */

import { supabase } from './supabase'

export interface DeepgramProxyConfigResponse {
  mode: string
  ws_url: string
  config: Record<string, unknown>
}

export interface DeepgramProxyConfig {
  proxyBaseUrl: string
  jwt: string
  expiresIn: number
}

export interface DeepgramTokenError {
  error: string
  details?: string
}

// Cache for the current proxy config
let cachedConfig: DeepgramProxyConfig | null = null
let configExpiresAt: number = 0

// JWT TTL in seconds (5 minutes)
const JWT_TTL_SECS = 300

/**
 * Get proxy configuration for Deepgram streaming transcription.
 * Configs are cached until they expire (with a 30-second buffer).
 *
 * @returns Promise<DeepgramProxyConfig> - Proxy base URL, JWT, and expiration info
 * @throws DeepgramError if user is not authenticated or config generation fails
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

export async function getDeepgramProxyConfig(): Promise<DeepgramProxyConfig> {
  // Check if we have a valid cached config (with 30s buffer before expiry)
  const now = Date.now()
  if (cachedConfig && configExpiresAt > now + 30000) {
    console.log('[deepgram] Using cached proxy config, expires in', Math.round((configExpiresAt - now) / 1000), 's')
    return cachedConfig
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

  // Helper to call the Vercel API endpoint
  const fetchConfig = async (accessToken: string): Promise<Response> => {
    return fetch('https://www.maity.com.mx/api/deepgram-token', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  }

  console.log('[deepgram] Requesting proxy config from Vercel API...')
  console.log('[deepgram] User ID:', session.user?.id)

  let response: Response
  try {
    response = await fetchConfig(session.access_token)
  } catch (fetchError) {
    console.error('[deepgram] Network error calling Vercel API:', fetchError)
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
      response = await fetchConfig(refreshData.session.access_token)
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

  const data: DeepgramProxyConfigResponse = await response.json()

  // Extract proxy base URL and JWT from ws_url
  // ws_url format: "wss://proxy.workers.dev?token=JWT&model=...&language=..."
  const wsUrl = new URL(data.ws_url)
  const jwt = wsUrl.searchParams.get('token')
  if (!jwt) {
    throw new DeepgramError('Respuesta del servidor inválida: falta token en ws_url', 'server')
  }

  // Build proxy base URL (scheme + host + pathname, without query params)
  const proxyBaseUrl = `${wsUrl.protocol}//${wsUrl.host}${wsUrl.pathname}`

  const config: DeepgramProxyConfig = {
    proxyBaseUrl,
    jwt,
    expiresIn: JWT_TTL_SECS,
  }

  // Cache the config
  cachedConfig = config
  configExpiresAt = now + JWT_TTL_SECS * 1000

  console.log('[deepgram] Proxy config obtained, expires in', JWT_TTL_SECS, 's')
  console.log('[deepgram] Proxy base URL:', proxyBaseUrl)

  return config
}

/**
 * Clear the cached proxy config.
 * Call this when the user logs out or when you need to force a new config.
 */
export function clearDeepgramProxyCache(): void {
  cachedConfig = null
  configExpiresAt = 0
  console.log('[deepgram] Proxy config cache cleared')
}

/**
 * Check if a valid proxy config is currently cached.
 *
 * @returns boolean - True if a valid config is available
 */
export function hasValidCachedProxyConfig(): boolean {
  return cachedConfig !== null && configExpiresAt > Date.now() + 30000
}
