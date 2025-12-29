const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET all suppliers
router.get("/", async (req, res) => {
  const sql = "SELECT * FROM suppliers ORDER BY created_at DESC";
  try {
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    console.error("Erreur GET suppliers:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET single supplier by id
router.get("/:id", async (req, res) => {
  const sql = "SELECT * FROM suppliers WHERE id = ?";
  try {
    const [results] = await db.query(sql, [req.params.id]);
    if (results.length === 0) return res.status(404).json({ error: "Fournisseur non trouvé" });
    res.json(results[0]);
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST create supplier
router.post("/", async (req, res) => {
  const { name, contact_name, email, phone, address, payment_terms, notes } = req.body;
  if (!name) return res.status(400).json({ error: "Le champ name est requis" });

  const sql = `INSERT INTO suppliers (name, contact_name, email, phone, address, payment_terms, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  try {
    const [result] = await db.query(sql, [name, contact_name, email, phone, address, payment_terms, notes]);
    res.status(201).json({ message: "Fournisseur créé", id: result.insertId });
  } catch (err) {
    console.error("Erreur POST supplier:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT update supplier
router.put("/:id", async (req, res) => {
  const { name, contact_name, email, phone, address, payment_terms, notes } = req.body;
  const sql = `UPDATE suppliers SET name=?, contact_name=?, email=?, phone=?, address=?, payment_terms=?, notes=? WHERE id = ?`;
  try {
    const [result] = await db.query(sql, [name, contact_name, email, phone, address, payment_terms, notes, req.params.id]);
    res.json({ message: "Fournisseur mis à jour" });
  } catch (err) {
    console.error("Erreur PUT supplier:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE supplier
router.delete("/:id", async (req, res) => {
  const sql = "DELETE FROM suppliers WHERE id = ?";
  try {
    const [result] = await db.query(sql, [req.params.id]);
    res.json({ message: "Fournisseur supprimé" });
  } catch (err) {
    console.error("Erreur DELETE supplier:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
