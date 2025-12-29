const express = require("express");
const router = express.Router();
const db = require("../config/db");
const notificationService = require("../services/notificationService");

// GET all notifications (most recent first)
router.get("/", async (req, res) => {
  const { is_read, user_id, limit = 100 } = req.query;
  
  try {
    let sql = `SELECT * FROM notifications WHERE 1=1`;
    const params = [];
    
    if (is_read !== undefined) {
      sql += ` AND is_read = ?`;
      params.push(is_read === 'true' || is_read === '1' ? 1 : 0);
    }
    
    if (user_id) {
      sql += ` AND (user_id = ? OR user_id IS NULL)`;
      params.push(user_id);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET count of unread notifications
router.get("/count/unread", async (req, res) => {
  const { user_id } = req.query;
  
  try {
    const count = await notificationService.countUnread(user_id || null);
    res.json({ count });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT mark as read
router.put("/:id/read", async (req, res) => {
  try {
    await notificationService.markAsRead(req.params.id);
    res.json({ message: "Notification marquée comme lue" });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT mark all as read
router.put("/read-all", async (req, res) => {
  const { user_id } = req.body;
  
  try {
    await notificationService.markAllAsRead(user_id || null);
    res.json({ message: "Toutes les notifications marquées comme lues" });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
