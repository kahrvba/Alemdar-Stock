"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Activity,
  useEffectEvent,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type NavigationOverlayContextValue = {
  showOverlay: () => void;
};

const NavigationOverlayContext = createContext<NavigationOverlayContextValue | null>(
  null
);

export function useNavigationOverlay() {
  const context = useContext(NavigationOverlayContext);
  if (context === null) {
    throw new Error(
      "useNavigationOverlay must be used within a NavigationOverlayProvider"
    );
  }
  return context;
}

export function NavigationOverlayProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() ?? "";
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRouteRef = useRef(`${pathname}?${searchKey}`);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  // Use useEffectEvent for scheduleHide since it's an event handler
  const scheduleHide = useEffectEvent(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 250);
  });

  useEffect(() => {
    const routeKey = `${pathname}?${searchKey}`;
    if (lastRouteRef.current !== routeKey) {
      lastRouteRef.current = routeKey;
      if (isVisible) {
        scheduleHide();
      }
    }
    return () => {
      clearHideTimer();
    };
    // scheduleHide is an Effect Event, so it's not a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchKey, isVisible]);

  const showOverlay = useCallback(() => {
    clearHideTimer();
    setIsVisible(true);
  }, []);

  const value = useMemo(
    () => ({
      showOverlay,
    }),
    [showOverlay]
  );

  return (
    <NavigationOverlayContext.Provider value={value}>
      {children}
      <Activity mode={isVisible ? "visible" : "hidden"}>
        <NavigationOverlay />
      </Activity>
    </NavigationOverlayContext.Provider>
  );
}

function NavigationOverlay() {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 transition-transform duration-300 ease-out translate-y-0 pointer-events-auto">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted/40 border-t-primary" />
        <span className="text-xs uppercase tracking-[0.35em]">Loading</span>
      </div>
    </div>
  );
}

