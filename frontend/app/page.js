import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Warehouse, Truck, ClipboardList } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

      {/* Articles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Articles</CardTitle>
          <Package className="w-6 h-6 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Total articles</p>
        </CardContent>
      </Card>

      {/* Warehouses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Warehouses</CardTitle>
          <Warehouse className="w-6 h-6 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Total entrepôts</p>
        </CardContent>
      </Card>

      {/* Suppliers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Suppliers</CardTitle>
          <Truck className="w-6 h-6 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Fournisseurs</p>
        </CardContent>
      </Card>

      {/* Purchase Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Purchase Orders</CardTitle>
          <ClipboardList className="w-6 h-6 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">PO créés</p>
        </CardContent>
      </Card>

    </div>
  )
}
