import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page() {
  const API = process.env.NEXT_PUBLIC_API_URL;
  let stocks = [];
  try {
    const res = await fetch(`${API}/api/stocks`, { cache: "no-store" });
    if (res.ok) stocks = await res.json();
  } catch (e) { console.error(e) }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Stocks</h1>
      <Card>
        <CardHeader><CardTitle>Inventaire</CardTitle></CardHeader>
        <CardContent>
          {stocks.length === 0 ? <div>Aucun stock disponible</div> :
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="p-2">Article</th>
                    <th className="p-2">Entrepôt</th>
                    <th className="p-2">Quantité</th>
                    <th className="p-2">Seuil min</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map(s => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2">{s.article_name || s.article_id}</td>
                      <td className="p-2">{s.warehouse_name || s.warehouse_id}</td>
                      <td className="p-2">{s.quantity}</td>
                      <td className="p-2">{s.min_quantity ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
