const express = require("express");
const router = express.Router();
const db = require("../db");
const { createMovement } = require("../services/movementService");
// Helper: calculate total amount from items
function calcTotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.unit_price || 0) * Number(it.qty_ordered || 0)), 0);
}

// GET all purchase orders
router.get("/", (req, res) => {
  const sql = `SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name
               FROM purchase_orders po
               JOIN suppliers s ON po.supplier_id = s.id
               JOIN warehouses w ON po.warehouse_id = w.id
               ORDER BY po.created_at DESC`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erreur GET purchase_orders:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(results);
  });
});

// GET single purchase order with items
router.get("/:id", (req, res) => {
  const poId = req.params.id;
  const sqlPo = "SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id=s.id JOIN warehouses w ON po.warehouse_id=w.id WHERE po.id = ?";
  db.query(sqlPo, [poId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    if (!rows || rows.length === 0) return res.status(404).json({ error: "Commande introuvable" });
    const po = rows[0];
    const sqlItems = `SELECT poi.*, a.name AS article_name FROM purchase_order_items poi JOIN articles a ON poi.article_id=a.id WHERE poi.purchase_order_id = ?`;
    db.query(sqlItems, [poId], (err2, items) => {
      if (err2) return res.status(500).json({ error: "Erreur serveur" });
      po.items = items;
      res.json(po);
    });
  });
});

// POST create a purchase order with items
// Expected body: { supplier_id, warehouse_id, reference, items: [{ article_id, qty_ordered, unit_price }] }
router.post("/", (req, res) => {
  const { supplier_id, warehouse_id, reference, items } = req.body;
  if (!supplier_id || !warehouse_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "supplier_id, warehouse_id et items[] requis" });
  }

  const total = calcTotal(items);

  const sqlPo = `INSERT INTO purchase_orders (supplier_id, warehouse_id, reference, status, total_amount)
                 VALUES (?, ?, ?, 'pending', ?)`;
  db.query(sqlPo, [supplier_id, warehouse_id, reference || null, total], (err, result) => {
    if (err) {
      console.error("Erreur INSERT purchase_order:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    const poId = result.insertId;

    // Insert items
    const sqlItem = `INSERT INTO purchase_order_items (purchase_order_id, article_id, qty_ordered, unit_price) VALUES ?`;
    const values = items.map(i => [poId, i.article_id, i.qty_ordered, i.unit_price || 0]);
    db.query(sqlItem, [values], (err2) => {
      if (err2) {
        console.error("Erreur INSERT poi:", err2);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      res.status(201).json({ message: "Purchase order créé", id: poId });
    });
  });
});

// POST receive items for a purchase order
// Body: { received: [{ item_id, qty_received }], warehouse_id: optional }
// This will: - update qty_received on items, - create movement(s) type 'in' and update stocks, - update PO status


// Remplacer l'ancien POST /:id/receive par ceci :
router.post("/:id/receive", (req, res) => {
  const poId = req.params.id;
  const { received, user } = req.body; // received: [{ item_id, qty_received }]
  if (!Array.isArray(received) || received.length === 0) {
    return res.status(400).json({ error: "received[] requis" });
  }

  const sqlPo = "SELECT * FROM purchase_orders WHERE id = ?";
  db.query(sqlPo, [poId], async (errPo, rowsPo) => {
    if (errPo) return res.status(500).json({ error: "Erreur serveur" });
    if (!rowsPo || rowsPo.length === 0) return res.status(404).json({ error: "PO introuvable" });
    const po = rowsPo[0];
    const warehouseId = po.warehouse_id;

    // process each received row sequentially using async/await pattern inside callbacks
    let errors = [];
    (async () => {
      for (const r of received) {
        const itemId = r.item_id;
        const qtyRecv = Number(r.qty_received || 0);
        if (qtyRecv <= 0) continue;

        try {
          // 1) update qty_received on purchase_order_items
          await new Promise((resolve, reject) => {
            const sqlUpdItem = `UPDATE purchase_order_items SET qty_received = qty_received + ? WHERE id = ?`;
            db.query(sqlUpdItem, [qtyRecv, itemId], (errUpd) => errUpd ? reject(errUpd) : resolve());
          });

          // 2) get article_id of item
          const articleId = await new Promise((resolve, reject) => {
            db.query(`SELECT article_id FROM purchase_order_items WHERE id = ?`, [itemId], (errGet, rowsItem) => {
              if (errGet) return reject(errGet);
              if (!rowsItem || rowsItem.length === 0) return reject(new Error("Item introuvable"));
              resolve(rowsItem[0].article_id);
            });
          });

          // 3) insert reception_entries (audit)
          await new Promise((resolve, reject) => {
            const sqlRecv = `INSERT INTO reception_entries (purchase_order_id, purchase_order_item_id, article_id, warehouse_id, qty_received, user, note)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const note = `Réception PO #${poId}`;
            db.query(sqlRecv, [poId, itemId, articleId, warehouseId, qtyRecv, user || null, note], (errIns) => errIns ? reject(errIns) : resolve());
          });

          // 4) create movement via service (type = 'in')
          try {
            await createMovement({ article_id: articleId, warehouse_to: warehouseId, qty: qtyRecv, type: "in", user: user || null, note: `Reception PO #${poId}` });
          } catch (movErr) {
            // log but continue
            console.error("Erreur createMovement depuis PO receive:", movErr);
            errors.push(movErr.message);
          }

        } catch (procErr) {
          console.error("Erreur processing received item:", procErr);
          errors.push(procErr.message);
        }
      } // end for

      // finalize: recompute PO status
      db.query(`SELECT SUM(qty_ordered) AS total_ordered, SUM(qty_received) AS total_received FROM purchase_order_items WHERE purchase_order_id = ?`, [poId], (errSum, rowsSum) => {
        if (errSum) return res.status(500).json({ error: "Erreur serveur", details: errSum.message });
        const s = rowsSum[0] || { total_ordered: 0, total_received: 0 };
        const ordered = Number(s.total_ordered || 0);
        const receivedTotal = Number(s.total_received || 0);

        let newStatus = po.status;
        if (receivedTotal === 0) newStatus = 'pending';
        else if (receivedTotal < ordered) newStatus = 'partially_received';
        else if (receivedTotal >= ordered) newStatus = 'received';

        db.query(`UPDATE purchase_orders SET status = ? WHERE id = ?`, [newStatus, poId], (errUp) => {
          if (errUp) return res.status(500).json({ error: "Erreur serveur", details: errUp.message });

          // if partially_received => create a notification for this PO
          if (newStatus === "partially_received") {
            const msg = `Commande #${poId} partiellement reçue (${receivedTotal}/${ordered}).`;
            db.query(`INSERT INTO notifications (type, target_id, message) VALUES (?, ?, ?)`, ['po_partial_receive', poId, msg], (errNotif) => {
              if (errNotif) console.error("Erreur creation notification PO:", errNotif);
              // respond anyway
              const response = { message: "Réception traitée", status: newStatus };
              if (errors.length) response.warnings = errors;
              return res.json(response);
            });
          } else {
            const response = { message: "Réception traitée", status: newStatus };
            if (errors.length) response.warnings = errors;
            return res.json(response);
          }
        });
      });
    })(); // end async IIFE
  });
});

module.exports = router;
