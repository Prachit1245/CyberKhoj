import { useState, useEffect, useRef } from "react";
import { toast } from "@/components/Toast";

const useOnline = () => {
  const [online, setOnline] = useState(navigator.onLine);
  const wasOffline = useRef(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      if (wasOffline.current) {
        toast.success("Back online ✓");
        wasOffline.current = false;
      }
    };
    const goOffline = () => {
      setOnline(false);
      wasOffline.current = true;
      toast.warning("You're offline. AI features are disabled.");
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
};

export default useOnline;
