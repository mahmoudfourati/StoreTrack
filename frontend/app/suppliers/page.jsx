import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page() {
  const API = process.env.NEXT_PUBLIC_API_URL;
  let data = [];
  try { const res = await fetch(`${API}/api/suppliers`, { cache: "no-store" }); if (res.ok) data = await res.json(); }
  catch (e) { console.error(e) }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Fournisseurs</h1>
      <Card>
        <CardHeader><CardTitle>Liste ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.map(s => <li key={s.id} className="p-2 border rounded">{s.name} — {s.contact_name}</li>)}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
