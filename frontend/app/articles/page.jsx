"use client";

import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");

  async function loadArticles() {
    try {
      const res = await fetch("http://localhost:5000/api/articles");
      const data = await res.json();
      setArticles(data);
    } catch (error) {
      console.error("Erreur fetch articles :", error);
      toast.error("Erreur lors du chargement des articles");
    } finally {
      setLoading(false);
    }
  }

  async function addArticle() {
  try {
    const res = await fetch("http://localhost:5000/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sku, category, price_tnd: price })
    });

    // debug logs -> on veut voir TOUT (status + body)
    const text = await res.text().catch(()=>null);
    console.log("DEBUG POST /api/articles -> status:", res.status, "ok:", res.ok, "text:", text);

    // Try parse JSON if possible
    let json = null;
    try { json = JSON.parse(text); } catch(e) {}

    if (!res.ok) {
      console.error("API ERROR:", res.status, json || text);
      toast.error("Impossible d'ajouter l’article (" + (json?.error || res.status) + ")");
      return;
    }

    toast.success("Article ajouté !");
    // refresh list
    loadArticles();
    // clear fields
    setName(""); setSku(""); setCategory(""); setPrice("");
  } catch (err) {
    console.error("FETCH CATCH ERROR:", err);
    toast.error("Erreur réseau — vérifie la console");
  }
}


  useEffect(() => {
    loadArticles();
  }, []);

  return (
    <div className="p-6">
      <Toaster />

      <h1 className="text-2xl font-bold mb-4">Articles</h1>

      <Dialog>
        <DialogTrigger asChild>
          <Button>Ajouter un article</Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel article</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
            <Input placeholder="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} />
            <Input placeholder="Prix TND" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          <DialogFooter>
            <Button onClick={addArticle}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-5">
        {loading ? (
          <p>Chargement…</p>
        ) : articles.length === 0 ? (
          <p>Aucun article pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <h2 className="font-semibold">{a.name}</h2>
                  <p className="text-sm text-muted-foreground">SKU: {a.sku}</p>
                  <p className="text-sm">Catégorie : {a.category}</p>
                  <p className="text-sm">Prix : {a.price_tnd} TND</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
