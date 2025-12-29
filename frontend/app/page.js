"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertCircle,
  Truck,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, chartRes, alertsRes] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/dashboard/chart"),
        api.get("/dashboard/alerts")
      ]);
      
      setStats(statsRes.data);
      setChartData(chartRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error("Erreur chargement dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      
      {/* --- EN-TÊTE --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Vue d'ensemble de votre inventaire multi-sites</p>
        </div>
        <div className="text-sm text-gray-400">
          Dernière mise à jour: Aujourd'hui à 14:47
        </div>
      </div>

      {/* --- CARTES STATISTIQUES (GRID 4 COLONNES) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Stock total disponible"
          value={stats?.totalStock || "0"}
          subtext="Articles en stock"
          trend={stats?.stockTrend}
          trendUp={stats?.stockTrend?.startsWith("+") || false}
          icon={Package}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
        />

        <StatCard 
          title="Articles en rupture"
          value={stats?.lowStock || "0"}
          subtext="Sous le seuil minimum"
          trend={stats?.lowStockTrend}
          trendUp={stats?.lowStockTrend?.startsWith("-") || false}
          icon={AlertTriangle}
          iconColor="text-red-600"
          bgColor="bg-red-50"
        />

        <StatCard 
          title="Mouvements récents"
          value={stats?.movements || "0"}
          subtext="Cette semaine"
          trend={stats?.movementsTrend}
          trendUp={stats?.movementsTrend?.startsWith("+") || false}
          icon={TrendingUp}
          iconColor="text-indigo-600"
          bgColor="bg-indigo-50"
        />

        <StatCard 
          title="Réservations en attente"
          value={stats?.pendingRequests || "0"}
          subtext="À valider aujourd'hui"
          icon={Clock}
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
        />
      </div>

      {/* --- SECTION BASSE (GRAPHIQUE + ALERTES) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRAPHIQUE (Prend 2 colonnes sur grand écran) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Mouvements de stock (7 derniers jours)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <Tooltip />
                <Area type="monotone" dataKey="stock" stroke="#3b82f6" fillOpacity={1} fill="url(#colorStock)" strokeWidth={3} />
                <Area type="monotone" dataKey="in" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LISTE DES ALERTES (Prend 1 colonne) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertes</h3>
          <div className="space-y-4">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune alerte</p>
              </div>
            )}
          </div>
          {alerts && alerts.length > 0 && (
            <button className="w-full mt-6 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors">
              Voir toutes les alertes
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS (Inclus directement pour éviter les dépendances externes) ---

function StatCard({ title, value, subtext, trend, trendUp, icon: Icon, iconColor, bgColor }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h4 className="text-3xl font-bold text-gray-900 mt-1">{value}</h4>
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{subtext}</p>
        {trend && (
          <span className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
            trendUp ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
          }`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {trend} vs mois dernier
          </span>
        )}
      </div>
    </div>
  );
}

function AlertItem({ alert }) {
  const getStyle = (type) => {
    switch (type) {
      case 'urgent': return { bg: 'bg-red-50', text: 'text-red-700', label: 'Urgent', icon: AlertCircle };
      case 'medium': return { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Moyen', icon: AlertTriangle };
      case 'info': return { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Info', icon: Truck };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Info', icon: CheckCircle2 };
    }
  };

  const style = getStyle(alert.type);
  const Icon = style.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
      <div className={`mt-1 p-1.5 rounded-full ${style.bg} ${style.text}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            {style.label}
          </span>
          <span className="text-xs text-gray-400">{alert.time}</span>
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
        <p className="text-xs text-gray-500 truncate">{alert.desc}</p>
      </div>
    </div>
  );
}