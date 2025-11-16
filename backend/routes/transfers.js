const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================
// GET all transfers
// ==========================
router.get("/", (req, res) => {
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

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Erreur GET transfers:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(rows);
  });
});

// ==========================
// GET transfer by ID
// ==========================
router.get("/:id", (req, res) => {
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

  db.query(sql, [id], (err, rows) => {
    if (err) {
      console.error("Erreur GET transfer:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: "Transfert introuvable" });
    }
    res.json(rows[0]);
  });
});

// ==========================
// CREATE transfer
// ==========================
router.post("/", (req, res) => {
  const { article_id, warehouse_from, warehouse_to, qty, user, note } = req.body;

  if (!article_id || !warehouse_from || !warehouse_to || !qty) {
    return res.status(400).json({ error: "Informations manquantes" });
  }

  if (warehouse_from === warehouse_to) {
    return res.status(400).json({ error: "Entrepôts identiques !" });
  }

  // Vérifier stock disponible
  const sqlCheck = `
    SELECT quantity FROM stocks 
    WHERE article_id = ? AND warehouse_id = ?
  `;

  db.query(sqlCheck, [article_id, warehouse_from], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erreur check stock" });

    const available = rows.length > 0 ? rows[0].quantity : 0;

    if (available < qty) {
      return res.status(400).json({
        error: `Stock insuffisant dans l'entrepôt source (dispo: ${available})`
      });
    }

    // Insérer le transfert
    const sqlInsert = `
      INSERT INTO transfers (article_id, warehouse_from, warehouse_to, qty, user, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sqlInsert,
      [article_id, warehouse_from, warehouse_to, qty, user || null, note || null],
      (err2, result) => {
        if (err2) {
          console.error("Erreur insert transfer:", err2);
          return res.status(500).json({ error: "Erreur serveur" });
        }

        const transferId = result.insertId;

        // 1) Décrémenter warehouse_from
        const sqlMinus = `
          UPDATE stocks SET quantity = quantity - ?
          WHERE article_id = ? AND warehouse_id = ?
        `;

        db.query(sqlMinus, [qty, article_id, warehouse_from]);

        // 2) Incrémenter warehouse_to (et créer ligne si besoin)
        const sqlAddRow = `
          INSERT INTO stocks (article_id, warehouse_id, quantity)
          VALUES (?, ?, 0)
          ON DUPLICATE KEY UPDATE quantity = quantity
        `;

        db.query(sqlAddRow, [article_id, warehouse_to], () => {
          const sqlPlus = `
            UPDATE stocks SET quantity = quantity + ?
            WHERE article_id = ? AND warehouse_id = ?
          `;

          db.query(sqlPlus, [qty, article_id, warehouse_to]);

          // 3) Ajouter mouvement "transfer"
          const sqlMove = `
            INSERT INTO movements (article_id, warehouse_from, warehouse_to, qty, type, user, note)
            VALUES (?, ?, ?, ?, 'transfer', ?, ?)
          `;

          db.query(sqlMove, [
            article_id,
            warehouse_from,
            warehouse_to,
            qty,
            user || null,
            note || null
          ]);

          res.status(201).json({
            message: "Transfert effectué",
            id: transferId
          });
        });
      }
    );
  });
});

module.exports = router;
