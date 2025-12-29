const express = require("express");
const router = express.Router();
const db = require("../config/db");
const lotService = require("../services/lotService");

// ==========================
// GET all lots with filters
// ==========================
router.get("/", async (req, res) => {
  try {
    const filters = {
      article_id: req.query.article_id,
      warehouse_id: req.query.warehouse_id,
      status: req.query.status,
      lot_number: req.query.lot_number,
      expiring_days: req.query.expiring_days,
      limit: req.query.limit,
    };

    const lots = await lotService.searchLots(filters);
    res.json(lots);
  } catch (err) {
    console.error("Erreur GET /lots:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// GET expiring lots
// ==========================
router.get("/expiring", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const lots = await lotService.checkExpiringLots(days);
    res.json(lots);
  } catch (err) {
    console.error("Erreur GET /lots/expiring:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// GET lots statistics
// ==========================
router.get("/stats", async (req, res) => {
  try {
    const stats = await lotService.getStats();
    res.json(stats);
  } catch (err) {
    console.error("Erreur GET /lots/stats:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// GET expired lots log
// ==========================
router.get("/expired-log", async (req, res) => {
  try {
    const sql = `
      SELECT 
        el.*,
        a.name AS article_name,
        a.sku,
        w.name AS warehouse_name,
        u.username AS action_by_name
      FROM expired_lots_log el
      JOIN articles a ON el.article_id = a.id
      JOIN warehouses w ON el.warehouse_id = w.id
      LEFT JOIN users u ON el.action_by = u.id
      ORDER BY el.detected_at DESC
      LIMIT 100
    `;

    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET /lots/expired-log:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// GET single lot with details
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        l.*, 
        a.name AS article_name, 
        a.sku,
        w.name AS warehouse_name,
        DATEDIFF(l.expiration_date, CURDATE()) AS days_until_expiration
      FROM lots l
      JOIN articles a ON l.article_id = a.id
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.id = ?
    `;

    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Lot introuvable" });
    }

    const lot = rows[0];

    // Récupérer l'historique des mouvements
    const history = await lotService.getLotHistory(id);
    lot.history = history;

    res.json(lot);
  } catch (err) {
    console.error("Erreur GET /lots/:id:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// POST create new lot
// ==========================
router.post("/", async (req, res) => {
  try {
    const {
      lot_number,
      article_id,
      warehouse_id,
      quantity,
      manufacturing_date,
      expiration_date,
      supplier_batch,
      notes,
    } = req.body;

    if (!article_id || !warehouse_id) {
      return res.status(400).json({ error: "article_id et warehouse_id requis" });
    }

    // Générer un numéro de lot si non fourni
    const finalLotNumber = lot_number || (await lotService.generateLotNumber());

    const lot = await lotService.createLot({
      lot_number: finalLotNumber,
      article_id,
      warehouse_id,
      quantity: quantity || 0,
      manufacturing_date,
      expiration_date,
      supplier_batch,
      notes,
    });

    res.status(201).json({
      message: "Lot créé avec succès",
      lot,
    });
  } catch (err) {
    console.error("Erreur POST /lots:", err);
    
    if (err.message.includes("existe déjà")) {
      return res.status(409).json({ error: err.message });
    }
    
    return res.status(500).json({ error: "Erreur serveur: " + err.message });
  }
});

// ==========================
// PUT update lot
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      lot_number,
      quantity,
      manufacturing_date,
      expiration_date,
      supplier_batch,
      notes,
      status,
    } = req.body;

    // Construire la requête UPDATE dynamiquement
    const updates = [];
    const values = [];

    if (lot_number !== undefined) {
      updates.push("lot_number = ?");
      values.push(lot_number);
    }
    if (quantity !== undefined) {
      updates.push("quantity = ?");
      values.push(quantity);
    }
    if (manufacturing_date !== undefined) {
      updates.push("manufacturing_date = ?");
      values.push(manufacturing_date || null);
    }
    if (expiration_date !== undefined) {
      updates.push("expiration_date = ?");
      values.push(expiration_date || null);
    }
    if (supplier_batch !== undefined) {
      updates.push("supplier_batch = ?");
      values.push(supplier_batch || null);
    }
    if (notes !== undefined) {
      updates.push("notes = ?");
      values.push(notes || null);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Aucune donnée à mettre à jour" });
    }

    values.push(id);

    const sql = `UPDATE lots SET ${updates.join(", ")} WHERE id = ?`;
    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Lot introuvable" });
    }

    res.json({ message: "Lot mis à jour avec succès" });
  } catch (err) {
    console.error("Erreur PUT /lots/:id:", err);
    
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ce numéro de lot existe déjà" });
    }
    
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// DELETE lot (soft delete: status=depleted)
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le lot a encore une quantité
    const [rows] = await db.query("SELECT quantity FROM lots WHERE id = ?", [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Lot introuvable" });
    }

    if (rows[0].quantity > 0) {
      return res.status(400).json({
        error: "Impossible de supprimer un lot avec une quantité > 0",
        quantity: rows[0].quantity,
      });
    }

    // Soft delete: marquer comme depleted
    await db.query("UPDATE lots SET status = 'depleted' WHERE id = ?", [id]);

    res.json({ message: "Lot supprimé avec succès" });
  } catch (err) {
    console.error("Erreur DELETE /lots/:id:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// POST mark expired lots (cron job)
// ==========================
router.post("/mark-expired", async (req, res) => {
  try {
    const result = await lotService.markExpiredLots();
    res.json({
      message: `${result.marked} lot(s) marqué(s) comme expiré(s)`,
      lots: result.lots,
    });
  } catch (err) {
    console.error("Erreur POST /lots/mark-expired:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// POST pick lots for shipment (FEFO)
// ==========================
router.post("/pick", async (req, res) => {
  try {
    const { article_id, warehouse_id, quantity, strategy } = req.body;

    if (!article_id || !warehouse_id || !quantity) {
      return res.status(400).json({ error: "article_id, warehouse_id et quantity requis" });
    }

    const pickedLots = await lotService.pickLotsForShipment(
      article_id,
      warehouse_id,
      quantity,
      strategy || "FEFO"
    );

    res.json({
      message: "Lots sélectionnés avec succès",
      lots: pickedLots,
      total_quantity: pickedLots.reduce((sum, l) => sum + l.quantity, 0),
    });
  } catch (err) {
    console.error("Erreur POST /lots/pick:", err);
    return res.status(400).json({ error: err.message });
  }
});

// ==========================
// GET lots for article in warehouse
// ==========================
router.get("/article/:article_id/warehouse/:warehouse_id", async (req, res) => {
  try {
    const { article_id, warehouse_id } = req.params;
    const status = req.query.status || "active";

    const lots = await lotService.findLotsForArticle(
      parseInt(article_id),
      parseInt(warehouse_id),
      status
    );

    res.json(lots);
  } catch (err) {
    console.error("Erreur GET /lots/article/:id/warehouse/:id:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// POST update lot quantity (internal use)
// ==========================
router.post("/:id/adjust-quantity", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity_change, movement_id, note } = req.body;

    if (quantity_change === undefined || quantity_change === 0) {
      return res.status(400).json({ error: "quantity_change requis et différent de 0" });
    }

    const result = await lotService.updateLotQuantity(
      parseInt(id),
      parseInt(quantity_change),
      movement_id || null
    );

    res.json({
      message: "Quantité du lot ajustée avec succès",
      ...result,
    });
  } catch (err) {
    console.error("Erreur POST /lots/:id/adjust-quantity:", err);
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
