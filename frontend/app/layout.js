import "./globals.css";
import LayoutShell from "@/components/layout/SidebarFinal";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "StoreTrack",
  description: "Gestion de stock multi-entrepôts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <LayoutShell>{children}</LayoutShell>
        {/* Toaster must be mounted once in the app so toast() calls work */}
        <Toaster />
      </body>
    </html>
  );
}
