import { FocusCards } from "@/components/ui/focus-cards";
import type { FocusCard } from "@/components/ui/focus-cards";

export const focusCardsData = [
  {
    title: "Arduino Section",
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=3387&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fG1pY3JvY29udHJvbGxlcnxlbnwwfDB8MHx8fDA%3D",
    href: "/arduino",
  },
  {
    title: "Adapters Section",
    src: "/adaptors.jpg",
    href: "/adapters",
  },
  {
    title: "Cable Section",
    src: "/Shutterstock%201167002386.jpg",
    href: "/cable",
  },
  {
    title: "Spray & Gum Section",
    src: "/spray_gum.webp",
    href: "/spray-gum",
  },
  {
    title: "Chargers Section",
    src: "/chargers.jpg",
    href: "/chargers",
  },
  {
    title: "Solar Section",
    src: "/Solar%20Panel%20System%20Components.jpg",
    href: "/solar",
  },
  {
    title: "Mexxsun Section",
    src: "/mexxsun.png",
    href: "/mexxsun",
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
    title: "Electric Section",
    src: "/electric.png",
    href: "/electric",
  },
  {
    title: "Others Section",
    src: "/others.png",
    href: "/others",
  },
  {
    title: "Bulbs & Lamps",
    src: "/bulb.jpg",
    href: "/lamps",
  },
] satisfies FocusCard[];

export default function FocusCardsDemo() {
  return <FocusCards cards={focusCardsData} />;
}
