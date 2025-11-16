const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all suppliers
router.get("/", (req, res) => {
  const sql = "SELECT * FROM suppliers ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erreur GET suppliers:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(results);
  });
});

// GET single supplier by id
router.get("/:id", (req, res) => {
  const sql = "SELECT * FROM suppliers WHERE id = ?";
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    if (results.length === 0) return res.status(404).json({ error: "Fournisseur non trouvé" });
    res.json(results[0]);
  });
});

// POST create supplier
router.post("/", (req, res) => {
  const { name, contact_name, email, phone, address, payment_terms, notes } = req.body;
  if (!name) return res.status(400).json({ error: "Le champ name est requis" });

  const sql = `INSERT INTO suppliers (name, contact_name, email, phone, address, payment_terms, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [name, contact_name, email, phone, address, payment_terms, notes], (err, result) => {
    if (err) {
      console.error("Erreur POST supplier:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.status(201).json({ message: "Fournisseur créé", id: result.insertId });
  });
});

// PUT update supplier
router.put("/:id", (req, res) => {
  const { name, contact_name, email, phone, address, payment_terms, notes } = req.body;
  const sql = `UPDATE suppliers SET name=?, contact_name=?, email=?, phone=?, address=?, payment_terms=?, notes=? WHERE id = ?`;
  db.query(sql, [name, contact_name, email, phone, address, payment_terms, notes, req.params.id], (err, result) => {
    if (err) {
      console.error("Erreur PUT supplier:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json({ message: "Fournisseur mis à jour" });
  });
});

// DELETE supplier
router.delete("/:id", (req, res) => {
  const sql = "DELETE FROM suppliers WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error("Erreur DELETE supplier:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json({ message: "Fournisseur supprimé" });
  });
});

module.exports = router;
