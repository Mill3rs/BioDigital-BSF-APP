import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { notificationsAPI } from '../api/notifications';

const POLL_INTERVAL_MS = 30_000; // poll every 30 s

interface NotificationCountContextType {
  unreadCount: number;
  refreshUnread: () => void;
  resetUnread: () => void;
}

const NotificationCountContext = createContext<NotificationCountContextType>({
  unreadCount: 0,
  refreshUnread: () => {},
  resetUnread: () => {},
});

export const NotificationCountProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const fetchCount = useCallback(async () => {
    try {
      const count = await notificationsAPI.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // network error — keep existing count
    }
  }, []);

  const startPolling = useCallback(() => {
    fetchCount();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);
  }, [fetchCount]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start/stop polling based on app foreground state
  useEffect(() => {
    startPolling();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev.match(/inactive|background/) && nextState === 'active') {
        startPolling();
      } else if (nextState.match(/inactive|background/)) {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [startPolling, stopPolling]);

  // Called externally to force an immediate refresh (e.g. after marking read)
  const refreshUnread = useCallback(() => { fetchCount(); }, [fetchCount]);

  // Called when the user opens the Notifications screen — optimistically clears badge
  const resetUnread = useCallback(() => { setUnreadCount(0); }, []);

  const contextValue = useMemo(
    () => ({ unreadCount, refreshUnread, resetUnread }),
    [unreadCount, refreshUnread, resetUnread],
  );

  return (
    <NotificationCountContext.Provider value={contextValue}>
      {children}
    </NotificationCountContext.Provider>
  );
};

export const useNotificationCount = () => useContext(NotificationCountContext);
