import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page() {
  const API = process.env.NEXT_PUBLIC_API_URL;
  let rows = [];
  try {
    const res = await fetch(`${API}/api/warehouses`, { cache: "no-store" });
    if (res.ok) rows = await res.json();
  } catch (e) { console.error(e) }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Entrepôts</h1>
      <Card>
        <CardHeader><CardTitle>Liste ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? <div>Aucun entrepôt</div> :
            <ul className="space-y-2">
              {rows.map(w => <li key={w.id} className="p-2 border rounded">{w.name} — {w.location}</li>)}
            </ul>
          }
        </CardContent>
      </Card>
    </div>
  );
}
