'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { logger } from '@/lib/logger'

export interface NetworkStatus {
  isOnline: boolean
  isBackendReachable: boolean
  lastChecked: Date | null
}

interface UseNetworkStatusOptions {
  /** How often to check backend connectivity (ms). Default: 30000 (30 seconds) */
  checkInterval?: number
  /** Whether to perform backend health checks. Default: true */
  checkBackend?: boolean
}

/**
 * Hook to monitor network connectivity status
 *
 * Monitors both browser online/offline events and backend reachability.
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}): NetworkStatus {
  const { checkInterval = 30000, checkBackend = true } = options

  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isBackendReachable: true,
    lastChecked: null,
  })

  // Check backend connectivity
  const checkBackendConnectivity = useCallback(async () => {
    if (!checkBackend) return

    try {
      // Use a simple backend health check command
      await invoke<boolean>('health_check')
      setStatus(prev => ({
        ...prev,
        isBackendReachable: true,
        lastChecked: new Date(),
      }))
    } catch (error) {
      console.warn('[useNetworkStatus] Backend health check failed:', error)
      setStatus(prev => ({
        ...prev,
        isBackendReachable: false,
        lastChecked: new Date(),
      }))
    }
  }, [checkBackend])

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      logger.debug('[useNetworkStatus] Browser reports online')
      setStatus(prev => ({ ...prev, isOnline: true }))
      // Check backend when coming back online
      checkBackendConnectivity()
    }

    const handleOffline = () => {
      logger.debug('[useNetworkStatus] Browser reports offline')
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isBackendReachable: false,
      }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [checkBackendConnectivity])

  // Periodic backend connectivity check
  useEffect(() => {
    if (!checkBackend) return

    // Initial check
    checkBackendConnectivity()

    // Set up interval
    const interval = setInterval(checkBackendConnectivity, checkInterval)

    return () => clearInterval(interval)
  }, [checkBackend, checkInterval, checkBackendConnectivity])

  return status
}

export default useNetworkStatus
