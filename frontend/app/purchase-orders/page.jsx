import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page() {
  const API = process.env.NEXT_PUBLIC_API_URL;
  let rows = [];
  try { const res = await fetch(`${API}/api/purchase_orders`, { cache: "no-store" }); if (res.ok) rows = await res.json(); }
  catch (e) { console.error(e) }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Purchase Orders</h1>
      <Card>
        <CardHeader><CardTitle>POs ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? <div>Aucun PO</div> :
            rows.map(po => <div key={po.id} className="p-2 border rounded mb-2">{po.reference} — {po.status}</div>)
          }
        </CardContent>
      </Card>
    </div>
  );
}
