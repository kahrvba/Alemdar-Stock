"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { HoverZoom } from "@/components/ui/hover-zoom";
import { useNavigationOverlay } from "@/components/navigation-overlay-provider";

export type FocusCard = {
  title: string;
  src: string;
  href?: string;
};

type CardProps = {
  card: FocusCard;
  index: number;
  hovered: number | null;
  setHovered: React.Dispatch<React.SetStateAction<number | null>>;
};

const CardComponent = ({ card, index, hovered, setHovered }: CardProps) => {
  const { push } = useRouter();
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const hasLink = Boolean(card.href);
  const { showOverlay } = useNavigationOverlay();

  return (
    <div
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      onClick={() => {
        if (card.href) {
          showOverlay();
          push(card.href);
        }
      }}
      onKeyDown={(event) => {
        if (!card.href) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showOverlay();
          push(card.href);
        }
      }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }}
      className={cn(
        "relative h-60 w-full overflow-hidden rounded-lg bg-card transition-all duration-300 ease-out md:h-96",
        hovered !== null && hovered !== index && "blur-sm scale-[0.98]",
        hasLink
          ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          : "cursor-pointer"
      )}
      role={hasLink ? "button" : undefined}
      tabIndex={hasLink ? 0 : undefined}
    >
      <HoverZoom className="absolute inset-0">
        <Image
          src={card.src}
          alt={card.title}
          fill
          priority={index === 0}
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover"
        />
      </HoverZoom>
      {hovered === index && hasLink && (
        <div
          className="pointer-events-none absolute z-30 -translate-y-full rounded-md bg-muted/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-lg"
          style={{ left: tooltipPosition.x, top: tooltipPosition.y - 12 }}
        >
          Press to open
        </div>
      )}
      <div
        className={cn(
          "absolute inset-0 flex items-end bg-black/50 px-4 py-8 transition-opacity duration-300",
          hovered === index ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="text-xl font-medium text-transparent bg-linear-to-b from-neutral-50 to-neutral-200 bg-clip-text md:text-2xl">
          {card.title}
        </div>
      </div>
    </div>
  );
};

export const Card = React.memo(CardComponent);

Card.displayName = "Card";

export function FocusCards({ cards }: { cards: FocusCard[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 md:grid-cols-3 md:px-8">
      {cards.map((card, index) => (
        <Card
          key={`${card.title}-${index}`}
          card={card}
          index={index}
          hovered={hovered}
          setHovered={setHovered}
        />
      ))}
    </div>
  );
}
