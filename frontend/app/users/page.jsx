"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Shield, UserCog, Loader2, Eye, EyeOff } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "worker"
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Erreur de chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "worker"
    });
    setIsEditing(false);
    setCurrentId(null);
    setShowPassword(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setFormData({
      username: user.username || "",
      email: user.email || "",
      password: "", // On ne charge pas le password pour la sécurité
      role: user.role || "worker"
    });
    setIsEditing(true);
    setCurrentId(user.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation du mot de passe
    if (!isEditing && !formData.password) {
      toast.error("Le mot de passe est obligatoire pour créer un utilisateur");
      return;
    }

    try {
      const payload = { ...formData };
      
      // Si on édite et que le mot de passe est vide, on ne l'envoie pas
      if (isEditing && !formData.password) {
        delete payload.password;
      }

      if (isEditing) {
        await api.put(`/users/${currentId}`, payload);
        toast.success("Utilisateur modifié !");
      } else {
        await api.post("/users", payload);
        toast.success("Utilisateur créé !");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erreur");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet utilisateur ? Cette action est irréversible.")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("Utilisateur supprimé");
      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur");
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: "bg-red-100 text-red-700 border-red-200",
      manager: "bg-blue-100 text-blue-700 border-blue-200",
      worker: "bg-gray-100 text-gray-700 border-gray-200"
    };
    const icons = {
      admin: <Shield size={14} />,
      manager: <UserCog size={14} />,
      worker: <Users size={14} />
    };
    const labels = {
      admin: "Admin",
      manager: "Manager",
      worker: "Employé"
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[role] || styles.worker}`}>
        {icons[role] || icons.worker}
        {labels[role] || role}
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
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} utilisateur(s) enregistré(s)</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Ajouter un utilisateur
        </button>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4">Utilisateur</th>
              <th className="p-4">Email</th>
              <th className="p-4">Rôle</th>
              <th className="p-4">Date création</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.username}</div>
                        <div className="text-xs text-gray-500">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{user.email}</td>
                  <td className="p-4">{getRoleBadge(user.role)}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"
                        title="Modifier"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {isEditing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom d&apos;utilisateur *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: jdupont"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="utilisateur@exemple.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe {isEditing && "(laisser vide pour ne pas changer)"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={isEditing ? "Nouveau mot de passe..." : "Mot de passe sécurisé"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="worker">Employé (Worker)</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrateur</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.role === "admin" && "Accès complet au système"}
                    {formData.role === "manager" && "Accès à la gestion des stocks et commandes"}
                    {formData.role === "worker" && "Accès basique en lecture/écriture"}
                  </p>
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
                    {isEditing ? "Modifier" : "Créer"}
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
