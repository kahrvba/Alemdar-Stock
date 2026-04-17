import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { DeploymentRefreshGuard } from "@/components/deployment-refresh-guard";
import { NavigationOverlayProvider } from "@/components/navigation-overlay-provider";
import { ToastProvider } from "@/components/ui/toast";
import { CartProvider } from "@/components/ui/cart";
import { getDeploymentVersion } from "@/lib/app-version";

export const metadata: Metadata = {
  title: "Alemdar Teknik LTD",
  description: "alemdar teknik ltd stock management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const deploymentVersionPromise = getDeploymentVersion();

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
                <ResolvedLayoutContent deploymentVersionPromise={deploymentVersionPromise}>
                  {children}
                </ResolvedLayoutContent>
              </NavigationOverlayProvider>
            </CartProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

async function ResolvedLayoutContent({
  children,
  deploymentVersionPromise,
}: {
  children: React.ReactNode;
  deploymentVersionPromise: ReturnType<typeof getDeploymentVersion>;
}) {
  const deploymentVersion = await deploymentVersionPromise;

  return (
    <>
      <SiteHeader initialVersion={deploymentVersion} />
      <DeploymentRefreshGuard initialVersion={deploymentVersion} />
      <main>{children}</main>
    </>
  );
}
