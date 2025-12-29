-- ============================================
-- MIGRATION: Contraintes et optimisations base de données
-- TODO 8 & TODO 9
-- ============================================

-- ====================
-- TODO 8: Contraintes CHECK et Indexes
-- ====================

-- 1. CONTRAINTES CHECK pour intégrité des données

-- Stocks: quantité positive
ALTER TABLE stocks
  ADD CONSTRAINT IF NOT EXISTS chk_stocks_quantity_positive 
  CHECK (quantity >= 0);

ALTER TABLE stocks
  ADD CONSTRAINT IF NOT EXISTS chk_stocks_min_quantity_positive 
  CHECK (min_quantity IS NULL OR min_quantity >= 0);

-- Movements: quantité positive
ALTER TABLE movements
  ADD CONSTRAINT IF NOT EXISTS chk_movements_qty_positive 
  CHECK (qty > 0);

-- Purchase Order Items: quantités valides
ALTER TABLE purchase_order_items
  ADD CONSTRAINT IF NOT EXISTS chk_po_items_qty_ordered_positive 
  CHECK (qty_ordered > 0);

ALTER TABLE purchase_order_items
  ADD CONSTRAINT IF NOT EXISTS chk_po_items_qty_received_valid 
  CHECK (qty_received >= 0 AND qty_received <= qty_ordered);

-- Shipment Items: quantité positive
ALTER TABLE shipment_items
  ADD CONSTRAINT IF NOT EXISTS chk_shipment_items_quantity_positive 
  CHECK (qty_ordered > 0);

ALTER TABLE shipment_items
  ADD CONSTRAINT IF NOT EXISTS chk_shipment_items_qty_dispatched_valid 
  CHECK (qty_dispatched >= 0 AND qty_dispatched <= qty_ordered);

-- Lots: quantité et dates valides
ALTER TABLE lots
  ADD CONSTRAINT IF NOT EXISTS chk_lots_quantity_positive 
  CHECK (quantity >= 0);

ALTER TABLE lots
  ADD CONSTRAINT IF NOT EXISTS chk_lots_dates_valid 
  CHECK (expiration_date IS NULL OR manufacturing_date IS NULL OR expiration_date >= manufacturing_date);

-- Articles: prix et stock positifs
ALTER TABLE articles
  ADD CONSTRAINT IF NOT EXISTS chk_articles_price_positive 
  CHECK (price >= 0);

ALTER TABLE articles
  ADD CONSTRAINT IF NOT EXISTS chk_articles_stock_positive 
  CHECK (stock IS NULL OR stock >= 0);

ALTER TABLE articles
  ADD CONSTRAINT IF NOT EXISTS chk_articles_min_stock_positive 
  CHECK (min_stock IS NULL OR min_stock >= 0);

-- Transfers: quantité positive et entrepôts différents
ALTER TABLE transfers
  ADD CONSTRAINT IF NOT EXISTS chk_transfers_qty_positive 
  CHECK (qty > 0);

-- Internal Request Items: quantité positive
ALTER TABLE internal_request_items
  ADD CONSTRAINT IF NOT EXISTS chk_request_items_qty_positive 
  CHECK (qty_requested > 0);

ALTER TABLE internal_request_items
  ADD CONSTRAINT IF NOT EXISTS chk_request_items_qty_issued_valid 
  CHECK (qty_issued >= 0 AND qty_issued <= qty_requested);

-- ====================
-- 2. INDEXES POUR PERFORMANCES
-- ====================

