"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ArrowRightLeft, 
  Warehouse, 
  FileText, 
  AlertTriangle, 
  Truck, 
  Users, 
  Settings, 
  Search,
  Menu,
  BarChart3,
  ClipboardCheck,
  LogOut,
  Moon,
  Sun,
  PackageX,
  ScanBarcode,
  ShoppingCart,
  UserCircle,
  Send
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useTheme } from "@/lib/themeContext";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Configuration du menu (pour modifier facilement plus tard)
const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Inventaire", href: "/articles", icon: Package },
  { name: "Scanner", href: "/scanner", icon: ScanBarcode },
  { name: "Mouvements", href: "/movements", icon: ArrowRightLeft },
  { name: "Commandes d'Achat", href: "/purchase-orders", icon: ShoppingCart },
  { name: "Expéditions", href: "/shipments", icon: Send },
  { name: "Entrepôts", href: "/warehouses", icon: Warehouse },
  { name: "Clients", href: "/clients", icon: UserCircle },
  { name: "Fournisseurs", href: "/suppliers", icon: Truck },
  { name: "Rapports", href: "/reports", icon: BarChart3 },
  { name: "Inventaire Physique", href: "/inventory", icon: ClipboardCheck },
  { name: "Alertes Lots", href: "/lots", icon: PackageX },
  { name: "Commandes int.", href: "/requests", icon: FileText },
  { name: "Alertes & Incidents", href: "/tickets", icon: AlertTriangle },
  { name: "Utilisateurs", href: "/users", icon: Users },
  { name: "Paramètres", href: "/settings", icon: Settings },
];

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Si on est sur la page login, on rend juste le contenu (sans sidebar ni header)
  if (pathname === '/login') {
    return <main>{children}</main>;
  }
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* --- SIDEBAR (Fixe à gauche) --- */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8" />
            StoreTrack
          </div>
        </div>

        {/* Menu de navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Pied de sidebar (Utilisateur résumé ou logout) */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name || 'Utilisateur'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate" suppressHydrationWarning>{user?.role || 'admin'}</p>
            </div>
          </div>
          
          {/* Toggle Mode Sombre */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 mb-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4" />
                Mode Clair
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                Mode Sombre
              </>
            )}
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT (À droite de la sidebar) --- */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        
        {/* Header (Fixe en haut ou scroll avec la page) */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-40">
          
          {/* Barre de recherche */}
          <div className="flex items-center flex-1 max-w-lg">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Rechercher articles, entrepôts, commandes..."
              />
            </div>
          </div>

          {/* Actions Droite (Notifs + Language + Mobile Menu) */}
          <div className="flex items-center gap-4 ml-4">
            <NotificationBell />
            <LanguageSwitcher />
            
            {/* Bouton Menu Mobile (visible uniquement sur petit écran) */}
            <button className="md:hidden p-2 text-gray-400 hover:text-gray-500">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Contenu de la page (Injecté via {children}) */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}