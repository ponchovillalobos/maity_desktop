/**
 * Deepgram Proxy Config Service
 *
 * Provides proxy configuration for Deepgram transcription via Cloudflare Worker proxy.
 * The Deepgram API key never reaches the client — the proxy holds it server-side.
 *
 * Flow: Frontend gets Supabase session → invokes Rust command with access_token
 *       → Rust fetches from Vercel API (no CORS) → caches and returns config
 *       → Rust connects to Cloudflare Worker → Worker connects to Deepgram
 */

import { invoke } from '@tauri-apps/api/core'
import { supabase } from './supabase'

export interface DeepgramProxyConfig {
  proxyBaseUrl: string
  jwt: string
  expiresIn: number
}

export interface DeepgramTokenError {
  error: string
  details?: string
}

export type DeepgramErrorType = 'auth' | 'network' | 'server' | 'unknown'

export class DeepgramError extends Error {
  public readonly errorType: DeepgramErrorType

  constructor(message: string, errorType: DeepgramErrorType) {
    super(message)
    this.name = 'DeepgramError'
    this.errorType = errorType
  }
}

/**
 * Get proxy configuration for Deepgram streaming transcription.
 * The Rust backend handles HTTP fetching (no CORS), caching, and config parsing.
 *
 * @returns Promise<DeepgramProxyConfig> - Proxy base URL, JWT, and expiration info
 * @throws DeepgramError if user is not authenticated or config generation fails
 */
export async function getDeepgramProxyConfig(): Promise<DeepgramProxyConfig> {
  // Get session, refreshing proactively if token is expired or about to expire
  let {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    console.error('[deepgram] No active session:', sessionError?.message)
    throw new DeepgramError('Debes iniciar sesión para grabar', 'auth')
  }

  // Proactively refresh if token is expired or expires within 60s
  const expiresAt = session.expires_at // Unix timestamp in seconds
  if (expiresAt && expiresAt < Math.floor(Date.now() / 1000) + 60) {
    console.log('[deepgram] Token expired or about to expire, refreshing...')
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError || !refreshData.session) {
      throw new DeepgramError(
        'Tu sesión ha expirado. Cierra sesión y vuelve a iniciar.',
        'auth'
      )
    }
    session = refreshData.session
    console.log('[deepgram] Token refreshed successfully')
  }

  console.log('[deepgram] Fetching proxy config via Rust backend...')

  try {
    // Rust command handles: HTTP fetch, caching, URL parsing, error classification
    const result = await invoke<{ proxy_base_url: string; jwt: string; expires_in: number }>(
      'fetch_deepgram_proxy_config',
      { accessToken: session.access_token }
    )

    console.log('[deepgram] Proxy config obtained, expires in', result.expires_in, 's')
    console.log('[deepgram] Proxy base URL:', result.proxy_base_url)

    return {
      proxyBaseUrl: result.proxy_base_url,
      jwt: result.jwt,
      expiresIn: result.expires_in,
    }
  } catch (err) {
    const errorStr = String(err)
    console.error('[deepgram] Rust fetch error:', errorStr)

    // Rust errors are prefixed with error type: "auth:message", "network:message", etc.
    const colonIndex = errorStr.indexOf(':')
    if (colonIndex > 0 && colonIndex < 10) {
      const errorType = errorStr.substring(0, colonIndex) as DeepgramErrorType
      const message = errorStr.substring(colonIndex + 1)
      if (['auth', 'network', 'server', 'unknown'].includes(errorType)) {
        throw new DeepgramError(message, errorType)
      }
    }

    throw new DeepgramError(errorStr, 'unknown')
  }
}

/**
 * Clear the cached proxy config (both TS and Rust side).
 * Call this when the user logs out.
 */
export async function clearDeepgramProxyCache(): Promise<void> {
  try {
    await invoke('clear_deepgram_proxy_config')
  } catch (e) {
    console.warn('[deepgram] Failed to clear Rust cache:', e)
  }
  console.log('[deepgram] Proxy config cache cleared')
}

/**
 * Check if a valid proxy config is currently cached in Rust.
 */
export async function hasValidCachedProxyConfig(): Promise<boolean> {
  try {
    return await invoke<boolean>('has_valid_deepgram_proxy_config')
  } catch {
    return false
  }
}
