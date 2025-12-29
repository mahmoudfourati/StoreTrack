"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowUpRight, ArrowDownLeft, RefreshCw, Package } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";

export default function MovementsPage() {
  const [movements, setMovements] = useState([]);
  const [articles, setArticles] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    article_id: "",
    warehouse_from: "",
    warehouse_to: "",
    qty: "",
    type: "transfer",
    note: ""
  });

  useEffect(() => {
    fetchMovements();
    fetchArticles();
    fetchWarehouses();
  }, []);

  const fetchMovements = async () => {
    try {
      const response = await api.get("/movements");
      setMovements(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Erreur de chargement des mouvements");
    }
  };

  const fetchArticles = async () => {
    try {
      const response = await api.get("/articles");
      setArticles(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get("/warehouses");
      setWarehouses(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      article_id: "",
      warehouse_from: "",
      warehouse_to: "",
      qty: "",
      type: "transfer",
      note: ""
    });
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.article_id || !formData.qty) {
      toast.error("Article et quantité sont requis");
      return;
    }

    if (formData.type === "transfer" && (!formData.warehouse_from || !formData.warehouse_to)) {
      toast.error("Les entrepôts source et destination sont requis pour un transfert");
      return;
    }

    if (formData.type === "in" && !formData.warehouse_to) {
      toast.error("L'entrepôt de destination est requis pour une entrée");
      return;
    }

    if (formData.type === "out" && !formData.warehouse_from) {
      toast.error("L'entrepôt source est requis pour une sortie");
      return;
    }

    try {
      await api.post("/movements", {
        ...formData,
        warehouse_from: formData.warehouse_from || null,
        warehouse_to: formData.warehouse_to || null
      });
      toast.success("Mouvement créé avec succès !");
      setModalOpen(false);
      fetchMovements();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erreur lors de la création");
    }
  };

  const getTypeBadge = (type) => {
    switch(type) {
      case "in":
        return <Badge className="bg-green-500"><ArrowDownLeft className="w-3 h-3 mr-1" />Entrée</Badge>;
      case "out":
        return <Badge className="bg-red-500"><ArrowUpRight className="w-3 h-3 mr-1" />Sortie</Badge>;
      case "transfer":
        return <Badge className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1" />Transfert</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-6 h-6" />
              Gestion des Mouvements de Stock
            </CardTitle>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau Mouvement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nouveau Mouvement</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Article *</label>
                      <select
                        name="article_id"
                        value={formData.article_id}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                        required
                      >
                        <option value="">Sélectionner un article</option>
                        {articles.map(art => (
                          <option key={art.id} value={art.id}>
                            {art.name} ({art.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Type de mouvement *</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                        required
                      >
                        <option value="in">Entrée (Réception)</option>
                        <option value="out">Sortie (Expédition)</option>
                        <option value="transfer">Transfert inter-entrepôts</option>
                      </select>
                    </div>

                    {(formData.type === "out" || formData.type === "transfer") && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Entrepôt source {formData.type === "transfer" ? "*" : ""}
                        </label>
                        <select
                          name="warehouse_from"
                          value={formData.warehouse_from}
                          onChange={handleChange}
                          className="w-full border rounded px-3 py-2"
                          required={formData.type === "out" || formData.type === "transfer"}
                        >
                          <option value="">Sélectionner l'entrepôt source</option>
                          {warehouses.map(wh => (
                            <option key={wh.id} value={wh.id}>
                              {wh.name} - {wh.location}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(formData.type === "in" || formData.type === "transfer") && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Entrepôt destination {formData.type === "transfer" ? "*" : ""}
                        </label>
                        <select
                          name="warehouse_to"
                          value={formData.warehouse_to}
                          onChange={handleChange}
                          className="w-full border rounded px-3 py-2"
                          required={formData.type === "in" || formData.type === "transfer"}
                        >
                          <option value="">Sélectionner l'entrepôt destination</option>
                          {warehouses.map(wh => (
                            <option key={wh.id} value={wh.id}>
                              {wh.name} - {wh.location}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">Quantité *</label>
                      <Input
                        type="number"
                        name="qty"
                        value={formData.qty}
                        onChange={handleChange}
                        placeholder="Ex: 100"
                        min="1"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Note</label>
                      <Input
                        type="text"
                        name="note"
                        value={formData.note}
                        onChange={handleChange}
                        placeholder="Remarque optionnelle"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">Créer le mouvement</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Aucun mouvement enregistré</p>
              <p className="text-sm">Créez votre premier mouvement pour suivre vos stocks</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Vers</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((mvt) => (
                  <TableRow key={mvt.id}>
                    <TableCell className="text-xs text-gray-600">
                      {formatDate(mvt.created_at)}
                    </TableCell>
                    <TableCell>{getTypeBadge(mvt.type)}</TableCell>
                    <TableCell className="font-medium">{mvt.article_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{mvt.qty} unités</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {mvt.from_warehouse || <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {mvt.to_warehouse || <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {mvt.note || <span className="text-gray-400">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
