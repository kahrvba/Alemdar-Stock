"use client";

import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type HoverZoomOptions = {
  zoom?: number;
  lensSize?: number;
};

type HoverZoomState = {
  isActive: boolean;
  position: { x: number; y: number };
  overlayStyles: React.CSSProperties;
  scaleStyles: React.CSSProperties;
  containerHandlers: {
    onMouseEnter: React.MouseEventHandler<HTMLDivElement>;
    onMouseLeave: React.MouseEventHandler<HTMLDivElement>;
    onMouseMove: React.MouseEventHandler<HTMLDivElement>;
  };
};

const defaultPosition = (lensSize: number) => ({
  x: lensSize / 2,
  y: lensSize / 2,
});

export function useHoverZoom({
  zoom = 1.5,
  lensSize = 170,
}: HoverZoomOptions = {}): HoverZoomState {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState(defaultPosition(lensSize));

  const updatePosition = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setPosition({ x, y });
    },
    []
  );

  const containerHandlers = useMemo(
    () => ({
      onMouseEnter: () => setIsActive(true),
      onMouseLeave: () => setIsActive(false),
      onMouseMove: updatePosition,
    }),
    [updatePosition]
  );

  const overlayStyles = useMemo<React.CSSProperties>(
    () => ({
      maskImage: `radial-gradient(circle ${lensSize / 2}px at ${position.x}px ${position.y}px, black 100%, transparent 100%)`,
      WebkitMaskImage: `radial-gradient(circle ${lensSize / 2}px at ${position.x}px ${position.y}px, black 100%, transparent 100%)`,
      transformOrigin: `${position.x}px ${position.y}px`,
    }),
    [lensSize, position]
  );

  const scaleStyles = useMemo<React.CSSProperties>(
    () => ({
      transform: `scale(${zoom})`,
      transformOrigin: `${position.x}px ${position.y}px`,
    }),
    [zoom, position]
  );

  return {
    isActive,
    position,
    overlayStyles,
    scaleStyles,
    containerHandlers,
  };
}

type HoverZoomProps = React.PropsWithChildren<
  HoverZoomOptions & { className?: string }
>;

export function HoverZoom({ children, zoom, lensSize, className }: HoverZoomProps) {
  const { isActive, overlayStyles, scaleStyles, containerHandlers } = useHoverZoom({
    zoom,
    lensSize,
  });

  return (
    <div
      {...containerHandlers}
      className={cn("relative overflow-hidden transition", className)}
    >
      {children}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition duration-200 ease-out",
          isActive && "opacity-100"
        )}
        style={overlayStyles}
      >
        <div
          className="absolute inset-0 transition duration-200 ease-out"
          style={scaleStyles}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

