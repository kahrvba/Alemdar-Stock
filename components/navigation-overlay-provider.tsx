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
  Suspense,
} from "react";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";

type NavigationOverlayContextValue = {
  showOverlay: () => void;
};

const NavigationOverlayContext = createContext<NavigationOverlayContextValue | null>(
  null
);

const NOOP_NAVIGATION_OVERLAY_CONTEXT: NavigationOverlayContextValue = {
  showOverlay: () => {
    // No-op fallback while provider internals are suspended
  },
};

export function useNavigationOverlay() {
  const context = useContext(NavigationOverlayContext);
  if (context === null) {
    // This should only happen during build/SSR when provider isn't in the tree yet
    // At runtime, the provider is always available in the layout
    // Return a no-op function to prevent build errors
    if (typeof window === 'undefined') {
      // Server-side/build: safe to return no-op
      return {
        showOverlay: () => {
          // No-op during build/SSR
        },
      };
    }
    // Client-side but provider missing: this shouldn't happen, but log a warning
    console.warn('useNavigationOverlay called outside NavigationOverlayProvider');
    return {
      showOverlay: () => {
        // No-op fallback
      },
    };
  }
  return context;
}

function NavigationOverlayProviderInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() ?? "";
  const [isVisible, setIsVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
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
    // Start slide-down animation
    setIsHiding(true);
    // After animation completes, hide the component
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsHiding(false);
    }, 300);
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
        <NavigationOverlay isHiding={isHiding} />
      </Activity>
    </NavigationOverlayContext.Provider>
  );
}

export function NavigationOverlayProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <NavigationOverlayContext.Provider value={NOOP_NAVIGATION_OVERLAY_CONTEXT}>
          {children}
        </NavigationOverlayContext.Provider>
      }
    >
      <NavigationOverlayProviderInner>{children}</NavigationOverlayProviderInner>
    </Suspense>
  );
}

function NavigationOverlay({ isHiding }: { isHiding: boolean }) {
  return (
    <div className={cn(
      "fixed inset-0 z-40 flex items-center justify-center bg-background/95 pointer-events-auto transition-transform duration-300 ease-out",
      isHiding ? "translate-y-full" : "translate-y-0 animate-slide-up"
    )}>
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted/40 border-t-primary" />
        <span className="text-xs uppercase tracking-[0.35em]">Loading</span>
      </div>
    </div>
  );
}
