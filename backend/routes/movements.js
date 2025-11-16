// backend/routes/movements.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { createMovement } = require("../services/movementService");

// GET — liste
router.get("/", (req, res) => {
  const sql = `
    SELECT m.*, a.name AS article_name,
           w1.name AS from_warehouse,
           w2.name AS to_warehouse
    FROM movements m
    JOIN articles a ON m.article_id = a.id
    LEFT JOIN warehouses w1 ON m.warehouse_from = w1.id
    LEFT JOIN warehouses w2 ON m.warehouse_to = w2.id
    ORDER BY m.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erreur GET movements :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(results);
  });
});

// POST — create movement (delegates to service)
router.post("/", async (req, res) => {
  const { article_id, warehouse_from, warehouse_to, qty, type, user, note } = req.body;
  try {
    const result = await createMovement({ article_id, warehouse_from, warehouse_to, qty, type, user, note });
    res.status(201).json({ message: "Mouvement créé", id: result.movementId });
  } catch (err) {
    console.error("Erreur create movement:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

module.exports = router;
