"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Plus, Eye, Truck, Loader2, Package } from "lucide-react";

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [clients, setClients] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: "",
    shipping_address: "",
    tracking_number: "",
    notes: "",
    status: "draft"
  });

  const [items, setItems] = useState([{ article_id: "", quantity: "" }]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [shipmentsRes, clientsRes, articlesRes] = await Promise.all([
        api.get("/shipments"),
        api.get("/clients"),
        api.get("/articles")
      ]);
      setShipments(shipmentsRes.data);
      setClients(clientsRes.data);
      setArticles(articlesRes.data);
    } catch (error) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ client_id: "", shipping_address: "", tracking_number: "", notes: "", status: "draft" });
    setItems([{ article_id: "", quantity: "" }]);
  };

  const addItem = () => setItems([...items, { article_id: "", quantity: "" }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!items.every(item => item.article_id && item.quantity)) {
      toast.error("Veuillez remplir tous les articles");
      return;
    }
    try {
      await api.post("/shipments", { ...formData, items });
      toast.success("Expédition créée !");
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/shipments/${id}`, { status: newStatus });
      toast.success(`Statut: ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      pending: "bg-yellow-100 text-yellow-700",
      dispatched: "bg-green-100 text-green-700"
    };
    const labels = { draft: "Brouillon", pending: "En attente", dispatched: "Expédiée" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Expéditions</h1>
          <p className="text-gray-500 text-sm mt-1">{shipments.length} expédition(s)</p>
        </div>
        <button
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Nouvelle expédition
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4">N° Expédition</th>
              <th className="p-4">Client</th>
              <th className="p-4">Adresse</th>
              <th className="p-4">Tracking</th>
              <th className="p-4">Statut</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shipments.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-400">Aucune expédition</td></tr>
            ) : (
              shipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-gray-50">
                  <td className="p-4 font-mono text-sm">#{shipment.id}</td>
                  <td className="p-4 font-medium text-gray-900">{shipment.client_name}</td>
                  <td className="p-4 text-gray-600 text-sm">{shipment.shipping_address?.substring(0, 40)}...</td>
                  <td className="p-4 font-mono text-xs">{shipment.tracking_number || "-"}</td>
                  <td className="p-4">{getStatusBadge(shipment.status)}</td>
                  <td className="p-4">
                    <select
                      value={shipment.status}
                      onChange={(e) => handleUpdateStatus(shipment.id, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="draft">Brouillon</option>
                      <option value="pending">En attente</option>
                      <option value="dispatched">Expédiée</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Nouvelle Expédition</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                    <select required value={formData.client_id} onChange={(e) => setFormData({ ...formData, client_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="">Sélectionner...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° de suivi</label>
                    <input type="text" value={formData.tracking_number} onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="TRACK123456" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse d&apos;expédition *</label>
                  <textarea required rows="2" value={formData.shipping_address} onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows="2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">Articles à expédier</h3>
                    <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Ajouter</button>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                      <select required value={item.article_id} onChange={(e) => updateItem(idx, "article_id", e.target.value)} className="col-span-8 border rounded-lg px-3 py-2 text-sm">
                        <option value="">Sélectionner article...</option>
                        {articles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <input type="number" required placeholder="Quantité" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="col-span-3 border rounded-lg px-3 py-2 text-sm" />
                      <button type="button" onClick={() => removeItem(idx)} className="col-span-1 text-red-600">✕</button>
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