-- Stocks: lookup rapide article+warehouse
CREATE INDEX IF NOT EXISTS idx_stocks_article_warehouse ON stocks(article_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stocks_quantity ON stocks(quantity);
CREATE INDEX IF NOT EXISTS idx_stocks_warehouse ON stocks(warehouse_id);

-- Movements: recherche par article, date, type
CREATE INDEX IF NOT EXISTS idx_movements_article ON movements(article_id);
CREATE INDEX IF NOT EXISTS idx_movements_date_desc ON movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_warehouse_from ON movements(warehouse_from);
CREATE INDEX IF NOT EXISTS idx_movements_warehouse_to ON movements(warehouse_to);

-- Lots: recherche par expiration, statut, article
CREATE INDEX IF NOT EXISTS idx_lots_expiration ON lots(expiration_date) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_lots_article_warehouse ON lots(article_id, warehouse_id, status);
CREATE INDEX IF NOT EXISTS idx_lots_status ON lots(status);
CREATE INDEX IF NOT EXISTS idx_lots_warehouse ON lots(warehouse_id);

-- Lot Movements: traçabilité
CREATE INDEX IF NOT EXISTS idx_lot_movements_lot ON lot_movements(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_movements_movement ON lot_movements(movement_id);
CREATE INDEX IF NOT EXISTS idx_lot_movements_created ON lot_movements(created_at DESC);

-- Notifications: lecture rapide non-lues
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority, is_read);

-- Purchase Orders: recherche par statut, fournisseur, date
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created ON purchase_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_warehouse ON purchase_orders(warehouse_id);

-- Shipments: recherche par statut, client, entrepôt
CREATE INDEX IF NOT EXISTS idx_shipments_client ON shipments(client_id);
CREATE INDEX IF NOT EXISTS idx_shipments_warehouse ON shipments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_shipments_created ON shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_shipped_at ON shipments(shipped_at DESC);

-- Transfers: recherche par entrepôts, article
CREATE INDEX IF NOT EXISTS idx_transfers_article ON transfers(article_id);
CREATE INDEX IF NOT EXISTS idx_transfers_warehouse_from ON transfers(warehouse_from);
CREATE INDEX IF NOT EXISTS idx_transfers_warehouse_to ON transfers(warehouse_to);
CREATE INDEX IF NOT EXISTS idx_transfers_created ON transfers(created_at DESC);

-- Internal Requests: recherche par statut, entrepôt
CREATE INDEX IF NOT EXISTS idx_internal_requests_warehouse ON internal_requests(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_internal_requests_created ON internal_requests(created_at DESC);

-- Tickets: recherche par statut, article
CREATE INDEX IF NOT EXISTS idx_tickets_article ON tickets(article_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);

-- Articles: recherche par SKU, catégorie
CREATE INDEX IF NOT EXISTS idx_articles_sku ON articles(sku);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created ON articles(created_at DESC);

-- ====================
-- 3. TABLE AUDIT_LOGS
-- ====================

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  table_name VARCHAR(50) NOT NULL,
  record_id INT NOT NULL,
  action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  old_value JSON,
  new_value JSON,
  user_id INT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_audit_table_record (table_name, record_id),
  INDEX idx_audit_created_at (created_at DESC),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================
-- 4. TRIGGERS POUR AUDIT (exemples clés)
-- ====================

-- Trigger: Audit modifications articles
DROP TRIGGER IF EXISTS audit_articles_update;

DELIMITER $$

CREATE TRIGGER audit_articles_update
AFTER UPDATE ON articles
FOR EACH ROW
BEGIN
  IF OLD.price != NEW.price 
     OR OLD.stock != NEW.stock 
     OR OLD.min_stock != NEW.min_stock 
     OR OLD.name != NEW.name THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_value, new_value)
    VALUES (
      'articles', 
      NEW.id, 
      'UPDATE',
      JSON_OBJECT(
        'price', OLD.price, 
        'stock', OLD.stock, 
        'min_stock', OLD.min_stock,
        'name', OLD.name
      ),
      JSON_OBJECT(
        'price', NEW.price, 
        'stock', NEW.stock, 
        'min_stock', NEW.min_stock,
        'name', NEW.name
      )
    );
  END IF;
END$$

DELIMITER ;

-- Trigger: Audit modifications stocks (quantité)
DROP TRIGGER IF EXISTS audit_stocks_update;

DELIMITER $$

CREATE TRIGGER audit_stocks_update
AFTER UPDATE ON stocks
FOR EACH ROW
BEGIN
  IF OLD.quantity != NEW.quantity THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_value, new_value)
    VALUES (
      'stocks', 
      NEW.id, 
      'UPDATE',
      JSON_OBJECT(
        'quantity', OLD.quantity,
        'article_id', OLD.article_id,
        'warehouse_id', OLD.warehouse_id
      ),
      JSON_OBJECT(
        'quantity', NEW.quantity,
        'article_id', NEW.article_id,
        'warehouse_id', NEW.warehouse_id
      )
    );
  END IF;
