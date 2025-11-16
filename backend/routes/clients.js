const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all clients
router.get("/", (req, res) => {
  const sql = "SELECT * FROM clients ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erreur GET clients:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(results);
  });
});

// GET single client
router.get("/:id", (req, res) => {
  const sql = "SELECT * FROM clients WHERE id = ?";
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    if (results.length === 0) return res.status(404).json({ error: "Client non trouvé" });
    res.json(results[0]);
  });
});

// POST create client
router.post("/", (req, res) => {
  const { name, contact_name, email, phone, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: "Le champ name est requis" });

  const sql = `INSERT INTO clients (name, contact_name, email, phone, address, notes)
               VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(sql, [name, contact_name, email, phone, address, notes], (err, result) => {
    if (err) {
      console.error("Erreur POST client:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.status(201).json({ message: "Client créé", id: result.insertId });
  });
});

// PUT update client
router.put("/:id", (req, res) => {
  const { name, contact_name, email, phone, address, notes } = req.body;
  const sql = `UPDATE clients SET name=?, contact_name=?, email=?, phone=?, address=?, notes=? WHERE id = ?`;
  db.query(sql, [name, contact_name, email, phone, address, notes, req.params.id], (err, result) => {
    if (err) {
      console.error("Erreur PUT client:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json({ message: "Client mis à jour" });
  });
});

// DELETE client
router.delete("/:id", (req, res) => {
  const sql = "DELETE FROM clients WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error("Erreur DELETE client:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json({ message: "Client supprimé" });
  });
});

module.exports = router;
