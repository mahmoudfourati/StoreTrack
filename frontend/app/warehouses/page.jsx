"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Warehouse, MapPin, Package, Loader2 } from "lucide-react";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    location: ""
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get("/warehouses");
      setWarehouses(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", location: "" });
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (warehouse) => {
    setFormData({
      name: warehouse.name || "",
      location: warehouse.location || ""
    });
    setIsEditing(true);
    setCurrentId(warehouse.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/warehouses/${currentId}`, formData);
        toast.success("Entrepôt modifié !");
      } else {
        await api.post("/warehouses", formData);
        toast.success("Entrepôt ajouté !");
      }
      setModalOpen(false);
      fetchWarehouses();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erreur");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet entrepôt ?")) return;
    try {
      await api.delete(`/warehouses/${id}`);
      toast.success("Entrepôt supprimé");
      setWarehouses(warehouses.filter(w => w.id !== id));
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur");
    }
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
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Entrepôts</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos sites de stockage</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Ajouter un entrepôt
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-400 bg-white rounded-lg border">
            Aucun entrepôt trouvé
          </div>
        ) : (
          warehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Warehouse className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{warehouse.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin size={14} />
                      {warehouse.location || "Non spécifié"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package size={16} />
                  <span>Stock disponible</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(warehouse)}
                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"
                    title="Modifier"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(warehouse.id)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {isEditing ? "Modifier l'entrepôt" : "Nouvel entrepôt"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'entrepôt *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dépôt Nord"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localisation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Tunis, Zone Industrielle"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
