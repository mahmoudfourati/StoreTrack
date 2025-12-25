"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function EditArticleDialog({ article, onClose, onSaved }) {

  // 👉 FIX ici : si article est null → on ne tente pas de lire article.name
  if (!article) return null;

  const [form, setForm] = useState({
    name: article.name || "",
    sku: article.sku || "",
    category: article.category || "",
    price_tnd: article.price_tnd ?? "",
    description: article.description ?? "",
  });

  const [saving, setSaving] = useState(false);

  const update = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function handleSave() {
    try {
      setSaving(true);
      const res = await fetch(`http://localhost:5000/api/articles/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("failed");
      toast.success("Article modifié");
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Impossible de modifier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l'article</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Nom" />
          <Input value={form.sku} onChange={(e) => update("sku", e.target.value)} placeholder="SKU" />
          <Input value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="Catégorie" />
          <Input value={form.price_tnd} type="number" onChange={(e) => update("price_tnd", e.target.value)} placeholder="Prix TND" />
          <Input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Description" />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
