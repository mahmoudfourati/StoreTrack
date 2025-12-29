const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { createMovement } = require("../services/movementService");
const lotService = require("../services/lotService");
const notificationService = require("../services/notificationService");
// Helper: calculate total amount from items
function calcTotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.unit_price || 0) * Number(it.qty_ordered || 0)), 0);
}

// GET all purchase orders
router.get("/", async (req, res) => {
  const sql = `SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name
               FROM purchase_orders po
               JOIN suppliers s ON po.supplier_id = s.id
               JOIN warehouses w ON po.warehouse_id = w.id
               ORDER BY po.created_at DESC`;
  try {
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    console.error("Erreur GET purchase_orders:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET single purchase order with items
router.get("/:id", async (req, res) => {
  const poId = req.params.id;
  const sqlPo = "SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id=s.id JOIN warehouses w ON po.warehouse_id=w.id WHERE po.id = ?";
  try {
    const [rows] = await db.query(sqlPo, [poId]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: "Commande introuvable" });
    const po = rows[0];
    const sqlItems = `SELECT poi.*, a.name AS article_name FROM purchase_order_items poi JOIN articles a ON poi.article_id=a.id WHERE poi.purchase_order_id = ?`;
    const [items] = await db.query(sqlItems, [poId]);
    po.items = items;
    res.json(po);
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST create a purchase order with items
// Expected body: { supplier_id, warehouse_id, reference, items: [{ article_id, quantity, unit_price }], notes, expected_date, status }
router.post("/", async (req, res) => {
  const { supplier_id, warehouse_id, reference, items, notes, expected_date, status } = req.body;
  if (!supplier_id || !warehouse_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "supplier_id, warehouse_id et items[] requis" });
  }

  // Map items: frontend sends 'quantity', backend expects 'qty_ordered'
  const mappedItems = items.map(item => ({
    article_id: item.article_id,
    qty_ordered: item.quantity || item.qty_ordered,
    unit_price: item.unit_price || 0
  }));

  const total = calcTotal(mappedItems);

  // Use 'notes' as reference if no reference provided
  const finalReference = reference || notes || null;
  const finalStatus = status || 'pending';

  const sqlPo = `INSERT INTO purchase_orders (supplier_id, warehouse_id, reference, status, total_amount)
                 VALUES (?, ?, ?, ?, ?)`;
  try {
    const [result] = await db.query(sqlPo, [supplier_id, warehouse_id, finalReference, finalStatus, total]);
    const poId = result.insertId;

    // Insert items
    const sqlItem = `INSERT INTO purchase_order_items (purchase_order_id, article_id, qty_ordered, unit_price) VALUES ?`;
    const values = mappedItems.map(i => [poId, i.article_id, i.qty_ordered, i.unit_price || 0]);
    await db.query(sqlItem, [values]);
    res.status(201).json({ message: "Purchase order créé", id: poId });
  } catch (err) {
    console.error("Erreur INSERT purchase_order:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST receive items for a purchase order
// Body: { received: [{ item_id, qty_received, expiration_date?, manufacturing_date?, supplier_batch? }], warehouse_id: optional }
// This will: - update qty_received on items, - create LOT, - create movement(s) type 'in' and update stocks, - update PO status
router.post("/:id/receive", async (req, res) => {
  const poId = req.params.id;
  const { received, user } = req.body; // received: [{ item_id, qty_received, expiration_date?, manufacturing_date?, supplier_batch? }]
  
  if (!Array.isArray(received) || received.length === 0) {
    return res.status(400).json({ error: "received[] requis" });
  }

  try {
    // Get Purchase Order
    const sqlPo = "SELECT po.*, s.name AS supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?";
    const [rowsPo] = await db.query(sqlPo, [poId]);
    
    if (!rowsPo || rowsPo.length === 0) {
      return res.status(404).json({ error: "PO introuvable" });
    }
    
    const po = rowsPo[0];
    const warehouseId = po.warehouse_id;
    let errors = [];
    const createdLots = [];

    // Process each received item
    for (const r of received) {
      const itemId = r.item_id;
      const qtyRecv = Number(r.qty_received || 0);
      if (qtyRecv <= 0) continue;

      try {
        // 1) Get article_id of item
        const [rowsItem] = await db.query(`SELECT article_id FROM purchase_order_items WHERE id = ?`, [itemId]);
        if (!rowsItem || rowsItem.length === 0) {
          throw new Error("Item introuvable");
        }
        const articleId = rowsItem[0].article_id;

        // 2) CREATE LOT automatically
        const lotNumber = await lotService.generateLotNumber();
        const lotData = {
          lot_number: lotNumber,
          article_id: articleId,
          warehouse_id: warehouseId,
          quantity: qtyRecv,
          manufacturing_date: r.manufacturing_date || null,
          expiration_date: r.expiration_date || null,
          supplier_batch: r.supplier_batch || po.reference || null,
          notes: `Réception PO #${poId} - ${po.supplier_name || 'Fournisseur'}`
        };

        const lot = await lotService.createLot(lotData);
        createdLots.push(lot);

        // 3) Update qty_received on purchase_order_items
        const sqlUpdItem = `UPDATE purchase_order_items SET qty_received = qty_received + ? WHERE id = ?`;
        await db.query(sqlUpdItem, [qtyRecv, itemId]);

        // 4) Insert reception_entries (audit)
        const sqlRecv = `INSERT INTO reception_entries (purchase_order_id, purchase_order_item_id, article_id, warehouse_id, qty_received, user, note)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const note = `Réception PO #${poId} - Lot ${lotNumber}`;
        await db.query(sqlRecv, [poId, itemId, articleId, warehouseId, qtyRecv, user || null, note]);

        // 5) Create movement via service (type = 'in')
        try {
          const movement = await createMovement({ 
            article_id: articleId, 
            warehouse_to: warehouseId, 
            qty: qtyRecv, 
            type: "in", 
            user: user || null, 
            note: `Reception PO #${poId} - Lot ${lotNumber}` 
          });

          // 6) Link movement to lot in lot_movements
          if (movement && movement.movementId) {
            await db.query(
              `INSERT INTO lot_movements (lot_id, movement_id, quantity_change, balance_after) VALUES (?, ?, ?, ?)`,
              [lot.id, movement.movementId, qtyRecv, qtyRecv]
            );
          }
        } catch (movErr) {
          console.error("Erreur createMovement depuis PO receive:", movErr);
          errors.push(movErr.message);
        }

      } catch (procErr) {
        console.error("Erreur processing received item:", procErr);
        errors.push(procErr.message);
      }
    }

    // Finalize: recompute PO status
    const [rowsSum] = await db.query(
      `SELECT SUM(qty_ordered) AS total_ordered, SUM(qty_received) AS total_received 
       FROM purchase_order_items WHERE purchase_order_id = ?`, 
      [poId]
    );
    
    const s = rowsSum[0] || { total_ordered: 0, total_received: 0 };
    const ordered = Number(s.total_ordered || 0);
    const receivedTotal = Number(s.total_received || 0);

    let newStatus = po.status;
    if (receivedTotal === 0) newStatus = 'pending';
    else if (receivedTotal < ordered) newStatus = 'partially_received';
    else if (receivedTotal >= ordered) newStatus = 'received';

    await db.query(`UPDATE purchase_orders SET status = ? WHERE id = ?`, [newStatus, poId]);

    // If partially_received => create a notification for this PO
    if (newStatus === "partially_received") {
      const msg = `Commande #${poId} partiellement reçue (${receivedTotal}/${ordered}).`;
      try {
        await db.query(
          `INSERT INTO notifications (type, target_id, message) VALUES (?, ?, ?)`, 
          ['po_partial_receive', poId, msg]
        );
      } catch (errNotif) {
        console.error("Erreur creation notification PO:", errNotif);
      }
    }

    const response = { 
      message: "Réception traitée avec création automatique des lots", 
      status: newStatus,
      lots_created: createdLots.length,
      lots: createdLots
    };
    if (errors.length) response.warnings = errors;
    return res.json(response);

  } catch (err) {
    console.error("Erreur PO receive:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// PUT update purchase order status
router.put("/:id", async (req, res) => {
  const poId = req.params.id;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: "Status requis" });
  }

  try {
    await db.query("UPDATE purchase_orders SET status = ? WHERE id = ?", [status, poId]);
    res.json({ message: "Statut mis à jour", status });
  } catch (err) {
    console.error("Erreur UPDATE purchase_order:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
