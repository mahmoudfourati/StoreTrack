const db = require("../config/db");

/**
 * Vérifie si le stock disponible est suffisant pour une opération
 * @param {number} article_id - ID de l'article
 * @param {number} warehouse_id - ID de l'entrepôt
 * @param {number} qty_needed - Quantité requise
 * @returns {Promise<number>} - Quantité disponible
 * @throws {Error} - Si stock insuffisant
 */
async function checkStockAvailability(article_id, warehouse_id, qty_needed) {
  try {
    const [rows] = await db.query(
      `SELECT s.quantity, a.name as article_name, w.name as warehouse_name
       FROM stocks s
       JOIN articles a ON s.article_id = a.id
       JOIN warehouses w ON s.warehouse_id = w.id
       WHERE s.article_id = ? AND s.warehouse_id = ?`,
      [article_id, warehouse_id]
    );

    if (rows.length === 0) {
      throw new Error(
        `Stock introuvable pour article_id=${article_id}, warehouse_id=${warehouse_id}`
      );
    }

    const available = rows[0].quantity || 0;
    const articleName = rows[0].article_name;
    const warehouseName = rows[0].warehouse_name;

    if (available < qty_needed) {
      throw new Error(
        `Stock insuffisant pour "${articleName}" dans "${warehouseName}": disponible=${available}, requis=${qty_needed}`
      );
    }

    return available;
  } catch (error) {
    throw error;
  }
}

/**
 * Vérifie le stock pour plusieurs articles
 * @param {Array} items - [{article_id, warehouse_id, qty_needed}]
 * @returns {Promise<Array>} - [{article_id, available, needed}]
 * @throws {Error} - Si au moins un article a un stock insuffisant
 */
async function checkMultipleStocksAvailability(items, warehouse_id) {
  const results = [];
  
  for (const item of items) {
    const wh_id = item.warehouse_id || warehouse_id;
    const available = await checkStockAvailability(
      item.article_id,
      wh_id,
      item.qty_needed || item.quantity
    );
    
    results.push({
      article_id: item.article_id,
      warehouse_id: wh_id,
      available,
      needed: item.qty_needed || item.quantity
    });
  }
  
  return results;
}

/**
 * Récupère le stock disponible sans validation
 * @param {number} article_id - ID de l'article
 * @param {number} warehouse_id - ID de l'entrepôt
 * @returns {Promise<number>} - Quantité disponible (0 si non trouvé)
 */
async function getStockQuantity(article_id, warehouse_id) {
  try {
    const [rows] = await db.query(
      `SELECT quantity FROM stocks WHERE article_id = ? AND warehouse_id = ?`,
      [article_id, warehouse_id]
    );
    
    return rows.length > 0 ? rows[0].quantity : 0;
  } catch (error) {
    console.error("Erreur getStockQuantity:", error);
    return 0;
  }
}

module.exports = {
  checkStockAvailability,
  checkMultipleStocksAvailability,
  getStockQuantity
};
