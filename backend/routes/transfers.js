const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { checkStockAvailability } = require("../utils/stockValidator");
const notificationService = require("../services/notificationService");

// ==========================
// GET all transfers
// ==========================
router.get("/", async (req, res) => {
  const sql = `
    SELECT t.*, 
           a.name AS article_name,
           w1.name AS warehouse_from_name,
           w2.name AS warehouse_to_name
    FROM transfers t
    JOIN articles a ON t.article_id = a.id
    JOIN warehouses w1 ON t.warehouse_from = w1.id
    JOIN warehouses w2 ON t.warehouse_to = w2.id
    ORDER BY t.created_at DESC
  `;

  try {
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET transfers:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// GET transfer by ID
// ==========================
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT t.*, 
           a.name AS article_name,
           w1.name AS warehouse_from_name,
           w2.name AS warehouse_to_name
    FROM transfers t
    JOIN articles a ON t.article_id = a.id
    JOIN warehouses w1 ON t.warehouse_from = w1.id
    JOIN warehouses w2 ON t.warehouse_to = w2.id
    WHERE t.id = ?
  `;

  try {
    const [rows] = await db.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Transfert introuvable" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Erreur GET transfer:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// CREATE transfer (avec validation stock améliorée)
// ==========================
router.post("/", async (req, res) => {
  const { article_id, warehouse_from, warehouse_to, qty, user, note } = req.body;

  if (!article_id || !warehouse_from || !warehouse_to || !qty) {
    return res.status(400).json({ error: "Informations manquantes" });
  }

  if (warehouse_from === warehouse_to) {
    return res.status(400).json({ error: "Entrepôts identiques !" });
  }

  try {
    // VALIDATION: Vérifier stock disponible avec fonction utilitaire
    await checkStockAvailability(article_id, warehouse_from, qty);

    // Insérer le transfert
    const sqlInsert = `
      INSERT INTO transfers (article_id, warehouse_from, warehouse_to, qty, user, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(
      sqlInsert,
      [article_id, warehouse_from, warehouse_to, qty, user || null, note || null]
    );

    const transferId = result.insertId;

    // 1) Décrémenter warehouse_from
    const sqlMinus = `
      UPDATE stocks SET quantity = quantity - ?
      WHERE article_id = ? AND warehouse_id = ?
    `;

    await db.query(sqlMinus, [qty, article_id, warehouse_from]);

    // 2) Incrémenter warehouse_to (et créer ligne si besoin)
    const sqlAddRow = `
      INSERT INTO stocks (article_id, warehouse_id, quantity)
      VALUES (?, ?, 0)
      ON DUPLICATE KEY UPDATE quantity = quantity
    `;

    await db.query(sqlAddRow, [article_id, warehouse_to]);
    
    const sqlPlus = `
      UPDATE stocks SET quantity = quantity + ?
      WHERE article_id = ? AND warehouse_id = ?
    `;

    await db.query(sqlPlus, [qty, article_id, warehouse_to]);

    // 3) Ajouter mouvement "transfer"
    const sqlMove = `
      INSERT INTO movements (article_id, warehouse_from, warehouse_to, qty, type, user, note)
      VALUES (?, ?, ?, ?, 'transfer', ?, ?)
    `;

    await db.query(sqlMove, [
      article_id,
      warehouse_from,
      warehouse_to,
      qty,
      user || null,
      note || null
    ]);

    // Notification transfert
    const [articleInfo] = await db.query('SELECT name FROM articles WHERE id = ?', [article_id]);
    const [whFrom] = await db.query('SELECT name FROM warehouses WHERE id = ?', [warehouse_from]);
    const [whTo] = await db.query('SELECT name FROM warehouses WHERE id = ?', [warehouse_to]);
    
    if (articleInfo.length > 0 && whFrom.length > 0 && whTo.length > 0) {
      await notificationService.notifyTransferCompleted(
        transferId,
        articleInfo[0].name,
        whFrom[0].name,
        whTo[0].name,
        qty
      );
    }

    res.status(201).json({
      message: "Transfert effectué avec validation stock",
      id: transferId
    });
  } catch (err) {
    console.error("Erreur create transfer:", err);
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
