"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Save, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";

export default function InventoryPage() {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [articles, setArticles] = useState([]);
  const [inventoryData, setInventoryData] = useState({});
  const [discrepancies, setDiscrepancies] = useState([]);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get("/warehouses");
      setWarehouses(response.data);
    } catch (error) {
      toast.error("Erreur chargement entrepôts");
    }
  };

  const fetchArticlesForWarehouse = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/stocks?warehouse_id=${selectedWarehouse}`);
      setArticles(response.data);
      
      // Initialiser données inventaire avec stock théorique
      const initialData = {};
      response.data.forEach(article => {
        initialData[article.article_id] = {
          theoretical: article.quantity,
          actual: article.quantity, // Par défaut = théorique
          article_name: article.article_name,
          sku: article.sku
        };
      });
      setInventoryData(initialData);
      calculateDiscrepancies(initialData);
    } catch (error) {
      toast.error("Erreur chargement articles");
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchArticlesForWarehouse();
    }
  }, [selectedWarehouse, fetchArticlesForWarehouse]);

  const handleActualChange = (articleId, value) => {
    const newData = {
      ...inventoryData,
      [articleId]: {
        ...inventoryData[articleId],
        actual: parseInt(value) || 0
      }
    };
    setInventoryData(newData);
    calculateDiscrepancies(newData);
  };

  const calculateDiscrepancies = (data) => {
    const results = [];
    Object.entries(data).forEach(([articleId, values]) => {
      const diff = values.actual - values.theoretical;
      if (diff !== 0) {
        results.push({
          article_id: parseInt(articleId),
          article_name: values.article_name,
          sku: values.sku,
          theoretical: values.theoretical,
          actual: values.actual,
          difference: diff,
          type: diff > 0 ? 'surplus' : 'shortage'
        });
      }
    });
    setDiscrepancies(results);
  };

  const saveInventory = async () => {
    if (!selectedWarehouse) {
      toast.error("Sélectionnez un entrepôt");
      return;
    }

    if (discrepancies.length === 0) {
      toast.info("Aucun écart détecté");
      return;
    }

    try {
      setLoading(true);
      
      // Créer mouvements d'ajustement pour chaque écart
      for (const disc of discrepancies) {
        const movementData = {
          article_id: disc.article_id,
          warehouse_id: parseInt(selectedWarehouse),
          type: disc.type === 'surplus' ? 'in' : 'out',
          quantity: Math.abs(disc.difference),
          note: `Ajustement inventaire physique: ${disc.type === 'surplus' ? 'excédent' : 'manquant'} de ${Math.abs(disc.difference)} unités`
        };

        await api.post("/movements", movementData);
      }

      toast.success(`${discrepancies.length} ajustement(s) enregistré(s)`);
      
      // Recharger
      fetchArticlesForWarehouse();
      
    } catch (error) {
      console.error("Erreur sauvegarde inventaire:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const getTotalDiscrepancy = () => {
    return discrepancies.reduce((sum, d) => sum + Math.abs(d.difference), 0);
  };

  const getDiscrepancyIcon = (type) => {
    if (type === 'surplus') return <TrendingUp className="w-4 h-4 text-green-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventaire Physique</h1>
          <p className="text-gray-500 mt-1">Comptage et ajustement des stocks</p>
        </div>
        <Button 
          onClick={saveInventory} 
          disabled={loading || discrepancies.length === 0}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          Enregistrer Ajustements
        </Button>
      </div>

      {/* Sélection entrepôt */}
      <Card>
        <CardHeader>
          <CardTitle>Sélectionner l&apos;entrepôt à inventorier</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">-- Choisir un entrepôt --</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>
                {wh.name} - {wh.location}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Stats écarts */}
      {selectedWarehouse && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{articles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Écarts Détectés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{discrepancies.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Différences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalDiscrepancy()} unités</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tableau comptage */}
      {selectedWarehouse && (
        <Card>
          <CardHeader>
            <CardTitle>Comptage Physique</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Chargement...</p>
            ) : articles.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Aucun article dans cet entrepôt</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Théorique</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comptage Réel</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Écart</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {articles.map(article => {
                      const data = inventoryData[article.article_id];
                      const diff = data.actual - data.theoretical;
                      
                      return (
                        <tr key={article.article_id} className={diff !== 0 ? 'bg-orange-50' : ''}>
                          <td className="px-4 py-3 text-sm font-mono">{data.sku}</td>
                          <td className="px-4 py-3 text-sm">{data.article_name}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold">{data.theoretical}</td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0"
                              value={data.actual}
                              onChange={(e) => handleActualChange(article.article_id, e.target.value)}
                              className="w-24 text-right"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`font-semibold ${
                              diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'
                            }`}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {diff === 0 ? (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle className="w-3 h-3" />
                                OK
                              </Badge>
                            ) : diff > 0 ? (
                              <Badge className="bg-green-100 text-green-800 gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Excédent
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 gap-1">
                                <TrendingDown className="w-3 h-3" />
                                Manquant
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Résumé écarts */}
      {discrepancies.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Écarts à Ajuster ({discrepancies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {discrepancies.map(disc => (
                <div key={disc.article_id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center gap-3">
                    {getDiscrepancyIcon(disc.type)}
                    <div>
                      <p className="font-medium">{disc.article_name}</p>
                      <p className="text-xs text-gray-500">SKU: {disc.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Théorique: {disc.theoretical} → Réel: {disc.actual}
                    </p>
                    <p className={`text-sm font-bold ${disc.type === 'surplus' ? 'text-green-600' : 'text-red-600'}`}>
                      {disc.type === 'surplus' ? '+' : ''}{disc.difference} unités
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
