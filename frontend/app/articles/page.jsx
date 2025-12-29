"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import api from "@/lib/axios"; // Vérifie que ce chemin est bon
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, X, Save, Image as ImageIcon, Loader2, AlertTriangle } from "lucide-react";

export default function ArticlesPage() {
  // --- ÉTATS ---
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Formulaire unifié (noms correspondent à la BDD)
  const [formData, setFormData] = useState({
    name: "", 
    sku: "", 
    category: "Outillage", 
    price: "", 
    stock: "", 
    min_stock: "5", 
    lot_number: "",
    expiration_date: "",
    manufacturing_date: "",
    image: null
  });

  // --- CHARGEMENT ---
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await api.get("/articles");
      setArticles(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Erreur de chargement des articles");
    } finally {
      setLoading(false);
    }
  };

  // --- GESTION FORMULAIRE ---
  const resetForm = () => {
    setFormData({ 
      name: "", 
      sku: "", 
      category: "Outillage", 
      price: "", 
      stock: "", 
      min_stock: "5", 
      lot_number: "",
      expiration_date: "",
      manufacturing_date: "",
      image: null 
    });
    setPreviewUrl(null);
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (article) => {
    setFormData({
      name: article.name,
      sku: article.sku,
      category: article.category,
      price: article.price,
      stock: article.stock,
      min_stock: article.min_stock,
      lot_number: article.lot_number || "",
      expiration_date: article.expiration_date || "",
      manufacturing_date: article.manufacturing_date || "",
      image: null
    });
    setPreviewUrl(article.image_url);
    setIsEditing(true);
    setCurrentId(article.id);
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // --- SOUMISSION (CREATE / UPDATE) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    // On ajoute toutes les clés
    Object.keys(formData).forEach(key => {
        if (key === 'image' && !formData.image) return; // Ne pas envoyer null si pas d'image
        data.append(key, formData[key]);
    });

    try {
      if (isEditing) {
        await api.put(`/articles/${currentId}`, data);
        toast.success("Article modifié avec succès !");
      } else {
        await api.post("/articles", data);
        toast.success("Article créé avec succès !");
      }
      setModalOpen(false);
      resetForm();
      fetchArticles(); // Rafraîchir la liste
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.error || "Erreur lors de l'enregistrement";
      toast.error(errorMsg);
    }
  };

  // --- SUPPRESSION ---
  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet article ?")) return;
    try {
      await api.delete(`/articles/${id}`);
      toast.success("Article supprimé.");
      setArticles(articles.filter(a => a.id !== id));
    } catch (error) {
        // Si le backend renvoie une erreur 400 (notre check de clé étrangère)
        if (error.response && error.response.status === 400) {
            toast.error(error.response.data.error);
        } else {
            toast.error("Erreur technique lors de la suppression.");
        }
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des Articles</h1>
        <button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={20} /> Ajouter un article
        </button>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4">Article</th>
              <th className="p-4">Catégorie</th>
              <th className="p-4">Prix</th>
              <th className="p-4">Stock</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {articles.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-400">Aucun article trouvé</td></tr>
            ) : (
                articles.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border">
                        {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"/> : <ImageIcon className="text-gray-400" size={20}/>}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.sku}</div>
                    </div>
                    </td>
                    <td className="p-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{item.category}</span></td>
                    <td className="p-4 font-medium text-gray-700">{Number(item.price).toFixed(2)} TND</td>
                    <td className="p-4">
                        {item.stock <= item.min_stock ? (
                            <span className="text-red-600 flex items-center gap-1 font-bold text-sm"><AlertTriangle size={14}/> {item.stock} (Critique)</span>
                        ) : (
                            <span className="text-green-600 font-medium text-sm">{item.stock} en stock</span>
                        )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                    <button onClick={() => handleOpenEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"><Pencil size={18}/></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL (Ajout / Modif) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? "Modifier l'article" : "Nouvel Article"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div className="flex justify-center">
                  <label className="cursor-pointer group relative w-32 h-32 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 hover:border-blue-500 flex items-center justify-center overflow-hidden transition">
                      {previewUrl ? <Image src={previewUrl} alt="Preview" fill className="object-cover" /> : <div className="text-center text-gray-400"><ImageIcon className="mx-auto mb-1"/><span className="text-xs">Ajouter photo</span></div>}
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit</label>
                    <input name="name" value={formData.name} onChange={handleChange} required className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Marteau Pro" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Réf)</label>
                    <input name="sku" value={formData.sku} onChange={handleChange} required className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="REF-001" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full border rounded-lg p-2.5 bg-white">
                        <option>Outillage</option><option>Électronique</option><option>Mobilier</option><option>Divers</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prix (TND)</label>
                    <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} required className="w-full border rounded-lg p-2.5" placeholder="0.00" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock actuel</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleChange} required className="w-full border rounded-lg p-2.5" placeholder="0" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock minimum</label>
                    <input type="number" name="min_stock" value={formData.min_stock} onChange={handleChange} required className="w-full border rounded-lg p-2.5" placeholder="5" />
                </div>
              </div>

              {/* Section Lots */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  📦 Gestion des Lots
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de lot</label>
                    <input 
                      name="lot_number" 
                      value={formData.lot_number} 
                      onChange={handleChange} 
                      className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="LOT-2025-001" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date fabrication</label>
                    <input 
                      type="date" 
                      name="manufacturing_date" 
                      value={formData.manufacturing_date} 
                      onChange={handleChange} 
                      className="w-full border rounded-lg p-2.5" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date expiration</label>
                    <input 
                      type="date" 
                      name="expiration_date" 
                      value={formData.expiration_date} 
                      onChange={handleChange} 
                      className="w-full border rounded-lg p-2.5" 
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex justify-center items-center gap-2 transition">
                  <Save size={18} /> {isEditing ? "Enregistrer les modifications" : "Créer l'article"}
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