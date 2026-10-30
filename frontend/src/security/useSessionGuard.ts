import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TokenVault } from '@/security/tokenVault';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

interface UseSessionGuardOptions {
  onSessionTimeout?: () => void;
  enabled?: boolean;
}

export function useSessionGuard(options: UseSessionGuardOptions = {}) {
  const { onSessionTimeout, enabled = true } = options;
  const [isCurtainActive, setIsCurtainActive] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const queryClient = useQueryClient();

  const handleInactivityLogout = useCallback(() => {
    console.warn('[SessionGuard] 10-minute inactivity limit reached. Purging volatile session & query cache.');
    TokenVault.clearSession();
    queryClient.clear();
    if (onSessionTimeout) {
      onSessionTimeout();
    }
  }, [onSessionTimeout, queryClient]);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // 1. Idle activity detection
  useEffect(() => {
    if (!enabled) return;

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const onUserActivity = () => recordActivity();

    activityEvents.forEach((ev) => window.addEventListener(ev, onUserActivity, { passive: true }));

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        handleInactivityLogout();
      }
    }, 15000); // Check every 15 seconds

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, onUserActivity));
      clearInterval(intervalId);
    };
  }, [enabled, recordActivity, handleInactivityLogout]);

  // 2. Privacy Curtain: Blur curtain on tab blur / window hidden
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsCurtainActive(true);
      } else {
        setIsCurtainActive(false);
        recordActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, recordActivity]);

  return {
    isCurtainActive,
    recordActivity,
    clearSession: handleInactivityLogout,
  };
}
