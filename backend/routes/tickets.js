const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================
// GET all tickets
// ==========================
router.get("/", (req, res) => {
  const sql = `
    SELECT t.*, 
           a.name AS article_name,
           w.name AS warehouse_name
    FROM tickets t
    JOIN articles a ON t.article_id = a.id
    JOIN warehouses w ON t.warehouse_id = w.id
    ORDER BY t.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Erreur GET tickets:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(rows);
  });
});

// ==========================
// GET one ticket + updates
// ==========================
router.get("/:id", (req, res) => {
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

  db.query(sqlTicket, [id], (err, ticketRows) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    if (ticketRows.length === 0)
      return res.status(404).json({ error: "Ticket introuvable" });

    const ticket = ticketRows[0];

    const sqlUpdates = `
      SELECT * FROM ticket_updates
      WHERE ticket_id = ?
      ORDER BY created_at DESC
    `;

    db.query(sqlUpdates, [id], (err2, updatesRows) => {
      if (err2)
        return res.status(500).json({ error: "Erreur updates serveur" });

      ticket.updates = updatesRows;
      res.json(ticket);
    });
  });
});

// ==========================
// CREATE ticket
// ==========================
router.post("/", (req, res) => {
  const { article_id, warehouse_id, reporter, description } = req.body;

  if (!article_id || !warehouse_id || !reporter) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  const sql = `
    INSERT INTO tickets (article_id, warehouse_id, reporter, description)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [article_id, warehouse_id, reporter, description || null], (err, result) => {
    if (err) {
      console.error("Erreur CREATE ticket:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    res.status(201).json({
      message: "Ticket créé",
      id: result.insertId
    });
  });
});

// ==========================
// ADD update/comment to ticket
// ==========================
router.post("/:id/update", (req, res) => {
  const ticket_id = req.params.id;
  const { user, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message requis" });
  }

  const sql = `
    INSERT INTO ticket_updates (ticket_id, user, message)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [ticket_id, user || null, message], (err) => {
    if (err) {
      console.error("Erreur ADD update:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    res.json({ message: "Update ajouté" });
  });
});

// ==========================
// UPDATE ticket status
// ==========================
router.put("/:id/status", (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  const allowed = ["open", "in_progress", "resolved", "discarded"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  const sql = `UPDATE tickets SET status = ? WHERE id = ?`;

  db.query(sql, [status, id], (err) => {
    if (err) {
      console.error("Erreur UPDATE statut:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    res.json({ message: "Statut mis à jour", status });
  });
});

module.exports = router;
