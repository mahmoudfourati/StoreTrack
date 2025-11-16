const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all notifications (most recent first)
router.get("/", (req, res) => {
  const sql = `SELECT * FROM notifications ORDER BY created_at DESC`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    res.json(rows);
  });
});

// PUT mark as read
router.put("/:id/read", (req, res) => {
  const sql = `UPDATE notifications SET is_read = 1 WHERE id = ?`;
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    res.json({ message: "Notification marquée comme lue" });
  });
});

module.exports = router;
