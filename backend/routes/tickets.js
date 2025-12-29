const express = require("express");
const router = express.Router();
const db = require("../config/db");
const notificationService = require("../services/notificationService");

// ==========================
// GET all tickets
// ==========================
router.get("/", async (req, res) => {
  const sql = `
    SELECT t.*, 
           a.name AS article_name,
           w.name AS warehouse_name
    FROM tickets t
    JOIN articles a ON t.article_id = a.id
    JOIN warehouses w ON t.warehouse_id = w.id
    ORDER BY t.created_at DESC
  `;

  try {
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET tickets:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// GET one ticket + updates
// ==========================
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  const sqlTicket = `
    SELECT t.*, 
           a.name AS article_name,
           w.name AS warehouse_name
    FROM tickets t
    JOIN articles a ON t.article_id = a.id
    JOIN warehouses w ON t.warehouse_id = w.id
    WHERE t.id = ?
  `;

  try {
    const [ticketRows] = await db.query(sqlTicket, [id]);
    if (ticketRows.length === 0)
      return res.status(404).json({ error: "Ticket introuvable" });

    const ticket = ticketRows[0];

    const sqlUpdates = `
      SELECT * FROM ticket_updates
      WHERE ticket_id = ?
      ORDER BY created_at DESC
    `;

    const [updatesRows] = await db.query(sqlUpdates, [id]);
    ticket.updates = updatesRows;
    res.json(ticket);
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// CREATE ticket
// ==========================
router.post("/", async (req, res) => {
  const { article_id, warehouse_id, reporter, description } = req.body;

  if (!article_id || !warehouse_id || !reporter) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  const sql = `
    INSERT INTO tickets (article_id, warehouse_id, reporter, description)
    VALUES (?, ?, ?, ?)
  `;

  try {
    const [result] = await db.query(sql, [article_id, warehouse_id, reporter, description || null]);
    res.status(201).json({
      message: "Ticket créé",
      id: result.insertId
    });
  } catch (err) {
    console.error("Erreur CREATE ticket:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// ADD update/comment to ticket
// ==========================
router.post("/:id/update", async (req, res) => {
  const ticket_id = req.params.id;
  const { user, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message requis" });
  }

  const sql = `
    INSERT INTO ticket_updates (ticket_id, user, message)
    VALUES (?, ?, ?)
  `;

  try {
    await db.query(sql, [ticket_id, user || null, message]);
    res.json({ message: "Update ajouté" });
  } catch (err) {
    console.error("Erreur ADD update:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// UPDATE ticket (generic)
// ==========================
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status requis" });
  }

  const allowed = ["open", "in_progress", "resolved", "discarded"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  const sql = `UPDATE tickets SET status = ? WHERE id = ?`;

  try {
    await db.query(sql, [status, id]);
    res.json({ message: "Statut mis à jour", status });
  } catch (err) {
    console.error("Erreur UPDATE ticket:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// UPDATE ticket status
// ==========================
router.put("/:id/status", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  const allowed = ["open", "in_progress", "resolved", "discarded"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  const sql = `UPDATE tickets SET status = ? WHERE id = ?`;

  try {
    await db.query(sql, [status, id]);
    res.json({ message: "Statut mis à jour", status });
  } catch (err) {
    console.error("Erreur UPDATE statut:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================
// RESOLVE ticket avec ajustement stock (TODO 9)
// ==========================
router.post("/:id/resolve", async (req, res) => {
  const id = req.params.id;
  const { 
    resolution, 
    adjustment_type, 
    quantity_affected, 
    user,
    resolution_notes 
  } = req.body;

  try {
    // 1. Récupérer le ticket
    const [ticketRows] = await db.query(
      `SELECT t.*, a.name as article_name, w.name as warehouse_name
       FROM tickets t
       JOIN articles a ON t.article_id = a.id
       JOIN warehouses w ON t.warehouse_id = w.id
       WHERE t.id = ?`,
      [id]
    );

    if (ticketRows.length === 0) {
      return res.status(404).json({ error: "Ticket introuvable" });
    }

    const ticket = ticketRows[0];

    if (ticket.status === "resolved") {
      return res.status(400).json({ error: "Ticket déjà résolu" });
    }

    let movementId = null;

    // 2. Si ajustement de stock nécessaire
    if (adjustment_type && quantity_affected) {
      const qty = parseInt(quantity_affected);

      if (qty === 0) {
        return res.status(400).json({ error: "Quantité doit être non nulle" });
      }

      // Déterminer le type de mouvement
      let movementType, warehouseFrom, warehouseTo;

      if (adjustment_type === "found") {
        // Trouvé = entrée (IN)
        movementType = "in";
        warehouseFrom = null;
        warehouseTo = ticket.warehouse_id;
      } else {
        // Damage, loss, quality_issue = sortie (OUT)
        movementType = "out";
        warehouseFrom = ticket.warehouse_id;
        warehouseTo = null;
      }

      // Créer mouvement
      const sqlMove = `
        INSERT INTO movements (article_id, warehouse_from, warehouse_to, qty, type, user, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const note = `Ticket #${id} - ${adjustment_type}: ${ticket.article_name}${resolution_notes ? " - " + resolution_notes : ""}`;

      const [moveResult] = await db.query(sqlMove, [
        ticket.article_id,
        warehouseFrom,
        warehouseTo,
        Math.abs(qty),
        movementType,
        user || null,
        note,
      ]);

      movementId = moveResult.insertId;

      // Mettre à jour le stock
      if (adjustment_type === "found") {
        // Augmenter le stock
        await db.query(
          `UPDATE stocks SET quantity = quantity + ? 
           WHERE article_id = ? AND warehouse_id = ?`,
          [Math.abs(qty), ticket.article_id, ticket.warehouse_id]
        );
      } else {
        // Diminuer le stock
        await db.query(
          `UPDATE stocks SET quantity = quantity - ? 
           WHERE article_id = ? AND warehouse_id = ?`,
          [Math.abs(qty), ticket.article_id, ticket.warehouse_id]
        );
      }

      // Notification ajustement
      await notificationService.notifyStockAdjustment(
        id,
        ticket.article_name,
        adjustment_type,
        adjustment_type === "found" ? qty : -qty
      );
    }

    // 3. Mettre à jour le ticket
    const sqlUpdateTicket = `
      UPDATE tickets 
      SET status = 'resolved',
          quantity_affected = ?,
          adjustment_type = ?,
          movement_id = ?,
          resolution_notes = ?
      WHERE id = ?
    `;

    await db.query(sqlUpdateTicket, [
      quantity_affected || null,
      adjustment_type || null,
      movementId,
      resolution_notes || resolution || null,
      id,
    ]);

    // 4. Ajouter un update
    if (resolution) {
      await db.query(
        `INSERT INTO ticket_updates (ticket_id, user, message)
         VALUES (?, ?, ?)`,
        [id, user || null, `Résolu: ${resolution}`]
      );
    }

    // Notification résolution
    await notificationService.notifyTicketResolved(id, ticket.article_name);

    res.json({
      message: "Ticket résolu avec succès",
      status: "resolved",
      adjustment_applied: !!adjustment_type,
      movement_id: movementId,
    });
  } catch (err) {
    console.error("Erreur RESOLVE ticket:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
