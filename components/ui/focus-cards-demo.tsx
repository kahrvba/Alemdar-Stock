import { FocusCards } from "@/components/ui/focus-cards";
import type { FocusCard } from "@/components/ui/focus-cards";

export const focusCardsData = [
  {
    title: "Arduino Section",
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=3387&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fG1pY3JvY29udHJvbGxlcnxlbnwwfDB8MHx8fDA%3D",
    href: "/arduino",
  },
  {
    title: "Cable Section",
    src: "/Shutterstock%201167002386.jpg",
    href: "/cable",
  },
  {
    title: "Solar Section",
    src: "/Solar%20Panel%20System%20Components.jpg",
    href: "/solar",
  },
  {
    title: "Sound Section",
    src: "/Producción Pin.jpg",
    href: "/sound",
  },
  {
    title: "Invoices Section",
    src: "/invoice.webp",
    href: "/invoices",
  },
  {
    title: "TV Section",
    src: "/remote.png",
    href: "/tv-remotes",
  },
  {
    title: "Filaments Section",
    src: "/filament.png",
    href: "/filaments",
  },
  {
    title: "Batteries Section",
    src: "/battery.png",
    href: "/batteries",
  },
  {
    title: "Fan Section",
    src: "/fans.jpg",
    href: "/fans",
  },
  {
    title: "Others Section",
    src: "/others.png",
    href: "/others",
  },
] satisfies FocusCard[];

export default function FocusCardsDemo() {
  return <FocusCards cards={focusCardsData} />;
}
