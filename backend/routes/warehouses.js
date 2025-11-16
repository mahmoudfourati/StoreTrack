const express = require("express");
const router = express.Router();
const db = require("../db");

// GET — Liste des entrepôts
router.get("/", (req, res) => {
  const sql = "SELECT * FROM warehouses";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erreur GET warehouses :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(results);
  });
});

// POST — Ajouter un entrepôt
router.post("/", (req, res) => {
  const { name, location } = req.body;

  const sql = `
    INSERT INTO warehouses (name, location)
    VALUES (?, ?)
  `;

  db.query(sql, [name, location], (err, result) => {
    if (err) {
      console.error("Erreur POST warehouse :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    res.status(201).json({
      message: "Entrepôt ajouté",
      id: result.insertId
    });
  });
});

module.exports = router;
