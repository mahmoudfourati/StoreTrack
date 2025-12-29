const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET — Lister les stocks
router.get("/", async (req, res) => {
  const { article_id } = req.query;
  
  let sql = `
    SELECT 
      stocks.id,
      stocks.article_id,
      stocks.warehouse_id,
      articles.name AS article_name,
      warehouses.name AS warehouse_name,
      stocks.quantity,
      stocks.min_quantity,
      stocks.location_code
    FROM stocks
    JOIN articles ON stocks.article_id = articles.id
    JOIN warehouses ON stocks.warehouse_id = warehouses.id
  `;
  
  const params = [];
  if (article_id) {
    sql += ' WHERE stocks.article_id = ?';
    params.push(article_id);
  }

  try {
    const [results] = await db.query(sql, params);
    res.json(results);
  } catch (err) {
    console.error("Erreur GET stocks :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST — Ajouter un stock dans un entrepôt
router.post("/", async (req, res) => {
  const { article_id, warehouse_id, quantity, location_code } = req.body;

  const sql = `
    INSERT INTO stocks (article_id, warehouse_id, quantity, location_code)
    VALUES (?, ?, ?, ?)
  `;

  try {
    const [result] = await db.query(sql, [article_id, warehouse_id, quantity, location_code]);
    res.status(201).json({
      message: "Stock ajouté",
      id: result.insertId
    });
  } catch (err) {
    console.error("Erreur POST stock :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

// PUT — mettre à jour le stock minimum
router.put("/min", async (req, res) => {
  const { stock_id, min_quantity } = req.body;

  const sql = `
    UPDATE stocks
    SET min_quantity = ?
    WHERE id = ?
  `;

  try {
    const [result] = await db.query(sql, [min_quantity, stock_id]);
    res.json({ message: "Seuil minimum mis à jour" });
  } catch (err) {
    console.error("Erreur UPDATE min_quantity :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT — mettre à jour un stock complet
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { quantity, min_quantity, location_code } = req.body;

  const sql = `
    UPDATE stocks
    SET quantity = ?, min_quantity = ?, location_code = ?
    WHERE id = ?
  `;

  try {
    const [result] = await db.query(sql, [quantity, min_quantity, location_code, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Stock non trouvé" });
    }
    res.json({ message: "Stock mis à jour avec succès" });
  } catch (err) {
    console.error("Erreur UPDATE stock :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE — supprimer un stock
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM stocks WHERE id = ?";

  try {
    const [result] = await db.query(sql, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Stock non trouvé" });
    }
    res.json({ message: "Stock supprimé avec succès" });
  } catch (err) {
    console.error("Erreur DELETE stock :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET — stocks en alerte
router.get("/alerts", async (req, res) => {
  const sql = `
    SELECT s.*, a.name AS article_name, w.name AS warehouse_name
    FROM stocks s
    JOIN articles a ON s.article_id = a.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.quantity <= s.min_quantity
  `;

  try {
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    console.error("Erreur GET alerts :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
