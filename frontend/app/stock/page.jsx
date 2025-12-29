"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { 
  Plus, Pencil, Trash2, AlertTriangle, Package, 
  Warehouse, MapPin, TrendingDown, Search, Loader2 
} from "lucide-react";

export default function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    article_id: "",
    warehouse_id: "",
    quantity: "",
    min_quantity: "5",
    location_code: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stocksRes, articlesRes, warehousesRes] = await Promise.all([
        api.get("/stocks"),
        api.get("/articles"),
        api.get("/warehouses")
      ]);
      setStocks(stocksRes.data);
      setArticles(articlesRes.data);
      setWarehouses(warehousesRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Erreur de chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      article_id: "",
      warehouse_id: "",
      quantity: "",
      min_quantity: "5",
      location_code: ""
    });
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (stock) => {
    setFormData({
      article_id: stock.article_id || "",
      warehouse_id: stock.warehouse_id || "",
      quantity: stock.quantity || "",
      min_quantity: stock.min_quantity || "5",
      location_code: stock.location_code || ""
    });
    setIsEditing(true);
    setCurrentId(stock.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/stocks/${currentId}`, formData);
        toast.success("Stock mis à jour !");
      } else {
        await api.post("/stocks", formData);
        toast.success("Stock ajouté !");
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce stock ?")) return;
    try {
      await api.delete(`/stocks/${id}`);
      toast.success("Stock supprimé");
      setStocks(stocks.filter(s => s.id !== id));
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur de suppression");
    }
  };

  const filteredStocks = stocks.filter(s => 
    s.article_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.location_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const alertStocks = stocks.filter(s => s.quantity <= (s.min_quantity || 0));

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Stocks</h1>
          <p className="text-gray-500 text-sm mt-1">Vue consolidée de l'inventaire multi-entrepôts</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Ajouter un stock
        </button>
      </div>

      {/* ALERTES */}
      {alertStocks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
            <AlertTriangle size={20} />
            {alertStocks.length} article(s) sous le seuil minimum
          </div>
          <div className="flex flex-wrap gap-2">
            {alertStocks.slice(0, 5).map(s => (
              <span key={s.id} className="bg-white px-3 py-1 rounded text-sm text-red-700">
                {s.article_name} ({s.quantity} restants)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stock Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {stocks.reduce((sum, s) => sum + (s.quantity || 0), 0)}
              </p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Entrepôts</p>
              <p className="text-2xl font-bold text-gray-900">{warehouses.length}</p>
            </div>
            <Warehouse className="w-10 h-10 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Alertes Stock</p>
              <p className="text-2xl font-bold text-red-600">{alertStocks.length}</p>
            </div>
            <TrendingDown className="w-10 h-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher par article, entrepôt, emplacement..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4">Article</th>
              <th className="p-4">Entrepôt</th>
              <th className="p-4">Quantité</th>
              <th className="p-4">Seuil Min</th>
              <th className="p-4">Emplacement</th>
              <th className="p-4">Statut</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStocks.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-400">
                  Aucun stock trouvé
                </td>
              </tr>
            ) : (
              filteredStocks.map((stock) => {
                const isLow = stock.quantity <= (stock.min_quantity || 0);
                return (
                  <tr key={stock.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{stock.article_name}</div>
                    </td>
                    <td className="p-4 text-gray-600">{stock.warehouse_name}</td>
                    <td className="p-4">
                      <span className={`font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {stock.quantity}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{stock.min_quantity || 0}</td>
                    <td className="p-4">
                      {stock.location_code ? (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <MapPin size={14} />
                          {stock.location_code}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Non défini</span>
                      )}
                    </td>
                    <td className="p-4">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <AlertTriangle size={12} />
                          Critique
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(stock)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"
                          title="Modifier"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(stock.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {isEditing ? "Modifier le stock" : "Ajouter un stock"}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Article *
                  </label>
                  <select
                    required
                    value={formData.article_id}
                    onChange={(e) => setFormData({...formData, article_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    disabled={isEditing}
                  >
                    <option value="">Sélectionner un article</option>
                    {articles.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entrepôt *
                  </label>
                  <select
                    required
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({...formData, warehouse_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    disabled={isEditing}
                  >
                    <option value="">Sélectionner un entrepôt</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantité *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seuil minimum *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.min_quantity}
                    onChange={(e) => setFormData({...formData, min_quantity: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code d'emplacement
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: A-3-12"
                    value={formData.location_code}
                    onChange={(e) => setFormData({...formData, location_code: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
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
                    {isEditing ? "Modifier" : "Ajouter"}
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
