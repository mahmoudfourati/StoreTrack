"use client"

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Boxes,
  Package,
  Users,
  Warehouse,
  Repeat,
  ClipboardList,
  Truck,
  Ticket,
  Database,
  Menu,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";

// A grouped menu definition matching your sitemap
const SECTIONS = [
  {
    title: "Général",
    items: [
      { name: "Dashboard", href: "/", icon: Home },
    ]
  },
  {
    title: "Stock",
    items: [
      { name: "Articles", href: "/articles", icon: Boxes },
      { name: "Stock", href: "/stock", icon: Database },
      { name: "Entrepôts", href: "/warehouses", icon: Warehouse },
      { name: "Mouvements", href: "/movements", icon: Package },
    ]
  },
  {
    title: "Achats",
    items: [
      { name: "Fournisseurs", href: "/suppliers", icon: Truck },
      { name: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
    ]
  },
  {
    title: "Ventes",
    items: [
      { name: "Clients", href: "/clients", icon: Users },
      { name: "Shipments", href: "/shipments", icon: Truck },
    ]
  },
  {
    title: "Opérations",
    items: [
      { name: "Transfers", href: "/transfers", icon: Repeat },
      { name: "Internal Requests", href: "/requests", icon: ClipboardList },
      { name: "Tickets", href: "/tickets", icon: Ticket },
    ]
  }
];

function NavItem({ href, name, icon: Icon, active, collapsed }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150",
      active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
    )}>
      <Icon className="w-5 h-5" />
      {!collapsed && <span className="truncate">{name}</span>}
    </Link>
  );
}

function SidebarContent({ collapsed }) {
  const pathname = usePathname() || "/";

  return (
    <nav className="flex-1 overflow-y-auto">
      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-4 px-2">
          {!collapsed && <div className="text-xs uppercase text-muted-foreground px-2 mb-2">{section.title}</div>}
          <div className="flex flex-col gap-1">
            {section.items.map((it) => (
              <NavItem
                key={it.href}
                href={it.href}
                name={it.name}
                icon={it.icon}
                active={pathname === it.href}
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function LayoutShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Mobile overlay */}
      <div className={`fixed inset-0 z-30 md:hidden ${mobileOpen ? "block" : "hidden"}`} onClick={() => setMobileOpen(false)} />

      {/* Sidebar */}
      <aside className={cn(
        "z-40 bg-card border-r h-screen md:relative fixed top-0 left-0 transition-transform duration-200",
        collapsed ? "w-20" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className={cn("flex items-center justify-between px-3 py-4 border-b") }>
          <div className="flex items-center gap-3">
            <Menu className="w-5 h-5" />
            {!collapsed && <span className="font-bold">StoreTrack</span>}
          </div>

          <div className="flex items-center gap-2">
            {/* collapse toggle */}
            <button aria-label="Toggle collapse" className="p-1 rounded-md hover:bg-muted" onClick={() => setCollapsed(s => !s)}>
              {collapsed ? <ChevronsRight className="w-4 h-4"/> : <ChevronsLeft className="w-4 h-4"/>}
            </button>
          </div>
        </div>

        <SidebarContent collapsed={collapsed} />

        {/* footer quick links */}
        <div className="p-3 border-t">
          {!collapsed ? (
            <div className="text-xs text-muted-foreground">© StoreTrack</div>
          ) : (
            <div className="text-center text-xs text-muted-foreground">©</div>
          )}
        </div>
      </aside>

      {/* Page area */}
      <div className="flex-1 md:pl-0">
        <header className="h-16 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-md hover:bg-muted" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">StoreTrack</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Admin</span>
              <div className="w-8 h-8 rounded-full bg-muted" />
            </div>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
