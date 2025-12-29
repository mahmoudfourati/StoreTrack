const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET — Liste des entrepôts (async/await)
router.get("/", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM warehouses");
    res.json(results);
  } catch (err) {
    console.error("Erreur GET warehouses :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST — Ajouter un entrepôt (async/await + auto-init stocks)
router.post("/", async (req, res) => {
  try {
    const { name, location } = req.body;
    const sql = "INSERT INTO warehouses (name, location) VALUES (?, ?)";
    const [result] = await db.query(sql, [name, location]);
    
    const warehouseId = result.insertId;
    
    // TODO 6: Créer automatiquement des lignes stocks pour TOUS les articles
    const [articles] = await db.query('SELECT id, min_stock FROM articles');
    
    for (const article of articles) {
      await db.query(
        `INSERT INTO stocks (article_id, warehouse_id, quantity, min_quantity) 
         VALUES (?, ?, 0, ?)`,
        [article.id, warehouseId, article.min_stock || 5]
      );
    }
    
    res.status(201).json({
      message: "Entrepôt ajouté avec initialisation des stocks",
      id: warehouseId,
      stocks_created: articles.length
    });
  } catch (err) {
    console.error("Erreur POST warehouse :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT — Modifier un entrepôt (async/await)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;
    const sql = "UPDATE warehouses SET name = ?, location = ? WHERE id = ?";
    const [result] = await db.query(sql, [name, location, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Entrepôt non trouvé" });
    }

    res.json({ message: "Entrepôt modifié avec succès" });
  } catch (err) {
    console.error("Erreur PUT warehouse :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE — Supprimer un entrepôt (async/await)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sql = "DELETE FROM warehouses WHERE id = ?";
    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Entrepôt non trouvé" });
    }

    res.json({ message: "Entrepôt supprimé avec succès" });
  } catch (err) {
    console.error("Erreur DELETE warehouse :", err);
    // Vérifier si c'est une contrainte de clé étrangère
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: "Impossible de supprimer cet entrepôt car il contient des stocks ou est lié à des mouvements." 
      });
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
