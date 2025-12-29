"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios"; // On utilise notre configurateur axios
import { LayoutDashboard, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner"; // Pour les notifications jolies

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); // On efface l'erreur quand l'utilisateur tape
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Appel au backend
      const response = await api.post("/auth/login", formData);
      
      // 2. Si succès : on stocke les infos
      const { token, username, role, userId } = response.data;
      
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({ userId, username, role }));

      // 3. Notification et Redirection
      toast.success(`Bienvenue, ${username} !`);
      router.push("/"); // Retour au dashboard
      
    } catch (err) {
      console.error(err);
      // Gestion des erreurs
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Erreur de connexion au serveur.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      
      {/* En-tête Logo */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <LayoutDashboard className="h-7 w-7" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">StoreTrack</h1>
        <p className="text-gray-500 text-sm mt-2">Connectez-vous pour gérer vos stocks</p>
      </div>

      {/* Carte de Connexion */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Champ Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email professionnel</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="admin@storetrack.com"
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Mot de passe</label>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500">Oublié ?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                <div className="h-1.5 w-1.5 rounded-full bg-red-600" />
                {error}
              </div>
            )}

            {/* Bouton Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>
        </div>
        
        {/* Footer gris */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Pas encore de compte ? Contactez votre administrateur IT.
          </p>
        </div>
      </div>
    </div>
  );
}