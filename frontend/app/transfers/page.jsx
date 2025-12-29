"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Plus, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function TransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    from_warehouse_id: "",
    to_warehouse_id: "",
    notes: "",
    status: "pending"
  });

  const [items, setItems] = useState([{ article_id: "", quantity: "" }]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transfersRes, warehousesRes, articlesRes] = await Promise.all([
        api.get("/transfers"),
        api.get("/warehouses"),
        api.get("/articles")
      ]);
      setTransfers(transfersRes.data);
      setWarehouses(warehousesRes.data);
      setArticles(articlesRes.data);
    } catch (error) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ from_warehouse_id: "", to_warehouse_id: "", notes: "", status: "pending" });
    setItems([{ article_id: "", quantity: "" }]);
  };

  const addItem = () => setItems([...items, { article_id: "", quantity: "" }]);
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.from_warehouse_id === formData.to_warehouse_id) {
      toast.error("Les entrepôts source et destination doivent être différents");
      return;
    }
    if (!items.every(item => item.article_id && item.quantity)) {
      toast.error("Veuillez remplir tous les articles");
      return;
    }
    try {
      await api.post("/transfers", { ...formData, items });
      toast.success("Transfert créé !");
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/transfers/${id}`, { status: newStatus });
      toast.success(`Statut: ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700",
      in_transit: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700"
    };
    const labels = { pending: "En attente", in_transit: "En transit", completed: "Terminé", cancelled: "Annulé" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transferts Inter-entrepôts</h1>
          <p className="text-gray-500 text-sm mt-1">{transfers.length} transfert(s)</p>
        </div>
        <button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={20} /> Nouveau transfert
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4">N° Transfert</th>
              <th className="p-4">De → Vers</th>
              <th className="p-4">Date</th>
              <th className="p-4">Statut</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transfers.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-400">Aucun transfert</td></tr>
            ) : (
              transfers.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-gray-50">
                  <td className="p-4 font-mono text-sm">#{transfer.id}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">{transfer.from_warehouse_name}</span>
                      <ArrowRight size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-900">{transfer.to_warehouse_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-500">{new Date(transfer.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="p-4">{getStatusBadge(transfer.status)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {transfer.status === "pending" && (
                        <button onClick={() => handleUpdateStatus(transfer.id, "in_transit")} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                          Expédier
                        </button>
                      )}
                      {transfer.status === "in_transit" && (
                        <button onClick={() => handleUpdateStatus(transfer.id, "completed")} className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Confirmer réception
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Nouveau Transfert</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entrepôt source *</label>
                    <select required value={formData.from_warehouse_id} onChange={(e) => setFormData({ ...formData, from_warehouse_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="">Sélectionner...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entrepôt destination *</label>
                    <select required value={formData.to_warehouse_id} onChange={(e) => setFormData({ ...formData, to_warehouse_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="">Sélectionner...</option>
                      {warehouses.filter(w => w.id != formData.from_warehouse_id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows="2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">Articles à transférer</h3>
                    <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Ajouter</button>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                      <select required value={item.article_id} onChange={(e) => updateItem(idx, "article_id", e.target.value)} className="col-span-9 border rounded-lg px-3 py-2 text-sm">
                        <option value="">Sélectionner article...</option>
                        {articles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <input type="number" required placeholder="Qté" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="col-span-3 border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Créer</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
