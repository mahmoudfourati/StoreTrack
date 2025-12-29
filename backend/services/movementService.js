// backend/services/movementService.js
const db = require("../config/db");

async function createMovement({ article_id, warehouse_from = null, warehouse_to = null, qty = 0, type, user = null, note = null }) {
  if (!article_id || !qty || !type) throw new Error("article_id, qty et type requis");

  try {
    // Insert movement
    const sqlInsert = `INSERT INTO movements (article_id, warehouse_from, warehouse_to, qty, type, user, note) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const [res] = await db.query(sqlInsert, [article_id, warehouse_from, warehouse_to, qty, type, user, note]);
    const movementId = res.insertId;

    // Ensure stock exists
    async function ensureStock(articleId, warehouseId) {
      if (!warehouseId) return;
      const [rows] = await db.query(`SELECT id FROM stocks WHERE article_id = ? AND warehouse_id = ?`, [articleId, warehouseId]);
      if (rows.length === 0) {
        await db.query(`INSERT INTO stocks (article_id, warehouse_id, quantity) VALUES (?, ?, 0)`, [articleId, warehouseId]);
      }
    }

    // Update stocks based on type
    if (type === "in") {
      await ensureStock(article_id, warehouse_to);
      await db.query(`UPDATE stocks SET quantity = quantity + ? WHERE article_id = ? AND warehouse_id = ?`, [qty, article_id, warehouse_to]);
    } else if (type === "out") {
      await ensureStock(article_id, warehouse_from);
      await db.query(`UPDATE stocks SET quantity = quantity - ? WHERE article_id = ? AND warehouse_id = ?`, [qty, article_id, warehouse_from]);
    } else if (type === "transfer") {
      await ensureStock(article_id, warehouse_from);
      await ensureStock(article_id, warehouse_to);
      await db.query(`UPDATE stocks SET quantity = quantity - ? WHERE article_id = ? AND warehouse_id = ?`, [qty, article_id, warehouse_from]);
      await db.query(`UPDATE stocks SET quantity = quantity + ? WHERE article_id = ? AND warehouse_id = ?`, [qty, article_id, warehouse_to]);
    }

    // Check alert
    const warehouseToCheck = (type === "in" || type === "transfer") ? warehouse_to : warehouse_from;
    if (warehouseToCheck) {
      const [alertRows] = await db.query(
        `SELECT * FROM stocks WHERE article_id = ? AND warehouse_id = ? AND min_quantity IS NOT NULL AND quantity <= min_quantity`,
        [article_id, warehouseToCheck]
      );
      if (alertRows.length > 0) {
        console.log("⚠️ Alerte stock minimum:", alertRows[0]);
        const message = `Stock critique pour article_id ${article_id} en warehouse ${warehouseToCheck}`;
        await db.query(`INSERT INTO notifications (type, target_id, message) VALUES (?, ?, ?)`, ['stock_alert', null, message]).catch(err => console.error("Erreur notification:", err));
      }
    }

    return { movementId };
  } catch (err) {
    throw err;
  }
}

module.exports = { createMovement };

