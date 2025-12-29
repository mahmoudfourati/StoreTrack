const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET all clients
router.get("/", async (req, res) => {
  const sql = "SELECT * FROM clients ORDER BY created_at DESC";
  try {
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    console.error("Erreur GET clients:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET single client
router.get("/:id", async (req, res) => {
  const sql = "SELECT * FROM clients WHERE id = ?";
  try {
    const [results] = await db.query(sql, [req.params.id]);
    if (results.length === 0) return res.status(404).json({ error: "Client non trouvé" });
    res.json(results[0]);
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST create client
router.post("/", async (req, res) => {
  const { name, contact_name, email, phone, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: "Le champ name est requis" });

  const sql = `INSERT INTO clients (name, contact_name, email, phone, address, notes)
               VALUES (?, ?, ?, ?, ?, ?)`;
  try {
    const [result] = await db.query(sql, [name, contact_name, email, phone, address, notes]);
    res.status(201).json({ message: "Client créé", id: result.insertId });
  } catch (err) {
    console.error("Erreur POST client:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT update client
router.put("/:id", async (req, res) => {
  const { name, contact_name, email, phone, address, notes } = req.body;
  const sql = `UPDATE clients SET name=?, contact_name=?, email=?, phone=?, address=?, notes=? WHERE id = ?`;
  try {
    const [result] = await db.query(sql, [name, contact_name, email, phone, address, notes, req.params.id]);
    res.json({ message: "Client mis à jour" });
  } catch (err) {
    console.error("Erreur PUT client:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE client
router.delete("/:id", async (req, res) => {
  const sql = "DELETE FROM clients WHERE id = ?";
  try {
    const [result] = await db.query(sql, [req.params.id]);
    res.json({ message: "Client supprimé" });
  } catch (err) {
    console.error("Erreur DELETE client:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
