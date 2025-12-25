// backend/routes/articles.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// GET list
router.get("/", (req, res) => {
  db.query("SELECT * FROM articles ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error("GET /api/articles SQL ERROR:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json(rows);
  });
});

// POST create
router.post("/", (req, res) => {
  console.log("POST /api/articles body:", req.body);
  const { name, sku, category, price_tnd, description } = req.body;
  if (!name || !sku) return res.status(400).json({ error: "name and sku required" });

  const sql = `INSERT INTO articles (name, sku, category, price_tnd, description) VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [name, sku, category || null, price_tnd || 0, description || null], (err, result) => {
    if (err) {
      console.error("POST /api/articles SQL ERROR:", err);
      if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "SKU already exists" });
      return res.status(500).json({ error: "DB insert error", details: err.message });
    }
    res.status(201).json({ message: "Article ajouté", id: result.insertId });
  });
});

// PUT update
router.put("/:id", (req, res) => {
  const { id } = req.params;
  console.log(`PUT /api/articles/${id} body:`, req.body);
  const { name, sku, category, price_tnd, description } = req.body;
  if (!name || !sku) return res.status(400).json({ error: "name and sku required" });

  const sql = `UPDATE articles SET name=?, sku=?, category=?, price_tnd=?, description=? WHERE id=?`;
  db.query(sql, [name, sku, category || null, price_tnd || 0, description || null, id], (err, result) => {
    if (err) {
      console.error(`PUT /api/articles/${id} SQL ERROR:`, err);
      if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "SKU already exists" });
      return res.status(500).json({ error: "DB update error", details: err.message });
    }
    if (result.affectedRows === 0) return res.status(404).json({ error: "Article introuvable" });
    res.json({ message: "Article modifié" });
  });
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const [result] = await db.execute("DELETE FROM articles WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Article introuvable" });
    }

    return res.json({ success: true });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error: "Impossible de supprimer",
        details: "Cet article est utilisé dans d'autres modules (ex: demandes internes).",
      });
    }

    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});


module.exports = router;
