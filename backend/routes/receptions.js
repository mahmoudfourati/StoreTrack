const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  const sql = `
    SELECT r.*, a.name AS article_name, w.name AS warehouse_name
    FROM reception_entries r
    JOIN articles a ON r.article_id = a.id
    JOIN warehouses w ON r.warehouse_id = w.id
    ORDER BY r.created_at DESC
  `;
  try {
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
