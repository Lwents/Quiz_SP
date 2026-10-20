import { useEffect } from "react";
import { apiClient } from "../api/client";
import { API_BASE_URL } from "../api/urls";
import { useAuthStore } from "../stores/authStore";

export function PresenceTracker() {
  const userId = useAuthStore((state) => state.user?.id);
  useEffect(() => {
    if (!userId) return;
    // One id per mounted tab: hiding/closing one tab cannot hide another tab.
    const tabId = crypto.randomUUID();
    const leave = () => {
      const token = localStorage.getItem("token");
      if (token)
        void fetch(`${API_BASE_URL}/presence`, {
          method: "POST",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tab_id: tabId, visible: false }),
        }).catch(() => {});
    };
    const beat = () => {
      if (document.hidden) {
        leave();
        return;
      }
      void apiClient
        .post("/presence", { tab_id: tabId, visible: true })
        .catch(() => {});
    };
    beat();
    const timer = setInterval(beat, 15000);
    document.addEventListener("visibilitychange", beat);
    window.addEventListener("pagehide", leave);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [userId]);
  return null;
}
