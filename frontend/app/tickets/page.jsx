"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Plus, Eye, AlertCircle, MessageCircle, Loader2 } from "lucide-react";

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [articles, setArticles] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comment, setComment] = useState("");
  
  const [formData, setFormData] = useState({
    article_id: "",
    warehouse_id: "",
    reporter: "",
    description: ""
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const [ticketsRes, articlesRes, warehousesRes] = await Promise.all([
        api.get("/tickets"),
        api.get("/articles"),
        api.get("/warehouses")
      ]);
      setTickets(ticketsRes.data);
      setArticles(articlesRes.data);
      setWarehouses(warehousesRes.data);
    } catch (error) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ article_id: "", warehouse_id: "", reporter: "", description: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/tickets", formData);
      toast.success("Ticket créé !");
      setModalOpen(false);
      resetForm();
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur");
    }
  };

  const handleViewTicket = async (id) => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setSelectedTicket(res.data);
      setViewModalOpen(true);
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`/tickets/${selectedTicket.id}/update`, { message: comment, user: "Utilisateur" });
      toast.success("Commentaire ajouté");
      setComment("");
      handleViewTicket(selectedTicket.id); // Refresh
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/tickets/${id}`, { status: newStatus });
      toast.success(`Statut: ${newStatus}`);
      fetchTickets();
      setViewModalOpen(false);
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: "bg-blue-100 text-blue-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-red-100 text-red-700"
    };
    const labels = { low: "Basse", medium: "Moyenne", high: "Haute" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[priority]}`}>{labels[priority]}</span>;
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: "bg-blue-100 text-blue-700",
      in_progress: "bg-yellow-100 text-yellow-700",
      resolved: "bg-green-100 text-green-700",
      closed: "bg-gray-100 text-gray-700"
    };
    const labels = { open: "Ouvert", in_progress: "En cours", resolved: "Résolu", closed: "Fermé" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tickets & Incidents</h1>
          <p className="text-gray-500 text-sm mt-1">{tickets.length} ticket(s)</p>
        </div>
        <button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={20} /> Nouveau ticket
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4">N° Ticket</th>
              <th className="p-4">Article</th>
              <th className="p-4">Entrepôt</th>
              <th className="p-4">Rapporteur</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-400">Aucun ticket</td></tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="p-4 font-mono text-sm">#{ticket.id}</td>
                  <td className="p-4 font-medium text-gray-900">{ticket.article_name}</td>
                  <td className="p-4 text-sm text-gray-600">{ticket.warehouse_name}</td>
                  <td className="p-4 text-sm text-gray-600">{ticket.reporter}</td>
                  <td className="p-4">{getStatusBadge(ticket.status)}</td>
                  <td className="p-4 text-sm text-gray-500">{new Date(ticket.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="p-4">
                    <button onClick={() => handleViewTicket(ticket.id)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg" title="Voir">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Nouveau Ticket</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Article concerné *</label>
                    <select required value={formData.article_id} onChange={(e) => setFormData({ ...formData, article_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="">Sélectionner un article...</option>
                      {articles.map(a => <option key={a.id} value={a.id}>{a.name} ({a.sku})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entrepôt *</label>
                    <select required value={formData.warehouse_id} onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="">Sélectionner un entrepôt...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rapporteur *</label>
                  <input type="text" required value={formData.reporter} onChange={(e) => setFormData({ ...formData, reporter: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Votre nom" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description du problème *</label>
                  <textarea required rows="4" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Décrivez le problème en détail..." />
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

      {/* VIEW MODAL */}
      {viewModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Ticket #{selectedTicket.id}</h2>
                  <p className="text-sm text-gray-500">{selectedTicket.title}</p>
                </div>
                <div className="flex gap-2">
                  {getPriorityBadge(selectedTicket.priority)}
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2">Description</h3>
                  <p className="text-sm text-gray-700">{selectedTicket.description}</p>
                </div>

                {selectedTicket.updates && selectedTicket.updates.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Historique des commentaires</h3>
                    <div className="space-y-2">
                      {selectedTicket.updates.map((update, idx) => (
                        <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <MessageCircle size={14} />
                            <span>{new Date(update.created_at).toLocaleString("fr-FR")}</span>
                          </div>
                          <p className="text-sm text-gray-700">{update.comment_text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ajouter un commentaire</label>
                  <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Votre commentaire..." />
                  <button onClick={handleAddComment} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Envoyer</button>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  {selectedTicket.status === "open" && (
                    <button onClick={() => handleUpdateStatus(selectedTicket.id, "in_progress")} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Passer en cours</button>
                  )}
                  {selectedTicket.status === "in_progress" && (
                    <button onClick={() => handleUpdateStatus(selectedTicket.id, "resolved")} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Marquer résolu</button>
                  )}
                  {selectedTicket.status === "resolved" && (
                    <button onClick={() => handleUpdateStatus(selectedTicket.id, "closed")} className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Fermer</button>
                  )}
                  <button onClick={() => setViewModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Fermer</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
