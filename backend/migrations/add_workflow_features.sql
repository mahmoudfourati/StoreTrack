-- ============================================
-- MIGRATION: Ajout des fonctionnalités workflow
-- TODO 4 & TODO 5
-- Version incrémentale (vérifie les colonnes existantes)
-- ============================================

-- ====================
-- TODO 4: Workflow complet SHIPMENTS
-- ====================

-- 1. Modifier statuts shipments pour workflow complet
ALTER TABLE shipments 
  MODIFY COLUMN status ENUM(
    'draft', 
    'pending', 
    'confirmed', 
    'picked', 
    'packed', 
    'shipped', 
    'partially_dispatched',
    'dispatched', 
    'delivered', 
    'cancelled'
  ) DEFAULT 'pending';

-- 2. Ajouter colonnes workflow (si elles n'existent pas déjà)
SET @dbname = DATABASE();
SET @tablename = "shipments";
SET @columnname = "tracking_number";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(100) DEFAULT NULL")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "carrier";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(100) DEFAULT NULL")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "weight_kg";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " DECIMAL(10,2) DEFAULT NULL")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "num_packages";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT DEFAULT 1")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ====================
-- TODO 5: Workflow INTERNAL REQUESTS avec approbation
-- ====================

-- 1. Modifier enum status pour inclure nouveaux états
ALTER TABLE internal_requests
  MODIFY COLUMN status ENUM(
    'pending', 
    'approved', 
    'rejected', 
    'fulfilled', 
    'cancelled'
  ) DEFAULT 'pending';

-- 2. Ajouter colonnes fulfilled et rejection_reason
SET @tablename = "internal_requests";
SET @columnname = "fulfilled_by";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT DEFAULT NULL, ADD CONSTRAINT fk_requests_fulfilled_by FOREIGN KEY (fulfilled_by) REFERENCES users(id)")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "fulfilled_at";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TIMESTAMP NULL")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "rejection_reason";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TEXT NULL")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ====================
-- Indexes pour performances
-- ====================

SET @tablename = "shipments";
SET @indexname = "idx_shipments_status";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND INDEX_NAME = @indexname
  ) > 0,
  "SELECT 1",
  CONCAT("CREATE INDEX ", @indexname, " ON ", @tablename, "(status)")
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- ====================
-- Vue pour tableau de bord workflow
-- ====================

CREATE OR REPLACE VIEW shipments_workflow_summary AS
SELECT 
  status,
  COUNT(*) as count,
  SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as last_7_days
FROM shipments
WHERE status != 'cancelled'
GROUP BY status;

CREATE OR REPLACE VIEW pending_approvals AS
SELECT 
  ir.*,
  w.name as warehouse_name,
  COUNT(iri.id) as items_count
FROM internal_requests ir
JOIN warehouses w ON ir.warehouse_id = w.id
LEFT JOIN internal_request_items iri ON ir.id = iri.request_id
WHERE ir.status = 'pending'
GROUP BY ir.id
ORDER BY ir.created_at ASC;

-- ====================
-- Table pour historique des statuts
-- ====================

CREATE TABLE IF NOT EXISTS shipment_status_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shipment_id INT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by INT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id),
  INDEX idx_shipment_id (shipment_id),
  INDEX idx_changed_at (changed_at)
);

-- ====================
-- Trigger pour audit (drop if exists puis create)
-- ====================

DROP TRIGGER IF EXISTS audit_shipment_status_change;

DELIMITER $$

CREATE TRIGGER audit_shipment_status_change
AFTER UPDATE ON shipments
FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO shipment_status_history (shipment_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
END$$

DELIMITER ;

-- ====================
-- Fin de migration
-- ====================
