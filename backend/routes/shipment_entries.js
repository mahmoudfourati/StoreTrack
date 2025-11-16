const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================
// GET all shipment entries
// ==========================
router.get("/", (req, res) => {
  const sql = `
    SELECT se.*, 
           a.name AS article_name,
           s.reference AS shipment_ref,
           c.name AS client_name,
           w.name AS warehouse_name
    FROM shipment_entries se
    JOIN shipments s ON se.shipment_id = s.id
    JOIN clients c ON s.client_id = c.id
    JOIN warehouses w ON s.warehouse_id = w.id
    JOIN articles a ON se.article_id = a.id
    ORDER BY se.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Erreur GET shipment_entries:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(rows);
  });
});

// ==========================
// GET entries for a single shipment
// ==========================
router.get("/:shipment_id", (req, res) => {
  const shipment_id = req.params.shipment_id;

  const sql = `
    SELECT se.*, 
           a.name AS article_name,
           s.reference AS shipment_ref,
           c.name AS client_name,
           w.name AS warehouse_name
    FROM shipment_entries se
    JOIN shipments s ON se.shipment_id = s.id
    JOIN clients c ON s.client_id = c.id
    JOIN warehouses w ON s.warehouse_id = w.id
    JOIN articles a ON se.article_id = a.id
    WHERE se.shipment_id = ?
    ORDER BY se.created_at DESC
  `;

  db.query(sql, [shipment_id], (err, rows) => {
    if (err) {
      console.error("Erreur GET shipment_entries by id:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(rows);
  });
});

module.exports = router;
