const express = require("express");
const router = express.Router();
const db = require("../db");

// GET — Lister les stocks
router.get("/", (req, res) => {
  const sql = `
    SELECT 
      stocks.id,
      articles.name AS article_name,
      warehouses.name AS warehouse_name,
      stocks.quantity,
      stocks.location_code
    FROM stocks
    JOIN articles ON stocks.article_id = articles.id
    JOIN warehouses ON stocks.warehouse_id = warehouses.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erreur GET stocks :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(results);
  });
});

// POST — Ajouter un stock dans un entrepôt
router.post("/", (req, res) => {
  const { article_id, warehouse_id, quantity, location_code } = req.body;

  const sql = `
    INSERT INTO stocks (article_id, warehouse_id, quantity, location_code)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [article_id, warehouse_id, quantity, location_code], (err, result) => {
    if (err) {
      console.error("Erreur POST stock :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    res.status(201).json({
      message: "Stock ajouté",
      id: result.insertId
    });
  });
});

module.exports = router;

// PUT — mettre à jour le stock minimum
router.put("/min", (req, res) => {
  const { stock_id, min_quantity } = req.body;

  const sql = `
    UPDATE stocks
    SET min_quantity = ?
    WHERE id = ?
  `;

  db.query(sql, [min_quantity, stock_id], (err, result) => {
    if (err) {
      console.error("Erreur UPDATE min_quantity :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    res.json({ message: "Seuil minimum mis à jour" });
  });
});

// GET — stocks en alerte
router.get("/alerts", (req, res) => {
  const sql = `
    SELECT s.*, a.name AS article_name, w.name AS warehouse_name
    FROM stocks s
    JOIN articles a ON s.article_id = a.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.quantity <= s.min_quantity
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erreur GET alerts :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(results);
  });
});
