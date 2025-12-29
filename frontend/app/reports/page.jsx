"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, TrendingUp, TrendingDown, Package, DollarSign } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import api from "@/lib/axios";
import { toast } from "sonner";

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Données rapports
  const [stockValuation, setStockValuation] = useState(null);
  const [movementsByPeriod, setMovementsByPeriod] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [warehouseDistribution, setWarehouseDistribution] = useState([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    // Dates par défaut (30 derniers jours)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      // Valorisation stock
      const valuationRes = await api.get("/dashboard/stock-valuation");
      setStockValuation(valuationRes.data);

      // Mouvements par période
      const movementsRes = await api.get(`/movements?start=${dateFrom}&end=${dateTo}`);
      processMovementsData(movementsRes.data);

      // Distribution entrepôts
      const warehouseRes = await api.get("/warehouses");
      const stockRes = await api.get("/stocks");
      processWarehouseData(warehouseRes.data, stockRes.data);

      // Top articles
      processTopArticles(stockRes.data);

    } catch (error) {
      console.error("Erreur chargement rapports:", error);
      toast.error("Erreur lors du chargement des rapports");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchReports();
    }
  }, [dateFrom, dateTo, fetchReports]);

  const processMovementsData = (movements) => {
    // Grouper par date
    const grouped = {};
    movements.forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString('fr-FR');
      if (!grouped[date]) {
        grouped[date] = { date, entries: 0, exits: 0, transfers: 0 };
      }
      if (m.type === 'in') grouped[date].entries++;
      else if (m.type === 'out') grouped[date].exits++;
      else if (m.type === 'transfer') grouped[date].transfers++;
    });
    setMovementsByPeriod(Object.values(grouped).slice(-10)); // 10 derniers jours
  };

  const processWarehouseData = (warehouses, stocks) => {
    const distribution = warehouses.map(wh => {
      const totalQty = stocks
        .filter(s => s.warehouse_id === wh.id)
        .reduce((sum, s) => sum + s.quantity, 0);
      return {
        name: wh.name,
        value: totalQty
      };
    });
    setWarehouseDistribution(distribution);
  };

  const processTopArticles = (stocks) => {
    // Top 5 articles par quantité
    const sorted = [...stocks]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(s => ({
        name: s.article_name || `Article ${s.article_id}`,
        quantity: s.quantity
      }));
    setTopArticles(sorted);
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    // Créer CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    // Télécharger
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`${filename} exporté avec succès`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapports & Analyses</h1>
          <p className="text-gray-500 mt-1">Vue d&apos;ensemble des performances</p>
        </div>
        <Button onClick={() => exportToCSV(movementsByPeriod, 'mouvements')} className="gap-2">
          <Download className="w-4 h-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Filtre dates */}
      <Card>
        <CardHeader>
          <CardTitle>Période d&apos;analyse</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium">Date début</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo}
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Date fin</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchReports} disabled={loading}>
              {loading ? "Chargement..." : "Générer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valorisation Stock Total</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockValuation ? `${stockValuation.total_value?.toLocaleString('fr-FR')} FCFA` : "Chargement..."}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stockValuation ? `${stockValuation.total_articles} articles` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockValuation ? stockValuation.total_quantity?.toLocaleString('fr-FR') : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Unités en stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mouvements Période</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {movementsByPeriod.reduce((sum, m) => sum + m.entries + m.exits + m.transfers, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Opérations effectuées</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mouvements par jour */}
        <Card>
          <CardHeader>
            <CardTitle>Mouvements par Jour</CardTitle>
            <CardDescription>Entrées, sorties et transferts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={movementsByPeriod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="entries" fill="#10b981" name="Entrées" />
                <Bar dataKey="exits" fill="#ef4444" name="Sorties" />
                <Bar dataKey="transfers" fill="#3b82f6" name="Transferts" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution entrepôts */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution par Entrepôt</CardTitle>
            <CardDescription>Répartition des stocks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={warehouseDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {warehouseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top articles */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top 5 Articles par Quantité</CardTitle>
            <CardDescription>Articles les plus stockés</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topArticles} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#8b5cf6" name="Quantité" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
