// backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); 

// 1. GET /api/dashboard/stats 
// Récupère les 4 chiffres clés en haut du dashboard
router.get('/stats', async (req, res) => {
    try {
        // A. Stock total (Somme de la colonne 'quantity' de la table 'stocks')
        const [stockResult] = await db.query('SELECT SUM(quantity) as totalStock FROM stocks');
        
        // B. Articles en rupture (Où quantity <= min_quantity dans la table 'stocks')
        const [lowStockResult] = await db.query('SELECT COUNT(*) as lowStockCount FROM stocks WHERE quantity <= min_quantity');

        // C. Mouvements récents (7 derniers jours dans la table 'movements')
        const [movementsResult] = await db.query(`
            SELECT COUNT(*) as recentMovements 
            FROM movements 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        // D. Réservations en attente (Table internal_requests, status = 'pending')
        const [pendingResult] = await db.query(`
            SELECT COUNT(*) as pendingCount 
            FROM internal_requests 
            WHERE status = 'pending'
        `);

        res.json({
            totalStock: stockResult[0].totalStock || 0,
            lowStock: lowStockResult[0].lowStockCount || 0,
            movements: movementsResult[0].recentMovements || 0,
            pendingRequests: pendingResult[0].pendingCount || 0,
            stockTrend: null,
            lowStockTrend: null,
            movementsTrend: null
        });

    } catch (error) {
        console.error('Erreur stats dashboard:', error);
        res.status(500).json({ message: "Erreur serveur stats" });
    }
});

// 2. GET /api/dashboard/alerts
// Récupère la liste pour le panneau latéral droit "Alertes"
router.get('/alerts', async (req, res) => {
    try {
        // On récupère les stocks faibles avec le nom de l'article
        // Jointure entre 'stocks' et 'articles' pour avoir le nom
        const [alertsRaw] = await db.query(`
            SELECT 
                s.id,
                a.name as article_name, 
                w.name as warehouse_name,
                s.quantity, 
                s.min_quantity 
            FROM stocks s
            JOIN articles a ON s.article_id = a.id
            JOIN warehouses w ON s.warehouse_id = w.id
            WHERE s.quantity <= s.min_quantity
            ORDER BY s.quantity ASC
            LIMIT 5
        `);
        
        // Formatter les alertes pour le frontend
        const alerts = alertsRaw.map(alert => ({
            id: alert.id,
            type: alert.quantity === 0 ? 'urgent' : 'medium',
            title: `${alert.article_name} - Stock faible`,
            desc: `${alert.quantity}/${alert.min_quantity} unités en ${alert.warehouse_name}`,
            time: 'Maintenant'
        }));
        
        res.json(alerts);
    } catch (error) {
        console.error('Erreur alertes:', error);
        res.status(500).json({ message: "Erreur serveur alertes" });
    }
});

// 3. GET /api/dashboard/chart
// Récupère les données pour le graphique (groupé par jour)
router.get('/chart', async (req, res) => {
    try {
        // On compte les mouvements groupés par date
        const [chartRaw] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%a') as day_name,
                DATE_FORMAT(created_at, '%Y-%m-%d') as date,
                SUM(CASE WHEN type IN ('in', 'reception') THEN qty ELSE 0 END) as in_count,
                SUM(CASE WHEN type IN ('out', 'shipment') THEN qty ELSE 0 END) as out_count
            FROM movements 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);
        
        // Formatter pour le graphique
        const chartData = chartRaw.map(row => ({
            name: row.day_name,
            stock: row.in_count + row.out_count,
            in: row.in_count
        }));
        
        res.json(chartData);
    } catch (error) {
        console.error('Erreur chart:', error);
        res.status(500).json({ message: "Erreur serveur graphique" });
    }
});

// GET /api/dashboard/stock-valuation
// Valorisation totale du stock
router.get('/stock-valuation', async (req, res) => {
    try {
        const [result] = await db.query(`
            SELECT 
                SUM(s.quantity * a.price) as totalValue,
                SUM(s.quantity) as totalQuantity,
                COUNT(DISTINCT a.id) as totalArticles
            FROM stocks s
            JOIN articles a ON s.article_id = a.id
        `);
        
        res.json({
            totalValue: result[0].totalValue || 0,
            totalQuantity: result[0].totalQuantity || 0,
            totalArticles: result[0].totalArticles || 0
        });
    } catch (error) {
        console.error('Erreur stock valuation:', error);
        res.status(500).json({ message: "Erreur serveur valorisation" });
    }
});

module.exports = router;