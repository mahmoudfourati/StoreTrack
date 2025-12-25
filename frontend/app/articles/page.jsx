"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Edit2, Trash2 } from "lucide-react";
import EditArticleDialog from "@/components/articles/EditArticleDialog";
import ConfirmDeleteDialog from "@/components/articles/ConfirmDeleteDialog";
import { toast } from "sonner";

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // dialogs state
  const [editingArticle, setEditingArticle] = useState(null); // article object or null
  const [deletingArticle, setDeletingArticle] = useState(null); // article object or null

  async function loadArticles() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/articles");
      if (!res.ok) throw new Error("Erreur API");
      const data = await res.json();
      setArticles(data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les articles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticles();
  }, []);

  // delete helper
  async function handleDeleteConfirmed(id) {
  try {
    const res = await fetch(`http://localhost:5000/api/articles/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.details || data?.error || "Impossible de supprimer";
      throw new Error(msg);
    }

    toast.success("Article supprimé");
    setDeletingArticle(null);
    loadArticles();

  } catch (err) {
    console.error(err);
    toast.error(err.message);
  }
}


  // update helper called from EditArticleDialog via prop onSaved
  function onArticleSaved() {
    setEditingArticle(null);
    loadArticles();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Articles</h1>
        <div className="flex gap-2">
          <Button onClick={loadArticles} variant="outline">
            Actualiser
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Aucun article pour le moment.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Prix (TND)</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {articles.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.sku}</TableCell>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>{a.category ?? "-"}</TableCell>
                      <TableCell>{typeof a.price_tnd === "number" ? a.price_tnd.toFixed(2) : a.price_tnd} TND</TableCell>
                      <TableCell>{a.created_at ? new Date(a.created_at).toLocaleString("fr-FR") : "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingArticle(a)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingArticle(a)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editingArticle && (
        <EditArticleDialog
          article={editingArticle}
          onClose={() => setEditingArticle(null)}
          onSaved={onArticleSaved}
        />
      )}

      {/* Confirm delete */}
      {deletingArticle && (
        <ConfirmDeleteDialog
          article={deletingArticle}
          onClose={() => setDeletingArticle(null)}
          onConfirm={() => handleDeleteConfirmed(deletingArticle.id)}
        />
      )}
    </div>
  );
}
