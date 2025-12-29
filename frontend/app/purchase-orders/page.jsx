"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { 
  Plus, Eye, Pencil, Trash2, FileText, ShoppingCart, 
  CheckCircle2, Package, Loader2, Calendar, User, AlertCircle 
} from "lucide-react";

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [formData, setFormData] = useState({
    supplier_id: "",
    warehouse_id: "",
    expected_date: "",
    notes: "",
    status: "draft"
  });

  const [items, setItems] = useState([{ article_id: "", quantity: "", unit_price: "" }]);

  const [receiveData, setReceiveData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, suppliersRes, warehousesRes, articlesRes] = await Promise.all([
        api.get("/purchase_orders"),
        api.get("/suppliers"),
        api.get("/warehouses"),
        api.get("/articles")
      ]);
      setOrders(ordersRes.data);
      setSuppliers(suppliersRes.data);
      setWarehouses(warehousesRes.data);
      setArticles(articlesRes.data);
    } catch (error) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ supplier_id: "", warehouse_id: "", expected_date: "", notes: "", status: "draft" });
    setItems([{ article_id: "", quantity: "", unit_price: "" }]);
  };

  const addItem = () => {
    setItems([...items, { article_id: "", quantity: "", unit_price: "" }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0 || !items.every(item => item.article_id && item.quantity && item.unit_price)) {
      toast.error("Veuillez remplir tous les articles");
      return;
    }

    try {
      await api.post("/purchase_orders", { ...formData, items });
      toast.success("Commande créée !");
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur");
    }
  };

  const handleViewOrder = async (id) => {
    try {
      const res = await api.get(`/purchase_orders/${id}`);
      setSelectedOrder(res.data);
      setViewModalOpen(true);
    } catch (error) {
      toast.error("Erreur de chargement");
    }
  };

  const handleOpenReceive = (order) => {
    setSelectedOrder(order);
    // Initialize receive data with order items
    const initialData = order.items.map(item => ({
      item_id: item.id,
      article_name: item.article_name,
      qty_ordered: item.qty_ordered || item.quantity,
      qty_received: item.qty_ordered || item.quantity,
      manufacturing_date: "",
      expiration_date: "",
      supplier_batch: ""
    }));
    setReceiveData(initialData);
    setReceiveModalOpen(true);
    setViewModalOpen(false);
  };

  const handleReceiveSubmit = async () => {
    try {
      await api.post(`/purchase_orders/${selectedOrder.id}/receive`, {
        received: receiveData.map(item => ({
          item_id: item.item_id,
          qty_received: item.qty_received,
          manufacturing_date: item.manufacturing_date,
          expiration_date: item.expiration_date,
          supplier_batch: item.supplier_batch
        }))
      });
      toast.success("Réception enregistrée!");
      setReceiveModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur de réception");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/purchase_orders/${id}`, { status: newStatus });
      toast.success(`Statut mis à jour: ${newStatus}`);
      fetchData();
      setViewModalOpen(false);
    } catch (error) {
      toast.error("Erreur de mise à jour");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette commande ?")) return;
    try {
      await api.delete(`/purchase_orders/${id}`);
      toast.success("Commande supprimée");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      pending: "bg-yellow-100 text-yellow-700",
      received: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700"
    };
    const labels = {
      draft: "Brouillon",
      pending: "En attente",
      received: "Reçue",
      cancelled: "Annulée"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Commandes d&apos;Achat</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} commande(s)</p>
        </div>
        <button
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Nouvelle commande
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4">N° Commande</th>
              <th className="p-4">Fournisseur</th>
              <th className="p-4">Date attendue</th>
              <th className="p-4">Total</th>
              <th className="p-4">Statut</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400">
                  Aucune commande trouvée
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="p-4 font-mono text-sm">#{order.id}</td>
                  <td className="p-4 font-medium text-gray-900">{order.supplier_name}</td>
                  <td className="p-4 text-gray-600">
                    {order.expected_date ? new Date(order.expected_date).toLocaleDateString("fr-FR") : "-"}
                  </td>
                  <td className="p-4 font-semibold text-gray-900">{order.total_amount} TND</td>
                  <td className="p-4">{getStatusBadge(order.status)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleViewOrder(order.id)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"
                        title="Voir"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Nouvelle Commande d&apos;Achat</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur *</label>
                    <select
                      required
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Sélectionner...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entrepôt *</label>
                    <select
                      required
                      value={formData.warehouse_id}
                      onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Sélectionner...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date attendue</label>
                    <input
                      type="date"
                      value={formData.expected_date}
                      onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">Articles</h3>
                    <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">
                      + Ajouter un article
                    </button>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                      <select
                        required
                        value={item.article_id}
                        onChange={(e) => updateItem(idx, "article_id", e.target.value)}
                        className="col-span-6 border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Sélectionner article...</option>
                        {articles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <input
                        type="number"
                        required
                        placeholder="Quantité"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        className="col-span-2 border rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Prix unitaire"
                        value={item.unit_price}
                        onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                        className="col-span-3 border rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="col-span-1 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
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
                    Créer la commande
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Commande #{selectedOrder.id}</h2>
                  <p className="text-sm text-gray-500">Fournisseur: {selectedOrder.supplier_name}</p>
                </div>
                {getStatusBadge(selectedOrder.status)}
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Date attendue:</span>
                    <span className="font-medium">{selectedOrder.expected_date ? new Date(selectedOrder.expected_date).toLocaleDateString("fr-FR") : "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-lg">{selectedOrder.total_amount} TND</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Articles commandés</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-left">Article</th>
                          <th className="p-3 text-center">Quantité</th>
                          <th className="p-3 text-right">Prix unitaire</th>
                          <th className="p-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedOrder.items?.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-3">{item.article_name}</td>
                            <td className="p-3 text-center">{item.quantity}</td>
                            <td className="p-3 text-right">{item.unit_price} TND</td>
                            <td className="p-3 text-right font-medium">{(item.quantity * item.unit_price).toFixed(2)} TND</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <h3 className="font-semibold mb-1 text-sm">Notes</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  {selectedOrder.status === "draft" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, "pending")}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      Envoyer au fournisseur
                    </button>
                  )}
                  {selectedOrder.status === "pending" && (
                    <button
                      onClick={() => handleOpenReceive(selectedOrder)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Recevoir la commande
                    </button>
                  )}
                  <button
                    onClick={() => setViewModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVE MODAL */}
      {receiveModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Recevoir Commande #{selectedOrder.id}
              </h2>
              
              <div className="space-y-4 mb-6">
                {receiveData.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-semibold mb-3">{item.article_name}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantité reçue * (commandée: {item.qty_ordered})
                        </label>
                        <input
                          type="number"
                          required
                          value={item.qty_received}
                          onChange={(e) => {
                            const newData = [...receiveData];
                            newData[idx].qty_received = e.target.value;
                            setReceiveData(newData);
                          }}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          N° Lot fournisseur
                        </label>
                        <input
                          type="text"
                          value={item.supplier_batch}
                          onChange={(e) => {
                            const newData = [...receiveData];
                            newData[idx].supplier_batch = e.target.value;
                            setReceiveData(newData);
                          }}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de fabrication *
                        </label>
                        <input
                          type="date"
                          required
                          value={item.manufacturing_date}
                          onChange={(e) => {
                            const newData = [...receiveData];
                            newData[idx].manufacturing_date = e.target.value;
                            setReceiveData(newData);
                          }}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date d'expiration *
                        </label>
                        <input
                          type="date"
                          required
                          value={item.expiration_date}
                          onChange={(e) => {
                            const newData = [...receiveData];
                            newData[idx].expiration_date = e.target.value;
                            setReceiveData(newData);
                          }}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setReceiveModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleReceiveSubmit}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirmer la réception
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
