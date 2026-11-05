/**
 * NetworkStatus component
 * Monitors online and offline network events.
 * Shows a single persistent toast when offline and dismisses it with "Back online." upon reconnection.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const OFFLINE_TOAST_ID = "offline-network-status-toast";

export function NetworkStatus() {
  const isOfflineRef = useRef(false);

  useEffect(() => {
    const handleOffline = () => {
      isOfflineRef.current = true;
      toast.error("You're offline. Changes can't be saved until you reconnect.", {
        id: OFFLINE_TOAST_ID,
        duration: Infinity,
      });
    };

    const handleOnline = () => {
      if (isOfflineRef.current) {
        isOfflineRef.current = false;
        toast.dismiss(OFFLINE_TOAST_ID);
        toast.success("Back online.", { duration: 3000 });
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}

export default NetworkStatus;