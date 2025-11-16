const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================
// GET all internal requests
// ==========================
router.get("/", (req, res) => {
  const sql = `
    SELECT ir.*, w.name AS warehouse_name
    FROM internal_requests ir
    JOIN warehouses w ON ir.warehouse_id = w.id
    ORDER BY ir.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Erreur GET requests:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(rows);
  });
});

// ==========================
// GET a single internal request + items
// ==========================
router.get("/:id", (req, res) => {
  const id = req.params.id;

  const sqlReq = `
    SELECT ir.*, w.name AS warehouse_name
    FROM internal_requests ir
    JOIN warehouses w ON ir.warehouse_id = w.id
    WHERE ir.id = ?
  `;

  db.query(sqlReq, [id], (err, reqRows) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    if (reqRows.length === 0)
      return res.status(404).json({ error: "Demande introuvable" });

    const request = reqRows[0];

    const sqlItems = `
      SELECT iri.*, a.name AS article_name
      FROM internal_request_items iri
      JOIN articles a ON iri.article_id = a.id
      WHERE iri.request_id = ?
    `;

    db.query(sqlItems, [id], (err2, itemRows) => {
      if (err2) return res.status(500).json({ error: "Erreur items" });

      request.items = itemRows;
      res.json(request);
    });
  });
});

// ==========================
// CREATE a new internal request
// ==========================
router.post("/", (req, res) => {
  const { requester, department, warehouse_id, note, items } = req.body;

  if (!requester || !warehouse_id || !items || items.length === 0) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  const sqlInsert = `
    INSERT INTO internal_requests (requester, department, warehouse_id, note)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sqlInsert,
    [requester, department || null, warehouse_id, note || null],
    (err, result) => {
      if (err) {
        console.error("Erreur INSERT request:", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }

      const requestId = result.insertId;

      const sqlItem = `
        INSERT INTO internal_request_items (request_id, article_id, qty_requested)
        VALUES ?
      `;

      const values = items.map(item => [
        requestId,
        item.article_id,
        item.qty_requested
      ]);

      db.query(sqlItem, [values], (err2) => {
        if (err2) {
          console.error("Erreur INSERT request items:", err2);
          return res.status(500).json({ error: "Erreur serveur" });
        }

        res.status(201).json({
          message: "Demande interne créée",
          id: requestId
        });
      });
    }
  );
});

// ==========================
// APPROVE internal request
// ==========================
router.put("/:id/approve", (req, res) => {
  const id = req.params.id;

  const sql = `UPDATE internal_requests SET status = 'approved' WHERE id = ?`;

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Erreur approve:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json({ message: "Demande approuvée" });
  });
});

// ==========================
// REJECT internal request
// ==========================
router.put("/:id/reject", (req, res) => {
  const id = req.params.id;

  const sql = `UPDATE internal_requests SET status = 'rejected' WHERE id = ?`;

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Erreur reject:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json({ message: "Demande rejetée" });
  });
});

// ==========================
// ISSUE ITEMS (sortie de stock)
// ==========================
router.post("/:id/issue", (req, res) => {
  const request_id = req.params.id;
  const { issued, user } = req.body;

  if (!issued || issued.length === 0) {
    return res.status(400).json({ error: "Liste vide" });
  }

  // 1) Vérifier que la demande existe
  const sqlReq = `SELECT * FROM internal_requests WHERE id = ?`;

  db.query(sqlReq, [request_id], (err, reqRows) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    if (reqRows.length === 0)
      return res.status(404).json({ error: "Demande introuvable" });

    const request = reqRows[0];

    // 2) Récupérer les items
    const sqlItems = `SELECT * FROM internal_request_items WHERE request_id = ?`;

    db.query(sqlItems, [request_id], (err2, itemRows) => {
      if (err2) return res.status(500).json({ error: "Erreur items" });

      issued.forEach(entry => {
        const it = itemRows.find(i => i.id === entry.item_id);
        if (!it) return;

        // 3) Update qty_issued
        const sqlUpdateItem = `
          UPDATE internal_request_items
          SET qty_issued = qty_issued + ?
          WHERE id = ?
        `;

        db.query(sqlUpdateItem, [entry.qty_issued, entry.item_id]);

        // 4) Mouvement OUT
        const sqlMove = `
          INSERT INTO movements (article_id, warehouse_from, qty, type, user, note)
          VALUES (?, ?, ?, 'out', ?, 'Internal Request Issue')
        `;

        db.query(sqlMove, [
          it.article_id,
          request.warehouse_id,
          entry.qty_issued,
          user || null
        ]);

        // 5) Décrémenter stock
        const sqlStock = `
          UPDATE stocks SET quantity = quantity - ?
          WHERE article_id = ? AND warehouse_id = ?
        `;

        db.query(sqlStock, [
          entry.qty_issued,
          it.article_id,
          request.warehouse_id
        ]);
      });

      // 6) Mettre statut fulfilled
      const sqlStatus = `
        UPDATE internal_requests SET status = 'fulfilled'
        WHERE id = ?
      `;

      db.query(sqlStatus, [request_id]);

      res.json({ message: "Items délivrés (issue OK)", status: "fulfilled" });
    });
  });
});


module.exports = router;

