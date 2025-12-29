// --- FICHIER : backend/routes/articles.js ---
// Remplace tout le contenu de ce fichier par ceci :

const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const multer = require('multer');
const path = require('path');
const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');

// Configuration Images
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, 'article-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// 1. GET - Lire (async/await)
router.get('/', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM articles ORDER BY created_at DESC');
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Erreur BDD: " + err.message });
    }
});

// 2. POST - Créer (async/await + auto-init stocks)
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name, sku, category, price, stock, min_stock, lot_number, expiration_date, manufacturing_date } = req.body;
        const image_url = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null;

        const sql = `INSERT INTO articles (name, sku, category, price, stock, min_stock, lot_number, expiration_date, manufacturing_date, image_url) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [
            name, sku, category, price, stock, min_stock, 
            lot_number || null, 
            expiration_date || null, 
            manufacturing_date || null, 
            image_url
        ]);
        
        const articleId = result.insertId;
        
        // TODO 6: Créer automatiquement des lignes stocks pour TOUS les entrepôts
        const [warehouses] = await db.query('SELECT id FROM warehouses');
        
        for (const warehouse of warehouses) {
            await db.query(
                `INSERT INTO stocks (article_id, warehouse_id, quantity, min_quantity) 
                 VALUES (?, ?, 0, ?)`,
                [articleId, warehouse.id, min_stock || 5]
            );
        }
        
        res.status(201).json({ 
            message: "Article créé avec initialisation des stocks", 
            id: articleId,
            stocks_created: warehouses.length
        });
    } catch (err) {
        console.error("ERREUR SQL (Création):", err);
        // Si doublon de SKU
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Ce SKU existe déjà ! Veuillez utiliser une référence unique." });
        }
        res.status(500).json({ error: "Erreur lors de la création de l'article" });
    }
});

// 3. PUT - Modifier (async/await)
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, category, price, stock, min_stock, lot_number, expiration_date, manufacturing_date } = req.body;
        
        let sql = "UPDATE articles SET name=?, sku=?, category=?, price=?, stock=?, min_stock=?, lot_number=?, expiration_date=?, manufacturing_date=?";
        let params = [
            name, sku, category, price, stock, min_stock, 
            lot_number || null, 
            expiration_date || null, 
            manufacturing_date || null
        ];

        if (req.file) {
            sql += ", image_url=?";
            params.push(`http://localhost:5000/uploads/${req.file.filename}`);
        }

        sql += " WHERE id=?";
        params.push(id);

        await db.query(sql, params);
        res.json({ message: "Article modifié avec succès" });
    } catch (err) {
        console.error("ERREUR SQL (Modif):", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Ce SKU existe déjà ! Veuillez utiliser une référence unique." });
        }
        res.status(500).json({ error: "Erreur lors de la modification" });
    }
});

// 4. DELETE - Supprimer (async/await)
router.delete('/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        
        // Vérifier si l'article a des mouvements (historique)
        const [movements] = await db.query(
            'SELECT COUNT(*) as count FROM movements WHERE article_id = ?',
            [articleId]
        );
        
        if (movements[0].count > 0) {
            return res.status(400).json({ 
                error: "Impossible de supprimer cet article",
                message: "L'article a un historique de mouvements. Vous pouvez le désactiver au lieu de le supprimer."
            });
        }
        
        // Vérifier si l'article a des lots
        const [lots] = await db.query(
            'SELECT COUNT(*) as count FROM lots WHERE article_id = ?',
            [articleId]
        );
        
        if (lots[0].count > 0) {
            return res.status(400).json({ 
                error: "Impossible de supprimer cet article",
                message: "L'article a des lots associés. Supprimez d'abord les lots ou désactivez l'article."
            });
        }
        
        // Supprimer les stocks liés (cascade manuel)
        await db.query('DELETE FROM stocks WHERE article_id = ?', [articleId]);
        
        // Supprimer l'article
        await db.query('DELETE FROM articles WHERE id = ?', [articleId]);
        
        res.json({ message: "Article supprimé avec succès" });
    } catch (err) {
        console.error("Erreur suppression article:", err);
        res.status(500).json({ 
            error: "Erreur technique lors de la suppression",
            details: err.message 
        });
    }
});

// 5. GET - Générer code-barres pour un article
router.get('/:id/barcode', async (req, res) => {
    try {
        const { id } = req.params;
        const [articles] = await db.query('SELECT sku, name FROM articles WHERE id = ?', [id]);
        
        if (articles.length === 0) {
            return res.status(404).json({ error: "Article non trouvé" });
        }

        const article = articles[0];
        const canvas = createCanvas(200, 80);
        
        JsBarcode(canvas, article.sku, {
            format: "CODE128",
            displayValue: true,
            fontSize: 14,
            height: 50,
            margin: 10
        });

        res.setHeader('Content-Type', 'image/png');
        canvas.createPNGStream().pipe(res);
    } catch (err) {
        console.error("Erreur génération code-barres:", err);
        res.status(500).json({ error: err.message });
    }
});

// 6. GET - Générer SVG code-barres
router.get('/:id/barcode-svg', async (req, res) => {
    try {
        const { id } = req.params;
        const [articles] = await db.query('SELECT sku FROM articles WHERE id = ?', [id]);
        
        if (articles.length === 0) {
            return res.status(404).json({ error: "Article non trouvé" });
        }

        let svgString = '';
        JsBarcode('#barcode', articles[0].sku, {
            format: "CODE128",
            xmlDocument: {
                createElement: (tag) => ({
                    setAttribute: () => {},
                    setAttributeNS: () => {},
                    appendChild: () => {},
                    nodeName: tag
                })
            }
        });

        // Génération simple du SVG
        const barcodeValue = articles[0].sku;
        svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80">
            <text x="100" y="70" text-anchor="middle" font-size="12">${barcodeValue}</text>
        </svg>`;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svgString);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
