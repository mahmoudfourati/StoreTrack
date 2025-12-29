"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Plus, Eye, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ warehouse_id: "", requester: "", department: "", note: "" });
  const [items, setItems] = useState([{ article_id: "", qty_requested: "" }]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, warehousesRes, articlesRes] = await Promise.all([
        api.get("/internal_requests"),
        api.get("/warehouses"),
        api.get("/articles")
      ]);
      setRequests(requestsRes.data);
      setWarehouses(warehousesRes.data);
      setArticles(articlesRes.data);
    } catch (error) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ warehouse_id: "", requester: "", department: "", note: "" });
    setItems([{ article_id: "", qty_requested: "" }]);
  };

  const addItem = () => setItems([...items, { article_id: "", quantity: "" }]);
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!items.every(item => item.article_id && item.qty_requested)) {
      toast.error("Veuillez remplir tous les articles");
      return;
    }
    try {
      await api.post("/internal_requests", { ...formData, items });
      toast.success("Demande créée !");
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/internal_requests/${id}`, { status: newStatus });
      toast.success(`Statut: ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-blue-100 text-blue-700",
      fulfilled: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700"
    };
    const labels = { pending: "En attente", approved: "Approuvée", fulfilled: "Traitée", rejected: "Rejetée" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Demandes Internes</h1>
          <p className="text-gray-500 text-sm mt-1">{requests.length} demande(s)</p>
        </div>
        <button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={20} /> Nouvelle demande
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4">N° Demande</th>
              <th className="p-4">Entrepôt</th>
              <th className="p-4">Demandeur</th>
              <th className="p-4">Date</th>
              <th className="p-4">Statut</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-400">Aucune demande</td></tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="p-4 font-mono text-sm">#{request.id}</td>
                  <td className="p-4 font-medium text-gray-900">{request.warehouse_name}</td>
                  <td className="p-4 text-gray-600">{request.requester}</td>
                  <td className="p-4 text-sm text-gray-500">{new Date(request.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="p-4">{getStatusBadge(request.status)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {request.status === "pending" && (
                        <>
                          <button onClick={() => handleUpdateStatus(request.id, "approved")} className="p-1 hover:bg-green-50 text-green-600 rounded" title="Approuver">
                            <CheckCircle2 size={18} />
                          </button>
                          <button onClick={() => handleUpdateStatus(request.id, "rejected")} className="p-1 hover:bg-red-50 text-red-600 rounded" title="Rejeter">
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                      {request.status === "approved" && (
                        <button onClick={() => handleUpdateStatus(request.id, "fulfilled")} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                          Marquer traitée
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
              <h2 className="text-xl font-bold text-gray-800 mb-4">Nouvelle Demande Interne</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entrepôt *</label>
                    <select required value={formData.warehouse_id} onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="">Sélectionner...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Demandeur *</label>
                    <input type="text" required value={formData.requester} onChange={(e) => setFormData({ ...formData, requester: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Nom du demandeur" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows="2" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">Articles demandés</h3>
                    <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Ajouter</button>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                      <select required value={item.article_id} onChange={(e) => updateItem(idx, "article_id", e.target.value)} className="col-span-9 border rounded-lg px-3 py-2 text-sm">
                        <option value="">Sélectionner article...</option>
                        {articles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <input type="number" required placeholder="Qté" value={item.qty_requested} onChange={(e) => updateItem(idx, "qty_requested", e.target.value)} className="col-span-3 border rounded-lg px-3 py-2 text-sm" />
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
