const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { checkStockAvailability } = require("../utils/stockValidator");
const notificationService = require("../services/notificationService");

// ==========================
// GET all internal requests
// ==========================
router.get("/", async (req, res) => {
  const sql = `
    SELECT ir.*, w.name AS warehouse_name
    FROM internal_requests ir
    JOIN warehouses w ON ir.warehouse_id = w.id
    ORDER BY ir.created_at DESC
  `;

  try {
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET requests:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// GET a single internal request + items
// ==========================
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  const sqlReq = `
    SELECT ir.*, w.name AS warehouse_name
    FROM internal_requests ir
    JOIN warehouses w ON ir.warehouse_id = w.id
    WHERE ir.id = ?
  `;

  try {
    const [reqRows] = await db.query(sqlReq, [id]);
    if (reqRows.length === 0)
      return res.status(404).json({ error: "Demande introuvable" });

    const request = reqRows[0];

    const sqlItems = `
      SELECT iri.*, a.name AS article_name
      FROM internal_request_items iri
      JOIN articles a ON iri.article_id = a.id
      WHERE iri.request_id = ?
    `;

    const [itemRows] = await db.query(sqlItems, [id]);
    request.items = itemRows;
    res.json(request);
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// CREATE a new internal request
// ==========================
router.post("/", async (req, res) => {
  const { requester, department, warehouse_id, note, items } = req.body;

  if (!requester || !warehouse_id || !items || items.length === 0) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  const sqlInsert = `
    INSERT INTO internal_requests (requester, department, warehouse_id, note)
    VALUES (?, ?, ?, ?)
  `;

  try {
    const [result] = await db.query(
      sqlInsert,
      [requester, department || null, warehouse_id, note || null]
    );

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

    await db.query(sqlItem, [values]);

    res.status(201).json({
      message: "Demande interne créée",
      id: requestId
    });
  } catch (err) {
    console.error("Erreur INSERT request:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// UPDATE internal request (status or other fields)
// ==========================
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status requis" });
  }

  const sql = `UPDATE internal_requests SET status = ? WHERE id = ?`;

  try {
    await db.query(sql, [status, id]);
    res.json({ message: "Demande mise à jour" });
  } catch (err) {
    console.error("Erreur UPDATE request:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// APPROVE internal request (avec validation stock et user_id)
// ==========================
router.put("/:id/approve", async (req, res) => {
  const id = req.params.id;
  const { user_id } = req.body; // ID du user qui approuve

  try {
    // Récupérer la demande avec ses items
    const sqlReq = `SELECT * FROM internal_requests WHERE id = ?`;
    const [reqRows] = await db.query(sqlReq, [id]);
    
    if (reqRows.length === 0) {
      return res.status(404).json({ error: "Demande introuvable" });
    }
    
    const request = reqRows[0];
    
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        error: `Demande déjà traitée (status: ${request.status})` 
      });
    }
    
    // Récupérer les items
    const sqlItems = `SELECT * FROM internal_request_items WHERE request_id = ?`;
    const [items] = await db.query(sqlItems, [id]);
    
    // VALIDATION: Vérifier stock disponible pour TOUS les items
    for (const item of items) {
      await checkStockAvailability(
        item.article_id,
        request.warehouse_id,
        item.qty_requested
      );
    }
    
    // Si validation OK, approuver
    const sql = `
      UPDATE internal_requests 
      SET status = 'approved', approved_by = ?, approved_at = NOW() 
      WHERE id = ?`;
    await db.query(sql, [user_id || null, id]);
    
    // Notification approbation
    const [approverInfo] = await db.query('SELECT username FROM users WHERE id = ?', [user_id]);
    await notificationService.notifyRequestApproved(
      id,
      request.requester,
      approverInfo.length > 0 ? approverInfo[0].username : 'Manager'
    );
    
    res.json({ message: "Demande approuvée avec validation stock" });
  } catch (err) {
    console.error("Erreur approve:", err);
    return res.status(400).json({ error: err.message });
  }
});

// ==========================
// REJECT internal request
// ==========================
router.put("/:id/reject", async (req, res) => {
  const id = req.params.id;
  const { user_id, reason } = req.body;

  try {
    const [reqRows] = await db.query(
      `SELECT * FROM internal_requests WHERE id = ?`,
      [id]
    );
    
    if (reqRows.length === 0) {
      return res.status(404).json({ error: "Demande introuvable" });
    }
    
    const request = reqRows[0];
    
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        error: `Demande déjà traitée (status: ${request.status})` 
      });
    }
    
    const sql = `
      UPDATE internal_requests 
      SET status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ?
      WHERE id = ?`;
    
    await db.query(sql, [user_id || null, reason || null, id]);
    
    // Notification rejet
    await notificationService.notifyRequestRejected(
      id,
      request.requester,
      reason || 'Non spécifié'
    );
    
    res.json({ message: "Demande rejetée" });
  } catch (err) {
    console.error("Erreur reject:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// FULFILL internal request (exécution physique)
// ==========================
router.post("/:id/fulfill", async (req, res) => {
  const id = req.params.id;
  const { user_id } = req.body;

  try {
    // Vérifier que la demande est approuvée
    const sqlReq = `SELECT * FROM internal_requests WHERE id = ?`;
    const [reqRows] = await db.query(sqlReq, [id]);
    
    if (reqRows.length === 0) {
      return res.status(404).json({ error: "Demande introuvable" });
    }
    
    const request = reqRows[0];
    
    if (request.status !== 'approved') {
      return res.status(400).json({ 
        error: `Demande doit être approuvée avant exécution (status: ${request.status})` 
      });
    }
    
    // Récupérer les items
    const sqlItems = `SELECT * FROM internal_request_items WHERE request_id = ?`;
    const [items] = await db.query(sqlItems, [id]);
    
    // Pour chaque item: créer mouvement OUT et déduire stock
    for (const item of items) {
      // Créer mouvement OUT
      const sqlMove = `
        INSERT INTO movements (article_id, warehouse_from, qty, type, user, note)
        VALUES (?, ?, ?, 'out', ?, ?)
      `;
      
      await db.query(sqlMove, [
        item.article_id,
        request.warehouse_id,
        item.qty_requested,
        user_id || null,
        `Demande interne #${id} - ${request.requester}`
      ]);
      
      // Déduire du stock
      const sqlStock = `
        UPDATE stocks SET quantity = quantity - ?
        WHERE article_id = ? AND warehouse_id = ?
      `;
      
      await db.query(sqlStock, [
        item.qty_requested,
        item.article_id,
        request.warehouse_id
      ]);
      
      // Mettre à jour qty_issued
      const sqlUpdateItem = `
        UPDATE internal_request_items
        SET qty_issued = qty_requested
        WHERE id = ?
      `;
      
      await db.query(sqlUpdateItem, [item.id]);
    }
    
    // Marquer comme fulfilled
    const sql = `
      UPDATE internal_requests 
      SET status = 'fulfilled', fulfilled_by = ?, fulfilled_at = NOW()
      WHERE id = ?`;
    
    await db.query(sql, [user_id || null, id]);
    
    // Notification fulfillment
    await notificationService.notifyRequestFulfilled(id, request.requester);
    
    res.json({ 
      message: "Demande exécutée avec succès - Mouvements créés",
      status: "fulfilled"
    });
  } catch (err) {
    console.error("Erreur fulfill:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================
// ISSUE ITEMS (sortie de stock)
// ==========================
router.post("/:id/issue", async (req, res) => {
  const request_id = req.params.id;
  const { issued, user } = req.body;

  if (!issued || issued.length === 0) {
    return res.status(400).json({ error: "Liste vide" });
  }

  try {
    // 1) Vérifier que la demande existe
    const sqlReq = `SELECT * FROM internal_requests WHERE id = ?`;
    const [reqRows] = await db.query(sqlReq, [request_id]);
    
    if (reqRows.length === 0)
      return res.status(404).json({ error: "Demande introuvable" });

    const request = reqRows[0];

    // 2) Récupérer les items
    const sqlItems = `SELECT * FROM internal_request_items WHERE request_id = ?`;
    const [itemRows] = await db.query(sqlItems, [request_id]);

    for (const entry of issued) {
      const it = itemRows.find(i => i.id === entry.item_id);
      if (!it) continue;

      // 3) Update qty_issued
      const sqlUpdateItem = `
        UPDATE internal_request_items
        SET qty_issued = qty_issued + ?
        WHERE id = ?
      `;

      await db.query(sqlUpdateItem, [entry.qty_issued, entry.item_id]);

      // 4) Mouvement OUT
      const sqlMove = `
        INSERT INTO movements (article_id, warehouse_from, qty, type, user, note)
        VALUES (?, ?, ?, 'out', ?, 'Internal Request Issue')
      `;

      await db.query(sqlMove, [
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

      await db.query(sqlStock, [
        entry.qty_issued,
        it.article_id,
        request.warehouse_id
      ]);
    }

    // 6) Mettre statut fulfilled
    const sqlStatus = `
      UPDATE internal_requests SET status = 'fulfilled'
      WHERE id = ?
    `;

    await db.query(sqlStatus, [request_id]);

    res.json({ message: "Items délivrés (issue OK)", status: "fulfilled" });
  } catch (err) {
    console.error("Erreur issue items:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});


module.exports = router;

