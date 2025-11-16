const express = require("express");
const router = express.Router();
const db = require("../db");

// --- GET : liste des articles ---
router.get("/", (req, res) => {
  const sql = "SELECT * FROM articles";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erreur GET articles :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(results);
  });
});

// --- POST : ajouter un article ---
router.post("/", (req, res) => {
  const { sku, name, description, price_tnd, category } = req.body;

  const sql = `
    INSERT INTO articles (sku, name, description, price_tnd, category)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [sku, name, description, price_tnd, category], (err, result) => {
    if (err) {
      console.error("Erreur POST article :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    res.status(201).json({
      message: "Article ajouté",
      id: result.insertId
    });
  });
});

module.exports = router;