END$$

DELIMITER ;

-- ====================
-- TODO 9: TICKETS avec ajustements stock
-- ====================

-- 1. Ajouter colonnes pour ajustements stock
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS quantity_affected INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS adjustment_type ENUM('damage', 'loss', 'found', 'quality_issue') DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS movement_id INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD CONSTRAINT IF NOT EXISTS fk_tickets_movement 
    FOREIGN KEY (movement_id) REFERENCES movements(id) ON DELETE SET NULL;

-- 2. Index pour tickets
CREATE INDEX IF NOT EXISTS idx_tickets_adjustment_type ON tickets(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_tickets_movement ON tickets(movement_id);

-- ====================
-- 5. VUES UTILES POUR ANALYTICS
-- ====================

-- Vue: Stock global par article (tous entrepôts)
CREATE OR REPLACE VIEW stock_global AS
SELECT 
  a.id as article_id,
  a.name as article_name,
  a.sku,
  a.category,
  SUM(s.quantity) as total_quantity,
  COUNT(s.id) as num_warehouses,
  MIN(s.quantity) as min_warehouse_qty,
  MAX(s.quantity) as max_warehouse_qty,
  a.min_stock as global_min_stock
FROM articles a
LEFT JOIN stocks s ON a.id = s.article_id
GROUP BY a.id, a.name, a.sku, a.category, a.min_stock;

-- Vue: Articles sous stock minimum
CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT 
  a.id as article_id,
  a.name as article_name,
  a.sku,
  w.id as warehouse_id,
  w.name as warehouse_name,
  s.quantity as current_quantity,
  s.min_quantity as min_quantity,
  (s.min_quantity - s.quantity) as deficit
FROM stocks s
JOIN articles a ON s.article_id = a.id
JOIN warehouses w ON s.warehouse_id = w.id
WHERE s.quantity <= s.min_quantity
ORDER BY (s.min_quantity - s.quantity) DESC;

-- Vue: Mouvements récents (7 derniers jours)
CREATE OR REPLACE VIEW recent_movements AS
SELECT 
  m.*,
  a.name as article_name,
  a.sku,
  wf.name as warehouse_from_name,
  wt.name as warehouse_to_name,
  DATE(m.created_at) as movement_date
FROM movements m
JOIN articles a ON m.article_id = a.id
LEFT JOIN warehouses wf ON m.warehouse_from = wf.id
LEFT JOIN warehouses wt ON m.warehouse_to = wt.id
WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY m.created_at DESC;

-- ====================
-- FIN DE MIGRATION
-- ====================

-- Afficher résumé
SELECT 
  'Contraintes CHECK' as type, 
  COUNT(*) as count 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE CONSTRAINT_SCHEMA = DATABASE() 
  AND CONSTRAINT_TYPE = 'CHECK'
UNION ALL
SELECT 
  'Indexes' as type, 
  COUNT(DISTINCT INDEX_NAME) as count 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE()
UNION ALL
SELECT 
  'Audit Logs' as type, 
  COUNT(*) as count 
FROM audit_logs
UNION ALL
SELECT 
  'Triggers' as type, 
  COUNT(*) as count 
FROM INFORMATION_SCHEMA.TRIGGERS 
WHERE TRIGGER_SCHEMA = DATABASE();
