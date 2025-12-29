"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, Package, Calendar, Archive, Plus, Search, Filter,
  Edit, Trash2, Eye, TrendingDown, Clock, Box, BarChart3
} from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";

export default function LotsPage() {
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState([]);
  const [expiringLots, setExpiringLots] = useState([]);
  const [stats, setStats] = useState({});
  const [articles, setArticles] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLot, setCurrentLot] = useState(null);
  
  const [filters, setFilters] = useState({
    article_id: "",
    warehouse_id: "",
    status: "active",
    expiring_days: "",
  });

  const [formData, setFormData] = useState({
    lot_number: "",
    article_id: "",
    warehouse_id: "",
    quantity: 0,
    manufacturing_date: "",
    expiration_date: "",
    supplier_batch: "",
    notes: "",
  });

  const [activeTab, setActiveTab] = useState("all"); // all | expiring | expired

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.article_id) params.article_id = filters.article_id;
      if (filters.warehouse_id) params.warehouse_id = filters.warehouse_id;
      if (filters.status) params.status = filters.status;
      if (filters.expiring_days) params.expiring_days = filters.expiring_days;

      const [lotsRes, expiringRes, statsRes, articlesRes, warehousesRes] = await Promise.all([
        api.get("/lots", { params }),
        api.get("/lots/expiring?days=30"),
        api.get("/lots/stats"),
        api.get("/articles"),
        api.get("/warehouses"),
      ]);

      setLots(lotsRes.data);
      setExpiringLots(expiringRes.data);
      setStats(statsRes.data);
      setArticles(articlesRes.data);
      setWarehouses(warehousesRes.data);
    } catch (error) {
      console.error("Erreur chargement lots:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({
      lot_number: "",
      article_id: "",
      warehouse_id: "",
      quantity: 0,
      manufacturing_date: "",
      expiration_date: "",
      supplier_batch: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (lot) => {
    setIsEditing(true);
    setCurrentLot(lot);
    setFormData({
      lot_number: lot.lot_number,
      article_id: lot.article_id,
      warehouse_id: lot.warehouse_id,
      quantity: lot.quantity,
      manufacturing_date: lot.manufacturing_date || "",
      expiration_date: lot.expiration_date || "",
      supplier_batch: lot.supplier_batch || "",
      notes: lot.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isEditing) {
        await api.put(`/lots/${currentLot.id}`, formData);
        toast.success("Lot mis à jour avec succès");
      } else {
        await api.post("/lots", formData);
        toast.success("Lot créé avec succès");
      }
      
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error.response?.data?.error || "Erreur lors de l'opération");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce lot ?")) return;
    
    try {
      await api.delete(`/lots/${id}`);
      toast.success("Lot supprimé avec succès");
      fetchData();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast.error(error.response?.data?.error || "Erreur lors de la suppression");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800",
      depleted: "bg-gray-100 text-gray-800",
      recalled: "bg-orange-100 text-orange-800",
    };
    return <Badge className={styles[status] || "bg-gray-100"}>{status}</Badge>;
  };

  const getExpirationBadge = (daysUntil) => {
    if (daysUntil === null || daysUntil === undefined) {
      return <Badge className="bg-gray-100 text-gray-800">Aucune</Badge>;
    }
    if (daysUntil < 0) {
      return <Badge className="bg-red-100 text-red-800">Expiré</Badge>;
    } else if (daysUntil === 0) {
      return <Badge className="bg-orange-100 text-orange-800">Aujourd&apos;hui</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge className="bg-orange-100 text-orange-800">{daysUntil}j</Badge>;
    } else if (daysUntil <= 30) {
      return <Badge className="bg-yellow-100 text-yellow-800">{daysUntil}j</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800">{daysUntil}j</Badge>;
    }
  };

  const filteredLots = () => {
    if (activeTab === "expiring") {
      return expiringLots;
    } else if (activeTab === "expired") {
      return lots.filter(l => l.status === "expired");
    } else {
      return lots;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Lots</h1>
          <p className="text-gray-500 mt-1">Traçabilité complète des lots par article et entrepôt</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={18} className="mr-2" />
          Nouveau Lot
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Lots</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_lots || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Tous statuts confondus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lots Actifs</CardTitle>
            <Box className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_lots || 0}</div>
            <p className="text-xs text-gray-500 mt-1">En stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expire 7j</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiring_7days || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Urgent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expire 30j</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiring_30days || 0}</div>
            <p className="text-xs text-gray-500 mt-1">À surveiller</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expirés</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expired_lots || 0}</div>
            <p className="text-xs text-gray-500 mt-1">À traiter</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Article</label>
              <select
                value={filters.article_id}
                onChange={(e) => setFilters({ ...filters, article_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Tous les articles</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Entrepôt</label>
              <select
                value={filters.warehouse_id}
                onChange={(e) => setFilters({ ...filters, warehouse_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Tous les entrepôts</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Tous</option>
                <option value="active">Actif</option>
                <option value="expired">Expiré</option>
                <option value="depleted">Épuisé</option>
                <option value="recalled">Rappelé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Expiration (jours)</label>
              <input
                type="number"
                value={filters.expiring_days}
                onChange={(e) => setFilters({ ...filters, expiring_days: e.target.value })}
                placeholder="Ex: 30"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 font-medium ${
            activeTab === "all"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
        >
          Tous les lots ({lots.length})
        </button>
        <button
          onClick={() => setActiveTab("expiring")}
          className={`px-4 py-2 font-medium ${
            activeTab === "expiring"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-500"
          }`}
        >
          Expirant bientôt ({expiringLots.length})
        </button>
        <button
          onClick={() => setActiveTab("expired")}
          className={`px-4 py-2 font-medium ${
            activeTab === "expired"
              ? "text-red-600 border-b-2 border-red-600"
              : "text-gray-500"
          }`}
        >
          Expirés ({lots.filter(l => l.status === "expired").length})
        </button>
      </div>

      {/* Lots Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    N° Lot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Article
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Entrepôt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fabrication
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Expiration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLots().map((lot) => (
                  <tr key={lot.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {lot.lot_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{lot.article_name}</div>
                      <div className="text-xs text-gray-500">{lot.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lot.warehouse_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold">{lot.quantity}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {lot.manufacturing_date || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{lot.expiration_date || "-"}</span>
                        {getExpirationBadge(lot.days_until_expiration)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(lot.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleOpenEdit(lot)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(lot.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLots().length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      Aucun lot trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {isEditing ? "Modifier le lot" : "Nouveau lot"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      N° Lot {!isEditing && "(auto si vide)"}
                    </label>
                    <input
                      type="text"
                      value={formData.lot_number}
                      onChange={(e) =>
                        setFormData({ ...formData, lot_number: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="LOT-20241227-00001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Article *
                    </label>
                    <select
                      required
                      value={formData.article_id}
                      onChange={(e) =>
                        setFormData({ ...formData, article_id: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Sélectionner...</option>
                      {articles.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Entrepôt *
                    </label>
                    <select
                      required
                      value={formData.warehouse_id}
                      onChange={(e) =>
                        setFormData({ ...formData, warehouse_id: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Sélectionner...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Quantité
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Date de fabrication
                    </label>
                    <input
                      type="date"
                      value={formData.manufacturing_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          manufacturing_date: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Date d&apos;expiration
                    </label>
                    <input
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expiration_date: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Batch fournisseur
                    </label>
                    <input
                      type="text"
                      value={formData.supplier_batch}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplier_batch: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Ex: BATCH-2024-12-001"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                      rows="2"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {isEditing ? "Mettre à jour" : "Créer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
