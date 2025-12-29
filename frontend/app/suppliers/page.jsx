"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Truck, Mail, Phone, MapPin, CreditCard, FileText, Loader2 } from "lucide-react";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    payment_terms: "",
    notes: ""
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Erreur de chargement des fournisseurs");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      payment_terms: "",
      notes: ""
    });
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (supplier) => {
    setFormData({
      name: supplier.name || "",
      contact_name: supplier.contact_name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      payment_terms: supplier.payment_terms || "",
      notes: supplier.notes || ""
    });
    setIsEditing(true);
    setCurrentId(supplier.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/suppliers/${currentId}`, formData);
        toast.success("Fournisseur modifié !");
      } else {
        await api.post("/suppliers", formData);
        toast.success("Fournisseur ajouté !");
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erreur");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce fournisseur ?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success("Fournisseur supprimé");
      setSuppliers(suppliers.filter(s => s.id !== id));
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
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Fournisseurs</h1>
          <p className="text-gray-500 text-sm mt-1">{suppliers.length} fournisseur(s) enregistré(s)</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Ajouter un fournisseur
        </button>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4">Fournisseur</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Email</th>
              <th className="p-4">Téléphone</th>
              <th className="p-4">Conditions paiement</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400">
                  Aucun fournisseur trouvé
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Truck className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        {supplier.notes && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <FileText size={12} />
                            {supplier.notes.substring(0, 30)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{supplier.contact_name || "-"}</td>
                  <td className="p-4">
                    {supplier.email ? (
                      <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                        <Mail size={14} />
                        {supplier.email}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    {supplier.phone ? (
                      <span className="flex items-center gap-1 text-gray-600">
                        <Phone size={14} />
                        {supplier.phone}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    {supplier.payment_terms ? (
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <CreditCard size={14} />
                        {supplier.payment_terms}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(supplier)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"
                        title="Modifier"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
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

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {isEditing ? "Modifier le fournisseur" : "Nouveau fournisseur"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du fournisseur / Entreprise *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Fournisseur XYZ"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Personne de contact
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: M. Martin"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="contact@fournisseur.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      placeholder="+216 12 345 678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse
                    </label>
                    <textarea
                      rows="2"
                      placeholder="Adresse complète"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conditions de paiement
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 30 jours, 60 jours fin de mois..."
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Informations complémentaires..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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
