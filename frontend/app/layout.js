import "./globals.css";
import LayoutShell from "@/components/layout/SidebarFinal";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider } from "@/lib/themeContext";
import { LanguageProvider } from "@/lib/languageContext";

export const metadata = {
  title: "StoreTrack",
  description: "Gestion de stock multi-entrepôts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              <LayoutShell>{children}</LayoutShell>
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
