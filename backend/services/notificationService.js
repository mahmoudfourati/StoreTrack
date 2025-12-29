const db = require("../config/db");

/**
 * Service centralisé de gestion des notifications
 * Utilisé par tous les endpoints pour créer des notifications cohérentes
 */

class NotificationService {
  /**
   * Créer une notification générique
   * @param {string} type - Type de notification
   * @param {number} target_id - ID de l'entité cible
   * @param {string} message - Message de la notification
   * @param {number|null} user_id - ID du user destinataire (null = tous)
   * @param {string} priority - Priorité: 'low', 'normal', 'high', 'urgent'
   */
  async create(type, target_id, message, user_id = null, priority = "normal") {
    try {
      const sql = `
        INSERT INTO notifications (type, target_id, message, user_id, priority, is_read)
        VALUES (?, ?, ?, ?, ?, false)
      `;

      const [result] = await db.query(sql, [
        type,
        target_id,
        message,
        user_id,
        priority,
      ]);

      return { id: result.insertId, success: true };
    } catch (error) {
      console.error("Erreur création notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stock minimum atteint
   */
  async notifyStockAlert(article_id, warehouse_id, quantity, min_quantity) {
    try {
      const [rows] = await db.query(
        `SELECT a.name as article_name, w.name as warehouse_name
         FROM articles a, warehouses w
         WHERE a.id = ? AND w.id = ?`,
        [article_id, warehouse_id]
      );

      if (rows.length === 0) return;

      const { article_name, warehouse_name } = rows[0];
      const message = `⚠️ Stock critique: ${article_name} dans ${warehouse_name} (${quantity}/${min_quantity})`;

      return await this.create(
        "stock_alert",
        article_id,
        message,
        null,
        "high"
      );
    } catch (error) {
      console.error("Erreur notifyStockAlert:", error);
    }
  }

  /**
   * Lot expirant bientôt
   */
  async notifyLotExpiring(lot_id, days_remaining, article_name) {
    const message = `⏰ Lot expirant: ${article_name} expire dans ${days_remaining} jours`;
    return await this.create("lot_expiring", lot_id, message, null, "high");
  }

  /**
   * Lot expiré
   */
  async notifyLotExpired(lot_id, article_name) {
    const message = `❌ Lot expiré: ${article_name} - Retrait immédiat requis`;
    return await this.create("lot_expired", lot_id, message, null, "urgent");
  }

  /**
   * Commande d'achat reçue
   */
  async notifyPurchaseOrderReceived(po_id, reference, supplier_name) {
    const message = `📦 Réception PO: ${reference} de ${supplier_name}`;
    return await this.create(
      "po_received",
      po_id,
      message,
      null,
      "normal"
    );
  }

  /**
   * Commande d'achat partiellement reçue
   */
  async notifyPurchaseOrderPartialReceive(
    po_id,
    reference,
    supplier_name,
    user_id = null
  ) {
    const message = `📦 Réception partielle PO: ${reference} de ${supplier_name}`;
    return await this.create(
      "po_partial_receive",
      po_id,
      message,
      user_id,
      "normal"
    );
  }

  /**
   * Expédition créée
   */
  async notifyShipmentCreated(shipment_id, reference, client_name) {
    const message = `🚚 Nouvelle expédition: ${reference} pour ${client_name}`;
    return await this.create(
      "shipment_created",
      shipment_id,
      message,
      null,
      "normal"
    );
  }

  /**
   * Expédition confirmée
   */
  async notifyShipmentConfirmed(shipment_id, reference, user_id = null) {
    const message = `✅ Expédition confirmée: ${reference}`;
    return await this.create(
      "shipment_confirmed",
      shipment_id,
      message,
      user_id,
      "normal"
    );
  }

  /**
   * Expédition expédiée
   */
  async notifyShipmentShipped(
    shipment_id,
    reference,
    tracking_number = null
  ) {
    const message = tracking_number
      ? `📮 Expédition ${reference} envoyée - Suivi: ${tracking_number}`
      : `📮 Expédition ${reference} envoyée`;
    return await this.create(
      "shipment_shipped",
      shipment_id,
      message,
      null,
      "normal"
    );
  }

  /**
   * Transfert effectué
   */
  async notifyTransferCompleted(
    transfer_id,
    article_name,
    warehouse_from_name,
    warehouse_to_name,
    qty
  ) {
    const message = `🔄 Transfert: ${qty}x ${article_name} de ${warehouse_from_name} vers ${warehouse_to_name}`;

    // Notifier les deux entrepôts
    await this.create(
      "transfer_completed",
      transfer_id,
      message,
      null,
      "normal"
    );
  }

  /**
   * Demande interne approuvée
   */
  async notifyRequestApproved(request_id, requester, approver_name) {
    const message = `✅ Demande #${request_id} approuvée par ${approver_name}`;
    return await this.create(
      "request_approved",
      request_id,
      message,
      null,
      "normal"
    );
  }

  /**
   * Demande interne rejetée
   */
  async notifyRequestRejected(request_id, requester, reason) {
    const message = `❌ Demande #${request_id} rejetée: ${reason}`;
    return await this.create(
      "request_rejected",
      request_id,
      message,
      null,
      "high"
    );
  }

  /**
   * Demande interne exécutée
   */
  async notifyRequestFulfilled(request_id, requester) {
    const message = `✅ Demande #${request_id} exécutée - Articles disponibles`;
    return await this.create(
      "request_fulfilled",
      request_id,
      message,
      null,
      "normal"
    );
  }

  /**
   * Ticket résolu
   */
  async notifyTicketResolved(ticket_id, title) {
    const message = `✅ Ticket résolu: ${title}`;
    return await this.create(
      "ticket_resolved",
      ticket_id,
      message,
      null,
      "normal"
    );
  }

  /**
   * Ajustement de stock (ticket)
   */
  async notifyStockAdjustment(
    ticket_id,
    article_name,
    adjustment_type,
    quantity
  ) {
    const types = {
      damage: "Dommage",
      loss: "Perte",
      found: "Trouvé",
      quality_issue: "Problème qualité",
    };

    const message = `🔧 Ajustement stock: ${types[adjustment_type] || adjustment_type} - ${article_name} (${quantity > 0 ? "+" : ""}${quantity})`;
    return await this.create(
      "stock_adjustment",
      ticket_id,
      message,
      null,
      "high"
    );
  }

  /**
   * Marquer notification comme lue
   */
  async markAsRead(notification_id) {
    try {
      await db.query("UPDATE notifications SET is_read = true WHERE id = ?", [
        notification_id,
      ]);
      return { success: true };
    } catch (error) {
      console.error("Erreur markAsRead:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Marquer toutes les notifications comme lues pour un user
   */
  async markAllAsRead(user_id = null) {
    try {
      const sql = user_id
        ? "UPDATE notifications SET is_read = true WHERE user_id = ? OR user_id IS NULL"
        : "UPDATE notifications SET is_read = true";

      await db.query(sql, user_id ? [user_id] : []);
      return { success: true };
    } catch (error) {
      console.error("Erreur markAllAsRead:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer notifications non lues
   */
  async getUnread(user_id = null, limit = 50) {
    try {
      const sql = user_id
        ? `SELECT * FROM notifications 
           WHERE is_read = false AND (user_id = ? OR user_id IS NULL)
           ORDER BY created_at DESC LIMIT ?`
        : `SELECT * FROM notifications 
           WHERE is_read = false
           ORDER BY created_at DESC LIMIT ?`;

      const [rows] = await db.query(
        sql,
        user_id ? [user_id, limit] : [limit]
      );
      return rows;
    } catch (error) {
      console.error("Erreur getUnread:", error);
      return [];
    }
  }

  /**
   * Compter notifications non lues
   */
  async countUnread(user_id = null) {
    try {
      const sql = user_id
        ? `SELECT COUNT(*) as count FROM notifications 
           WHERE is_read = false AND (user_id = ? OR user_id IS NULL)`
        : `SELECT COUNT(*) as count FROM notifications WHERE is_read = false`;

      const [rows] = await db.query(sql, user_id ? [user_id] : []);
      return rows[0].count;
    } catch (error) {
      console.error("Erreur countUnread:", error);
      return 0;
    }
  }
}

module.exports = new NotificationService();
