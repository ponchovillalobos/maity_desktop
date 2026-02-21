import { useState, useEffect } from 'react';
import { recordingService } from '@/services/recordingService';
import { logger } from '@/lib/logger';

interface UseRecordingStateSyncReturn {
  isBackendRecording: boolean;
  isRecordingDisabled: boolean;
  setIsRecordingDisabled: (value: boolean) => void;
}

/**
 * Custom hook for synchronizing frontend recording state with backend.
 * Polls backend every 1 second to detect recording state changes.
 *
 * Features:
 * - Backend state synchronization (1-second polling)
 * - Recording disabled flag management (prevents re-recording during processing)
 */
export function useRecordingStateSync(
  isRecording: boolean,
  setIsMeetingActive: (value: boolean) => void
): UseRecordingStateSyncReturn {
  const [isRecordingDisabled, setIsRecordingDisabled] = useState(false);

  useEffect(() => {
    logger.debug('Setting up recording state check effect, current isRecording:', isRecording);

    const checkRecordingState = async () => {
      try {
        logger.debug('checkRecordingState called');
        logger.debug('About to call is_recording command');
        const isCurrentlyRecording = await recordingService.isRecording();
        logger.debug('checkRecordingState: backend recording =', isCurrentlyRecording, 'UI recording =', isRecording);

        if (isCurrentlyRecording && !isRecording) {
          logger.debug('Recording is active in backend but not in UI, synchronizing state...');
          setIsMeetingActive(true);
        }
      } catch (error) {
        console.error('Failed to check recording state:', error);
      }
    };

    // Test if Tauri is available
    logger.debug('Testing Tauri availability...');
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      logger.debug('Tauri is available, starting state check');
      checkRecordingState();

      // Set up a polling interval to periodically check recording state
      const interval = setInterval(checkRecordingState, 1000); // Check every 1 second

      return () => {
        logger.debug('Cleaning up recording state check interval');
        clearInterval(interval);
      };
    } else {
      logger.debug('Tauri is not available, skipping state check');
    }
  }, [isRecording, setIsMeetingActive]);

  return {
    isBackendRecording: isRecording,
    isRecordingDisabled,
    setIsRecordingDisabled,
  };
}
