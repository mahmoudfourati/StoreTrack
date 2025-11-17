"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Boxes,
  Package,
  Users,
  Warehouse,
  Repeat,
  ClipboardList,
  Truck,
  Ticket
} from "lucide-react"

const menuItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Articles", href: "/articles", icon: Boxes },
  { name: "Warehouses", href: "/warehouses", icon: Warehouse },
  { name: "Stock", href: "/stock", icon: Package },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
  { name: "Shipments", href: "/shipments", icon: Truck },
  { name: "Transfers", href: "/transfers", icon: Repeat },
  { name: "Internal Requests", href: "/requests", icon: ClipboardList },
  { name: "Tickets", href: "/tickets", icon: Ticket },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-card h-screen p-4 flex flex-col gap-4">
      <h1 className="text-xl font-bold">StoreTrack</h1>

      <nav className="flex flex-col gap-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
