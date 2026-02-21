import { useEffect } from 'react';

export function useWindowCloseGuard(isRecording: boolean) {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setup = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        cleanup = await appWindow.onCloseRequested(async (event) => {
          if (isRecording) {
            event.preventDefault();
            try {
              const { confirm } = await import('@tauri-apps/plugin-dialog');
              const shouldClose = await confirm(
                'There is a recording in progress. Closing the app will stop the recording. Continue?',
                { title: 'Recording in progress', kind: 'warning' }
              );
              if (shouldClose) {
                appWindow.close();
              }
            } catch {
              // If dialog fails, allow close
              appWindow.close();
            }
          }
        });
      } catch {
        // Not in Tauri environment (e.g., browser dev), skip
      }
    };

    setup();
    return () => cleanup?.();
  }, [isRecording]);
}
