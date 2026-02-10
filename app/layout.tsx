import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { NavigationOverlayProvider } from "@/components/navigation-overlay-provider";
import { ToastProvider } from "@/components/ui/toast";
import { CartProvider } from "@/components/ui/cart";

export const metadata: Metadata = {
  title: "Alemdar Teknik LTD",
  description: "alemdar teknik ltd stock management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ToastProvider>
            <CartProvider>
              <NavigationOverlayProvider>
                <SiteHeader />
                <main>{children}</main>
              </NavigationOverlayProvider>
            </CartProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
