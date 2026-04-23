import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { NavigationOverlayProvider } from "@/components/navigation-overlay-provider";
import { ToastProvider } from "@/components/ui/toast";
import { CartProvider } from "@/components/ui/cart";
import { CurrencyRatesProvider } from "@/components/currency-rates-provider";
import { getAppVersion } from "@/lib/app-version";

export const metadata: Metadata = {
  title: "Alemdar Teknik LTD",
  description: "alemdar teknik ltd stock management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appVersionPromise = getAppVersion();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ToastProvider>
            <CurrencyRatesProvider>
              <CartProvider>
                <NavigationOverlayProvider>
                  <ResolvedLayoutContent appVersionPromise={appVersionPromise}>
                    {children}
                  </ResolvedLayoutContent>
                </NavigationOverlayProvider>
              </CartProvider>
            </CurrencyRatesProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

async function ResolvedLayoutContent({
  children,
  appVersionPromise,
}: {
  children: React.ReactNode;
  appVersionPromise: ReturnType<typeof getAppVersion>;
}) {
  const appVersion = await appVersionPromise;

  return (
    <>
      <SiteHeader appVersion={appVersion} />
      <main>{children}</main>
    </>
  );
}
