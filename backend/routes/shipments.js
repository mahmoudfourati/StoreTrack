const express = require("express");
const router = express.Router();
const db = require("../config/db");
const lotService = require("../services/lotService");
const { checkStockAvailability, checkMultipleStocksAvailability } = require("../utils/stockValidator");
const notificationService = require("../services/notificationService");

// ==========================
// GET all shipments
// ==========================
router.get("/", async (req, res) => {
  const sql = `
    SELECT s.*, c.name AS client_name, w.name AS warehouse_name
    FROM shipments s
    JOIN clients c ON s.client_id = c.id
    JOIN warehouses w ON s.warehouse_id = w.id
    ORDER BY s.created_at DESC
  `;

  try {
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET shipments:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// GET shipments by status
// ==========================
router.get("/status/:status", async (req, res) => {
  const status = req.params.status;

  const sql = `
    SELECT s.*, c.name AS client_name, w.name AS warehouse_name
    FROM shipments s
    JOIN clients c ON s.client_id = c.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.status = ?
    ORDER BY s.created_at DESC
  `;

  try {
    const [rows] = await db.query(sql, [status]);
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET shipments by status:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});


// ==========================
// GET one shipment + items
// ==========================
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  const sqlShipment = `
    SELECT s.*, c.name AS client_name, w.name AS warehouse_name
    FROM shipments s
    JOIN clients c ON s.client_id = c.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.id = ?
  `;

  try {
    const [shipmentRows] = await db.query(sqlShipment, [id]);
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

    const [itemRows] = await db.query(sqlItems, [id]);
    shipment.items = itemRows;
    res.json(shipment);
  } catch (err) {
    console.error("Erreur GET shipment:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// CREATE shipment with items (avec validation stock)
// ==========================
router.post("/", async (req, res) => {
  const { client_id, warehouse_id, reference, items, status } = req.body;

  if (!client_id || !warehouse_id || !items || items.length === 0) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  try {
    // Normaliser items: accepter qty ou qty_ordered
    const normalizedItems = items.map(item => ({
      article_id: item.article_id,
      qty_ordered: item.qty_ordered || item.quantity || item.qty,
      qty_shipped: 0
    }));

    // VALIDATION: Vérifier stock disponible pour TOUS les articles
    const itemsToValidate = normalizedItems.map(item => ({
      article_id: item.article_id,
      warehouse_id: warehouse_id,
      qty_needed: item.qty_ordered
    }));

    await checkMultipleStocksAvailability(itemsToValidate, warehouse_id);

    // Si validation OK, créer le shipment
    const finalStatus = status || 'draft';
    const sqlShipment = `
      INSERT INTO shipments (client_id, warehouse_id, reference, status)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.query(sqlShipment, [client_id, warehouse_id, reference || null, finalStatus]);
    const shipmentId = result.insertId;

    // insert items
    const sqlItem = `
      INSERT INTO shipment_items (shipment_id, article_id, qty_ordered, unit_price)
      VALUES ?
    `;

    const values = normalizedItems.map(item => [
      shipmentId,
      item.article_id,
      item.qty_ordered,
      0
    ]);

    await db.query(sqlItem, [values]);

    // Notification création shipment
    const [clientInfo] = await db.query('SELECT name FROM clients WHERE id = ?', [client_id]);
    if (clientInfo.length > 0) {
      await notificationService.notifyShipmentCreated(
        shipmentId,
        reference || `SHP-${shipmentId}`,
        clientInfo[0].name
      );
    }

    res.status(201).json({
      message: "Shipment créé avec validation stock",
      id: shipmentId
    });
  } catch (err) {
    console.error("Erreur INSERT shipment:", err);
    return res.status(400).json({ error: err.message });
  }
});

// ==========================
// Update shipment status manually
// ==========================
router.put("/:id/status", async (req, res) => {
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

  try {
    await db.query(sql, [status, id]);
    res.json({ message: "Statut mis à jour", status });
  } catch (err) {
    console.error("Erreur update statut:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});


// ==========================
// DISPATCH (sortie de stock avec FEFO automatique)
// ==========================
router.post("/:id/dispatch", async (req, res) => {
  const shipment_id = req.params.id;
  const { sent, user } = req.body;

  console.log('🚀 Dispatch called:', { shipment_id, sent, user });

  if (!sent || sent.length === 0) {
    return res.status(400).json({ error: "Liste des quantités manquantes." });
  }

  try {
    // 1) Vérifier que le shipment existe
    const sqlShipment = `SELECT * FROM shipments WHERE id = ?`;
    const [shipmentRows] = await db.query(sqlShipment, [shipment_id]);
    
    if (shipmentRows.length === 0) {
      console.log('❌ Shipment introuvable:', shipment_id);
      return res.status(404).json({ error: "Shipment introuvable" });
    }

    const shipment = shipmentRows[0];
    console.log('✅ Shipment trouvé:', shipment);

    // 2) Récupérer les items
    const sqlItems = `SELECT * FROM shipment_items WHERE shipment_id = ?`;
    const [itemRows] = await db.query(sqlItems, [shipment_id]);
    console.log('📦 Items récupérés:', itemRows);

    const lotsUsed = [];

    // 3) traiter chaque item envoyé avec FEFO
    for (const entry of sent) {
      const it = itemRows.find(i => i.id === entry.item_id);
      if (!it) {
        console.log('⚠️ Item non trouvé:', entry.item_id);
        continue;
      }

      const qtySent = Number(entry.qty_sent || 0);
      if (qtySent <= 0) {
        console.log('⚠️ Quantité invalide:', qtySent);
        continue;
      }

      console.log(`🔍 Picking lots FEFO pour article ${it.article_id}, qty=${qtySent}, warehouse=${shipment.warehouse_id}`);

      // 3a) SELECTION AUTOMATIQUE DES LOTS (FEFO)
      let pickedLots = [];
      try {
        pickedLots = await lotService.pickLotsForShipment(
          it.article_id,
          shipment.warehouse_id,
          qtySent,
          'FEFO' // First Expired First Out
        );
        console.log('✅ Lots sélectionnés FEFO:', pickedLots);
        lotsUsed.push(...pickedLots.map(l => ({ ...l, article_id: it.article_id })));
      } catch (lotErr) {
        console.error("❌ Erreur FEFO picking:", lotErr);
        return res.status(400).json({ 
          error: `Impossible de prélever les lots pour l'article: ${lotErr.message}`,
          article_id: it.article_id
        });
      }

      // 3b) Ajouter dans shipment_entries
      const sqlEntry =
        `INSERT INTO shipment_entries (shipment_id, item_id, article_id, qty_sent, user)
         VALUES (?, ?, ?, ?, ?)`;

      await db.query(sqlEntry, [
        shipment_id,
        entry.item_id,
        it.article_id,
        qtySent,
        user || null
      ]);
      console.log('✅ shipment_entries créé');

      // 3c) Update qty_dispatched
      const sqlUpdateItem =
        `UPDATE shipment_items
         SET qty_dispatched = qty_dispatched + ?
         WHERE id = ?`;

      await db.query(sqlUpdateItem, [qtySent, entry.item_id]);
      console.log('✅ qty_dispatched mis à jour');

      // 3d) Mouvement OUT
      const sqlMove =
        `INSERT INTO movements (article_id, warehouse_from, qty, type, user, note)
         VALUES (?, ?, ?, 'out', ?, ?)`;

      const lotNumbers = pickedLots.map(l => l.lot_number).join(', ');
      const [moveResult] = await db.query(sqlMove, [
        it.article_id,
        shipment.warehouse_id,
        qtySent,
        user || null,
        `Expédition #${shipment_id} - Lots: ${lotNumbers}`
      ]);

      const movementId = moveResult.insertId;
      console.log('✅ Movement créé:', movementId);

      // 3e) Déduire des lots et enregistrer lot_movements
      for (const pickedLot of pickedLots) {
        // Déduire du lot
        await lotService.updateLotQuantity(
          pickedLot.lot_id,
          -pickedLot.quantity,
          movementId
        );
      }
      console.log('✅ Lots mis à jour');

      // 3f) Décrémenter le stock global
      const sqlStock =
        `UPDATE stocks
         SET quantity = quantity - ?
         WHERE article_id = ? AND warehouse_id = ?`;

      await db.query(sqlStock, [
        qtySent,
        it.article_id,
        shipment.warehouse_id
      ]);
      console.log('✅ Stocks mis à jour');
    }

    // 4) recalcul du statut
    const sqlStatus =
      `SELECT qty_ordered, qty_dispatched FROM shipment_items WHERE shipment_id = ?`;

    const [rows4] = await db.query(sqlStatus, [shipment_id]);

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

    await db.query(sqlUpdateStatus, [newStatus, shipment_id]);

    console.log('✅ Dispatch réussi:', { status: newStatus, lots_used: lotsUsed.length });

    res.json({
      message: "Dispatch effectué avec sélection automatique FEFO des lots",
      status: newStatus,
      lots_used: lotsUsed.length,
      lots: lotsUsed
    });
  } catch (err) {
    console.error("❌ Erreur dispatch:", err.message);
    console.error("Stack:", err.stack);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ==========================
// WORKFLOW ENDPOINTS - TODO 4
// ==========================

// POST /shipments/:id/confirm - Confirmer l'expédition (réservation)
router.post("/:id/confirm", async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  try {
    // Vérifier que le shipment existe et est en status 'pending' ou 'draft'
    const [shipmentRows] = await db.query(
      `SELECT * FROM shipments WHERE id = ?`,
      [id]
    );
    
    if (shipmentRows.length === 0) {
      return res.status(404).json({ error: "Shipment introuvable" });
    }
    
    const shipment = shipmentRows[0];
    
    if (!['pending', 'draft'].includes(shipment.status)) {
      return res.status(400).json({ 
        error: `Impossible de confirmer un shipment avec status: ${shipment.status}` 
      });
    }
    
    // Valider stock disponible pour tous les items
    const [items] = await db.query(
      `SELECT * FROM shipment_items WHERE shipment_id = ?`,
      [id]
    );
    
    for (const item of items) {
      await checkStockAvailability(
        item.article_id,
        shipment.warehouse_id,
        item.qty_ordered
      );
    }
    
    // Mettre à jour le status
    await db.query(
      `UPDATE shipments 
       SET status = 'confirmed', confirmed_by = ?, confirmed_at = NOW()
       WHERE id = ?`,
      [user_id || null, id]
    );
    
    // Notification confirmation
    await notificationService.notifyShipmentConfirmed(
      id,
      shipment.reference || `SHP-${id}`,
      user_id
    );
    
    res.json({ message: "Shipment confirmé", status: "confirmed" });
  } catch (err) {
    console.error("Erreur confirm:", err);
    return res.status(400).json({ error: err.message });
  }
});

// POST /shipments/:id/pick - Marquer comme prélevé
router.post("/:id/pick", async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  try {
    const [shipmentRows] = await db.query(
      `SELECT * FROM shipments WHERE id = ?`,
      [id]
    );
    
    if (shipmentRows.length === 0) {
      return res.status(404).json({ error: "Shipment introuvable" });
    }
    
    const shipment = shipmentRows[0];
    
    if (shipment.status !== 'confirmed') {
      return res.status(400).json({ 
        error: `Shipment doit être confirmé avant picking (status actuel: ${shipment.status})` 
      });
    }
    
    await db.query(
      `UPDATE shipments 
       SET status = 'picked', picked_by = ?, picked_at = NOW()
       WHERE id = ?`,
      [user_id || null, id]
    );
    
    res.json({ message: "Shipment marqué comme prélevé", status: "picked" });
  } catch (err) {
    console.error("Erreur pick:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /shipments/:id/pack - Marquer comme emballé
router.post("/:id/pack", async (req, res) => {
  const { id } = req.params;
  const { user_id, weight_kg, num_packages } = req.body;

  try {
    const [shipmentRows] = await db.query(
      `SELECT * FROM shipments WHERE id = ?`,
      [id]
    );
    
    if (shipmentRows.length === 0) {
      return res.status(404).json({ error: "Shipment introuvable" });
    }
    
    const shipment = shipmentRows[0];
    
    if (shipment.status !== 'picked') {
      return res.status(400).json({ 
        error: `Shipment doit être prélevé avant emballage (status actuel: ${shipment.status})` 
      });
    }
    
    await db.query(
      `UPDATE shipments 
       SET status = 'packed', 
           packed_by = ?, 
           packed_at = NOW(),
           weight_kg = ?,
           num_packages = ?
       WHERE id = ?`,
      [user_id || null, weight_kg || null, num_packages || 1, id]
    );
    
    res.json({ message: "Shipment marqué comme emballé", status: "packed" });
  } catch (err) {
    console.error("Erreur pack:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /shipments/:id/ship - Expédier (création mouvements)
router.post("/:id/ship", async (req, res) => {
  const { id } = req.params;
  const { user_id, tracking_number, carrier } = req.body;

  try {
    const [shipmentRows] = await db.query(
      `SELECT * FROM shipments WHERE id = ?`,
      [id]
    );
    
    if (shipmentRows.length === 0) {
      return res.status(404).json({ error: "Shipment introuvable" });
    }
    
    const shipment = shipmentRows[0];
    
    if (shipment.status !== 'packed') {
      return res.status(400).json({ 
        error: `Shipment doit être emballé avant expédition (status actuel: ${shipment.status})` 
      });
    }
    
    // Mettre à jour le status
    await db.query(
      `UPDATE shipments 
       SET status = 'shipped', 
           shipped_by = ?, 
           shipped_at = NOW(),
           tracking_number = ?,
           carrier = ?
       WHERE id = ?`,
      [user_id || null, tracking_number || null, carrier || null, id]
    );
    
    res.json({ 
      message: "Shipment expédié avec succès", 
      status: "shipped",
      tracking_number 
    });
  } catch (err) {
    console.error("Erreur ship:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /shipments/:id/cancel - Annuler l'expédition
router.post("/:id/cancel", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const [shipmentRows] = await db.query(
      `SELECT * FROM shipments WHERE id = ?`,
      [id]
    );
    
    if (shipmentRows.length === 0) {
      return res.status(404).json({ error: "Shipment introuvable" });
    }
    
    const shipment = shipmentRows[0];
    
    if (['shipped', 'delivered'].includes(shipment.status)) {
      return res.status(400).json({ 
        error: `Impossible d'annuler un shipment déjà expédié ou livré` 
      });
    }
    
    await db.query(
      `UPDATE shipments SET status = 'cancelled' WHERE id = ?`,
      [id]
    );
    
    res.json({ message: "Shipment annulé", status: "cancelled" });
  } catch (err) {
    console.error("Erreur cancel:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});


module.exports = router;
