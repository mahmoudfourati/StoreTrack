const db = require("../config/db");

/**
 * Service de gestion des lots
 * Fournit les fonctions métier pour la gestion des lots, FEFO, alertes d'expiration
 */
class LotService {
  /**
   * Créer un nouveau lot
   * @param {Object} lotData - Données du lot
   * @returns {Promise<Object>} - Lot créé avec ID
   */
  async createLot(lotData) {
    const {
      lot_number,
      article_id,
      warehouse_id,
      quantity = 0,
      manufacturing_date,
      expiration_date,
      supplier_batch,
      notes,
    } = lotData;

    if (!lot_number || !article_id || !warehouse_id) {
      throw new Error("lot_number, article_id et warehouse_id requis");
    }

    const sql = `
      INSERT INTO lots (
        lot_number, article_id, warehouse_id, quantity, 
        manufacturing_date, expiration_date, supplier_batch, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    try {
      const [result] = await db.query(sql, [
        lot_number,
        article_id,
        warehouse_id,
        quantity,
        manufacturing_date || null,
        expiration_date || null,
        supplier_batch || null,
        notes || null,
      ]);

      return { id: result.insertId, lot_number, quantity };
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        throw new Error(`Le numéro de lot ${lot_number} existe déjà`);
      }
      throw err;
    }
  }

  /**
   * Générer un numéro de lot unique
   * Format: LOT-YYYYMMDD-XXXXX
   * @returns {Promise<string>} - Numéro de lot unique
   */
  async generateLotNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    
    // Trouver le dernier lot du jour
    const [rows] = await db.query(
      "SELECT lot_number FROM lots WHERE lot_number LIKE ? ORDER BY lot_number DESC LIMIT 1",
      [`LOT-${dateStr}-%`]
    );

    let sequence = 1;
    if (rows.length > 0) {
      const lastLot = rows[0].lot_number;
      const lastSeq = parseInt(lastLot.split("-")[2]);
      sequence = lastSeq + 1;
    }

    return `LOT-${dateStr}-${sequence.toString().padStart(5, "0")}`;
  }

  /**
   * Trouver les lots pour un article dans un entrepôt
   * @param {number} article_id - ID de l'article
   * @param {number} warehouse_id - ID de l'entrepôt
   * @param {string} status - Statut du lot (active, expired, etc.)
   * @returns {Promise<Array>} - Liste des lots
   */
  async findLotsForArticle(article_id, warehouse_id, status = "active") {
    const sql = `
      SELECT l.*, a.name AS article_name, a.sku, w.name AS warehouse_name
      FROM lots l
      JOIN articles a ON l.article_id = a.id
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.article_id = ? AND l.warehouse_id = ? AND l.status = ?
      ORDER BY l.expiration_date ASC, l.manufacturing_date ASC
    `;

    const [rows] = await db.query(sql, [article_id, warehouse_id, status]);
    return rows;
  }

  /**
   * Sélectionner les lots pour une expédition (stratégie FEFO)
   * FEFO = First Expired First Out (premier expiré, premier sorti)
   * @param {number} article_id - ID de l'article
   * @param {number} warehouse_id - ID de l'entrepôt
   * @param {number} qty_needed - Quantité nécessaire
   * @param {string} strategy - 'FEFO' ou 'FIFO'
   * @returns {Promise<Array>} - Liste des lots à utiliser [{lot_id, lot_number, quantity}]
   */
  async pickLotsForShipment(article_id, warehouse_id, qty_needed, strategy = "FEFO") {
    const orderBy = strategy === "FEFO" 
      ? "l.expiration_date ASC, l.manufacturing_date ASC" 
      : "l.received_date ASC, l.manufacturing_date ASC";

    const sql = `
      SELECT l.id, l.lot_number, l.quantity, l.expiration_date, l.manufacturing_date
      FROM lots l
      WHERE l.article_id = ? 
        AND l.warehouse_id = ? 
        AND l.status = 'active' 
        AND l.quantity > 0
      ORDER BY ${orderBy}
    `;

    const [lots] = await db.query(sql, [article_id, warehouse_id]);

    if (lots.length === 0) {
      throw new Error(`Aucun lot disponible pour l'article ${article_id} dans l'entrepôt ${warehouse_id}`);
    }

    const picked = [];
    let remaining = qty_needed;

    for (const lot of lots) {
      if (remaining === 0) break;

      const toTake = Math.min(lot.quantity, remaining);
      picked.push({
        lot_id: lot.id,
        lot_number: lot.lot_number,
        quantity: toTake,
        expiration_date: lot.expiration_date,
      });
      remaining -= toTake;
    }

    if (remaining > 0) {
      throw new Error(
        `Stock insuffisant: disponible=${qty_needed - remaining}, requis=${qty_needed}`
      );
    }

    return picked;
  }

  /**
   * Mettre à jour la quantité d'un lot
   * @param {number} lot_id - ID du lot
   * @param {number} qty_change - Changement de quantité (+ ou -)
   * @param {number} movement_id - ID du mouvement associé
   * @returns {Promise<Object>} - Lot mis à jour
   */
  async updateLotQuantity(lot_id, qty_change, movement_id = null) {
    // 1. Récupérer le lot actuel
    const [rows] = await db.query("SELECT * FROM lots WHERE id = ?", [lot_id]);
    if (rows.length === 0) {
      throw new Error(`Lot ${lot_id} introuvable`);
    }

    const lot = rows[0];
    const newQuantity = lot.quantity + qty_change;

    if (newQuantity < 0) {
      throw new Error(`Quantité insuffisante dans le lot ${lot.lot_number}: disponible=${lot.quantity}, requis=${-qty_change}`);
    }

    // 2. Mettre à jour le lot
    const newStatus = newQuantity === 0 ? "depleted" : lot.status;
    await db.query(
      "UPDATE lots SET quantity = ?, status = ? WHERE id = ?",
      [newQuantity, newStatus, lot_id]
    );

    // 3. Enregistrer dans lot_movements
    if (movement_id) {
      await db.query(
        "INSERT INTO lot_movements (movement_id, article_id, lot_number, quantity, expiration_date) VALUES (?, ?, ?, ?, ?)",
        [movement_id, lot.article_id, lot.lot_number, Math.abs(qty_change), lot.expiration_date]
      );
    }

    return { lot_id, lot_number: lot.lot_number, old_quantity: lot.quantity, new_quantity: newQuantity };
  }

  /**
   * Vérifier les lots qui expirent bientôt
   * @param {number} days - Nombre de jours (par défaut 30)
   * @returns {Promise<Array>} - Liste des lots expirant
   */
  async checkExpiringLots(days = 30) {
    const sql = `
      SELECT 
        l.id, l.lot_number, l.article_id, a.name AS article_name, a.sku,
        l.warehouse_id, w.name AS warehouse_name,
        l.quantity, l.expiration_date,
        DATEDIFF(l.expiration_date, CURDATE()) AS days_until_expiration
      FROM lots l
      JOIN articles a ON l.article_id = a.id
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.status = 'active' 
        AND l.expiration_date IS NOT NULL
        AND l.quantity > 0
        AND DATEDIFF(l.expiration_date, CURDATE()) BETWEEN 0 AND ?
      ORDER BY l.expiration_date ASC
    `;

    const [rows] = await db.query(sql, [days]);
    return rows;
  }

  /**
   * Marquer les lots expirés
   * @returns {Promise<Object>} - Nombre de lots marqués et détails
   */
  async markExpiredLots() {
    // 1. Trouver les lots expirés qui sont encore actifs
    const [expiredLots] = await db.query(`
      SELECT id, lot_number, article_id, warehouse_id, quantity, expiration_date
      FROM lots
      WHERE status = 'active' 
        AND expiration_date IS NOT NULL
        AND expiration_date < CURDATE()
    `);

    if (expiredLots.length === 0) {
      return { marked: 0, lots: [] };
    }

    // 2. Marquer comme expirés
    const lotIds = expiredLots.map((l) => l.id);
    await db.query(`UPDATE lots SET status = 'expired' WHERE id IN (?)`, [lotIds]);

    // 3. Logger dans expired_lots_log
    for (const lot of expiredLots) {
      await db.query(
        `INSERT INTO expired_lots_log (lot_id, lot_number, article_id, warehouse_id, quantity_expired, expiration_date, action_taken)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [lot.id, lot.lot_number, lot.article_id, lot.warehouse_id, lot.quantity, lot.expiration_date]
      );
    }

    return { marked: expiredLots.length, lots: expiredLots };
  }

  /**
   * Obtenir les statistiques des lots
   * @returns {Promise<Object>} - Statistiques globales
   */
  async getStats() {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) AS total_lots,
        SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_lots,
        SUM(CASE WHEN status='expired' THEN 1 ELSE 0 END) AS expired_lots,
        SUM(CASE WHEN status='depleted' THEN 1 ELSE 0 END) AS depleted_lots,
        SUM(quantity) AS total_quantity,
        COUNT(CASE WHEN expiration_date IS NOT NULL AND DATEDIFF(expiration_date, CURDATE()) BETWEEN 0 AND 7 THEN 1 END) AS expiring_7days,
        COUNT(CASE WHEN expiration_date IS NOT NULL AND DATEDIFF(expiration_date, CURDATE()) BETWEEN 0 AND 30 THEN 1 END) AS expiring_30days
      FROM lots
    `);

    return stats[0] || {};
  }

  /**
   * Obtenir l'historique des mouvements d'un lot
   * @param {number} lot_id - ID du lot
   * @returns {Promise<Array>} - Historique des mouvements
   */
  async getLotHistory(lot_id) {
    const sql = `
      SELECT 
        lm.*, 
        m.type, m.qty, m.note, m.created_at AS movement_date,
        m.warehouse_from, m.warehouse_to,
        w1.name AS warehouse_from_name,
        w2.name AS warehouse_to_name
      FROM lot_movements lm
      JOIN movements m ON lm.movement_id = m.id
      LEFT JOIN warehouses w1 ON m.warehouse_from = w1.id
      LEFT JOIN warehouses w2 ON m.warehouse_to = w2.id
      WHERE lm.lot_id = ?
      ORDER BY lm.created_at DESC
    `;

    const [rows] = await db.query(sql, [lot_id]);
    return rows;
  }

  /**
   * Rechercher des lots avec filtres
   * @param {Object} filters - Filtres de recherche
   * @returns {Promise<Array>} - Lots trouvés
   */
  async searchLots(filters = {}) {
    let sql = `
      SELECT 
        l.*, 
        a.name AS article_name, 
        a.sku,
        w.name AS warehouse_name,
        DATEDIFF(l.expiration_date, CURDATE()) AS days_until_expiration
      FROM lots l
      JOIN articles a ON l.article_id = a.id
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.article_id) {
      sql += " AND l.article_id = ?";
      params.push(filters.article_id);
    }

    if (filters.warehouse_id) {
      sql += " AND l.warehouse_id = ?";
      params.push(filters.warehouse_id);
    }

    if (filters.status) {
      sql += " AND l.status = ?";
      params.push(filters.status);
    }

    if (filters.lot_number) {
      sql += " AND l.lot_number LIKE ?";
      params.push(`%${filters.lot_number}%`);
    }

    if (filters.expiring_days) {
      sql += " AND l.expiration_date IS NOT NULL AND DATEDIFF(l.expiration_date, CURDATE()) BETWEEN 0 AND ?";
      params.push(filters.expiring_days);
    }

    sql += " ORDER BY l.expiration_date ASC, l.created_at DESC";

    if (filters.limit) {
      sql += " LIMIT ?";
      params.push(parseInt(filters.limit));
    }

    const [rows] = await db.query(sql, params);
    return rows;
  }
}

module.exports = new LotService();
