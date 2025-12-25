// backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../db'); 

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
            recentMovements: movementsResult[0].recentMovements || 0,
            pendingRequests: pendingResult[0].pendingCount || 0
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
        const [alerts] = await db.query(`
            SELECT 
                a.name as article_name, 
                s.quantity, 
                s.min_quantity 
            FROM stocks s
            JOIN articles a ON s.article_id = a.id
            WHERE s.quantity <= s.min_quantity
            LIMIT 5
        `);
        
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
        // On compte les mouvements groupés par date (FORMAT: YYYY-MM-DD)
        const [chartData] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') as date, 
                COUNT(*) as count 
            FROM movements 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);
        
        res.json(chartData);
    } catch (error) {
        console.error('Erreur chart:', error);
        res.status(500).json({ message: "Erreur serveur graphique" });
    }
});

module.exports = router;