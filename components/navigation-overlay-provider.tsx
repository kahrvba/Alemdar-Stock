"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 250);
  }, []);

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
  }, [pathname, searchKey, isVisible, scheduleHide]);

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
      <NavigationOverlay isVisible={isVisible} />
    </NavigationOverlayContext.Provider>
  );
}

function NavigationOverlay({ isVisible }: { isVisible: boolean }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-40 flex items-center justify-center bg-background/95 transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none"
      )}
    >
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted/40 border-t-primary" />
        <span className="text-xs uppercase tracking-[0.35em]">Loading</span>
      </div>
    </div>
  );
}

