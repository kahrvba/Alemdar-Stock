import { FocusCards } from "@/components/ui/focus-cards";
import type { FocusCard } from "@/components/ui/focus-cards";

export const focusCardsData = [
  {
    title: "Arduino Side",
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=3387&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fG1pY3JvY29udHJvbGxlcnxlbnwwfDB8MHx8fDA%3D",
    href: "/arduino",
  },
  {
    title: "Cable Side",
    src: "/Shutterstock%201167002386.jpg",
  },
  {
    title: "Solar Side",
    src: "/Solar%20Panel%20System%20Components.jpg",
  },
  {
    title: "Sound Side",
    src: "/Producción Pin.jpg",
  },
  {
    title: "Coming Soon",
    src: "/Coming%20Soon%20Display%20Background.jpg",
  },
  {
    title: "Coming Soon",
    src: "/Coming%20Soon%20Display%20Background.jpg",
  },
] satisfies FocusCard[];

export default function FocusCardsDemo() {
  return <FocusCards cards={focusCardsData} />;
}
