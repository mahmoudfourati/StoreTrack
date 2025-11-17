import "./globals.css";
import LayoutShell from "@/components/layout/SidebarFinal";

export const metadata = {
  title: "StoreTrack",
  description: "Gestion de stock multi-entrepôts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
