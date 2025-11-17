import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page() {
  const API = process.env.NEXT_PUBLIC_API_URL;
  let rows = [];
  try { const res = await fetch(`${API}/api/tickets`, { cache: "no-store" }); if (res.ok) rows = await res.json(); }
  catch (e) { console.error(e) }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Tickets</h1>
      <Card>
        <CardHeader><CardTitle>Incidents</CardTitle></CardHeader>
        <CardContent>
          {rows.map(t => <div key={t.id} className="p-2 border rounded mb-2">{t.reporter} — {t.status}</div>)}
        </CardContent>
      </Card>
    </div>
  );
}
