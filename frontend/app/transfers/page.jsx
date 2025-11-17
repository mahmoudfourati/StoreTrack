import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page() {
  const API = process.env.NEXT_PUBLIC_API_URL;
  let rows = [];
  try { const res = await fetch(`${API}/api/transfers`, { cache: "no-store" }); if (res.ok) rows = await res.json(); }
  catch (e) { console.error(e) }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Transferts</h1>
      <Card>
        <CardHeader><CardTitle>Historique</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? <div>Aucun transfert</div> :
            rows.map(t => <div key={t.id} className="p-2 border rounded mb-2">#{t.id} {t.qty} from {t.warehouse_from} → {t.warehouse_to}</div>)
          }
        </CardContent>
      </Card>
    </div>
  );
}
