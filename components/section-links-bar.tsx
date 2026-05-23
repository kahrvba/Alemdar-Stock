"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sectionLinks = [
  { href: "/arduino", label: "Arduino" },
  { href: "/adapters", label: "Adapters" },
  { href: "/batteries", label: "Batteries" },
  { href: "/cable", label: "Cable" },
  { href: "/spray-gum", label: "Spray & Gum" },
  { href: "/chargers", label: "Chargers" },
  { href: "/sound", label: "Sound" },
  { href: "/solar", label: "Solar" },
  { href: "/mexxsun", label: "Mexxsun" },
  { href: "/fans", label: "Fans" },
  { href: "/electric", label: "Electric" },
  { href: "/others", label: "Others" },
  { href: "/lamps", label: "Lamps" },
  { href: "/scrawesdriver", label: "Scrawesdriver" },
  { href: "/filaments", label: "Filaments" },
  { href: "/tv-remotes", label: "TV Remotes" },
  { href: "/invoices", label: "Invoices" },
];

export function SectionLinksBar() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <div className="border-b border-blue-500 px-4 py-2 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center gap-5 overflow-x-auto whitespace-nowrap text-base font-semibold">
        {sectionLinks.map((link) => (
          <Link key={link.href} href={link.href} className="text-blue-600 hover:underline dark:text-blue-400">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
