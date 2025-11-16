const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================
// GET all shipments
// ==========================
router.get("/", (req, res) => {
  const sql = `
    SELECT s.*, c.name AS client_name, w.name AS warehouse_name
    FROM shipments s
    JOIN clients c ON s.client_id = c.id
    JOIN warehouses w ON s.warehouse_id = w.id
    ORDER BY s.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Erreur GET shipments:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(rows);
  });
});

// ==========================
// GET shipments by status
// ==========================
router.get("/status/:status", (req, res) => {
  const status = req.params.status;

  const sql = `
    SELECT s.*, c.name AS client_name, w.name AS warehouse_name
    FROM shipments s
    JOIN clients c ON s.client_id = c.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.status = ?
    ORDER BY s.created_at DESC
  `;

  db.query(sql, [status], (err, rows) => {
    if (err) {
      console.error("Erreur GET shipments by status:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(rows);
  });
});


// ==========================
// GET one shipment + items
// ==========================
router.get("/:id", (req, res) => {
  const id = req.params.id;

  const sqlShipment = `
    SELECT s.*, c.name AS client_name, w.name AS warehouse_name
    FROM shipments s
    JOIN clients c ON s.client_id = c.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.id = ?
  `;

  db.query(sqlShipment, [id], (err, shipmentRows) => {
    if (err) {
      console.error("Erreur GET shipment:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    if (shipmentRows.length === 0) {
      return res.status(404).json({ error: "Shipment introuvable" });
    }

    const shipment = shipmentRows[0];

    const sqlItems = `
      SELECT si.*, a.name AS article_name
      FROM shipment_items si
      JOIN articles a ON si.article_id = a.id
      WHERE si.shipment_id = ?
    `;

    db.query(sqlItems, [id], (err2, itemRows) => {
      if (err2) {
        console.error("Erreur GET shipment items:", err2);
        return res.status(500).json({ error: "Erreur serveur" });
      }

      shipment.items = itemRows;
      res.json(shipment);
    });
  });
});

// ==========================
// CREATE shipment with items
// ==========================
router.post("/", (req, res) => {
  const { client_id, warehouse_id, reference, items } = req.body;

  if (!client_id || !warehouse_id || !items || items.length === 0) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  const sqlShipment = `
    INSERT INTO shipments (client_id, warehouse_id, reference, status)
    VALUES (?, ?, ?, 'pending')
  `;

  db.query(sqlShipment, [client_id, warehouse_id, reference], (err, result) => {
    if (err) {
      console.error("Erreur INSERT shipment:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    const shipmentId = result.insertId;

    // insert items
    const sqlItem = `
      INSERT INTO shipment_items (shipment_id, article_id, qty_ordered, unit_price)
      VALUES ?
    `;

    const values = items.map(item => [
      shipmentId,
      item.article_id,
      item.qty,
      item.unit_price || 0
    ]);

    db.query(sqlItem, [values], (err2) => {
      if (err2) {
        console.error("Erreur INSERT shipment items:", err2);
        return res.status(500).json({ error: "Erreur serveur" });
      }

      res.status(201).json({
        message: "Shipment créé",
        id: shipmentId
      });
    });
  });
});

// ==========================
// Update shipment status manually
// ==========================
router.put("/:id/status", (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  const allowed = [
    "draft",
    "pending",
    "partially_dispatched",
    "dispatched",
    "cancelled"
  ];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  const sql = `UPDATE shipments SET status = ? WHERE id = ?`;

  db.query(sql, [status, id], (err) => {
    if (err) {
      console.error("Erreur update statut:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json({ message: "Statut mis à jour", status });
  });
});


// ==========================
// DISPATCH (sortie de stock)
// ==========================
router.post("/:id/dispatch", (req, res) => {
  const shipment_id = req.params.id;
  const { sent, user } = req.body;

  if (!sent || sent.length === 0) {
    return res.status(400).json({ error: "Liste des quantités manquantes." });
    }

  // 1) Vérifier que le shipment existe
  const sqlShipment = `SELECT * FROM shipments WHERE id = ?`;
  db.query(sqlShipment, [shipment_id], (err, shipmentRows) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    if (shipmentRows.length === 0)
      return res.status(404).json({ error: "Shipment introuvable" });

    const shipment = shipmentRows[0];

    // 2) Récupérer les items
    const sqlItems = `SELECT * FROM shipment_items WHERE shipment_id = ?`;
    db.query(sqlItems, [shipment_id], (err2, itemRows) => {
      if (err2) return res.status(500).json({ error: "Erreur items" });

      // 3) traiter chaque item envoyé
      sent.forEach(entry => {
        const it = itemRows.find(i => i.id === entry.item_id);
        if (!it) return;

        // 3a) Ajouter dans shipment_entries
        const sqlEntry =
          `INSERT INTO shipment_entries (shipment_id, item_id, article_id, qty_sent, user)
           VALUES (?, ?, ?, ?, ?)`;

        db.query(sqlEntry, [
          shipment_id,
          entry.item_id,
          it.article_id,
          entry.qty_sent,
          user || null
        ]);

        // 3b) Update qty_dispatched
        const sqlUpdateItem =
          `UPDATE shipment_items
           SET qty_dispatched = qty_dispatched + ?
           WHERE id = ?`;

        db.query(sqlUpdateItem, [entry.qty_sent, entry.item_id]);

        // 3c) Mouvement OUT
        const sqlMove =
          `INSERT INTO movements (article_id, warehouse_from, qty, type, user)
           VALUES (?, ?, ?, 'out', ?)`;

        db.query(sqlMove, [
          it.article_id,
          shipment.warehouse_id,
          entry.qty_sent,
          user || null
        ]);

        // 3d) Décrémenter le stock
        const sqlStock =
          `UPDATE stocks
           SET quantity = quantity - ?
           WHERE article_id = ? AND warehouse_id = ?`;

        db.query(sqlStock, [
          entry.qty_sent,
          it.article_id,
          shipment.warehouse_id
        ]);
      });

      // 4) recalcul du statut
      const sqlStatus =
        `SELECT qty_ordered, qty_dispatched FROM shipment_items WHERE shipment_id = ?`;

      db.query(sqlStatus, [shipment_id], (err4, rows4) => {
        if (err4) return res.status(500).json({ error: "Erreur statut" });

        let fully = true;
        let zero = true;

        rows4.forEach(r => {
          if (r.qty_dispatched > 0) zero = false;
          if (r.qty_dispatched < r.qty_ordered) fully = false;
        });

        let newStatus = "pending";
        if (!zero && !fully) newStatus = "partially_dispatched";
        if (fully) newStatus = "dispatched";

        const sqlUpdateStatus =
          `UPDATE shipments SET status = ? WHERE id = ?`;

        db.query(sqlUpdateStatus, [newStatus, shipment_id]);

        res.json({
          message: "Dispatch effectué",
          status: newStatus
        });
      });
    });
  });
});


module.exports = router;
