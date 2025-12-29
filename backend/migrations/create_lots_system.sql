-- ===============================================
-- MIGRATION: SYSTÈME DE GESTION DES LOTS
-- Date: 27 Décembre 2025
-- Description: Création de la table lots et suppression des colonnes lot de articles
-- ===============================================

-- 1. CRÉATION DE LA TABLE LOTS
-- ===============================================
CREATE TABLE IF NOT EXISTS lots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lot_number VARCHAR(50) UNIQUE NOT NULL,
  article_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  quantity INT DEFAULT 0,
  manufacturing_date DATE,
  expiration_date DATE,
  received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'expired', 'recalled', 'depleted') DEFAULT 'active',
  supplier_batch VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  INDEX idx_article_warehouse (article_id, warehouse_id),
  INDEX idx_expiration (expiration_date),
  INDEX idx_status (status),
  INDEX idx_lot_number (lot_number),
  CONSTRAINT chk_lot_quantity_positive CHECK (quantity >= 0),
  CONSTRAINT chk_dates_valid CHECK (expiration_date IS NULL OR manufacturing_date IS NULL OR expiration_date >= manufacturing_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. S'ASSURER QUE LA TABLE LOT_MOVEMENTS EXISTE
-- ===============================================
CREATE TABLE IF NOT EXISTS lot_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lot_id INT NOT NULL,
  movement_id INT NOT NULL,
  quantity_change INT NOT NULL,
  balance_after INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE CASCADE,
  FOREIGN KEY (movement_id) REFERENCES movements(id) ON DELETE CASCADE,
  INDEX idx_lot_id (lot_id),
  INDEX idx_movement_id (movement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. AMÉLIORATION DE LA TABLE EXPIRED_LOTS_LOG
-- ===============================================
CREATE TABLE IF NOT EXISTS expired_lots_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lot_id INT NOT NULL,
  lot_number VARCHAR(50) NOT NULL,
  article_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  quantity_expired INT NOT NULL,
  expiration_date DATE NOT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action_taken ENUM('pending', 'removed', 'marked', 'ignored') DEFAULT 'pending',
  action_by INT,
  action_notes TEXT,
  FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (action_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_lot_id (lot_id),
  INDEX idx_detected_at (detected_at),
  INDEX idx_action_taken (action_taken)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. CRÉATION VUE POUR LOTS EXPIRANT BIENTÔT
-- ===============================================
CREATE OR REPLACE VIEW expiring_lots AS
SELECT 
  l.id,
  l.lot_number,
  l.article_id,
  a.name AS article_name,
  a.sku,
  l.warehouse_id,
  w.name AS warehouse_name,
  l.quantity,
  l.expiration_date,
  DATEDIFF(l.expiration_date, CURDATE()) AS days_until_expiration,
  l.status
FROM lots l
JOIN articles a ON l.article_id = a.id
JOIN warehouses w ON l.warehouse_id = w.id
WHERE l.status = 'active' 
  AND l.expiration_date IS NOT NULL
  AND l.quantity > 0
  AND DATEDIFF(l.expiration_date, CURDATE()) BETWEEN 0 AND 30
ORDER BY l.expiration_date ASC;

-- 5. MIGRATION DES DONNÉES EXISTANTES (si des données existent dans articles)
-- ===============================================
-- Note: Cette section migre les anciennes données lot_number, expiration_date depuis articles
-- vers la nouvelle table lots. À exécuter une seule fois.

INSERT INTO lots (lot_number, article_id, warehouse_id, quantity, expiration_date, manufacturing_date, status)
SELECT 
  COALESCE(a.lot_number, CONCAT('LOT-', a.id, '-', w.id)) AS lot_number,
  a.id AS article_id,
  w.id AS warehouse_id,
  COALESCE(s.quantity, 0) AS quantity,
  a.expiration_date,
  a.manufacturing_date,
  CASE 
    WHEN a.expiration_date IS NOT NULL AND a.expiration_date < CURDATE() THEN 'expired'
    ELSE 'active'
  END AS status
FROM articles a
CROSS JOIN warehouses w
LEFT JOIN stocks s ON s.article_id = a.id AND s.warehouse_id = w.id
WHERE a.lot_number IS NOT NULL 
  OR a.expiration_date IS NOT NULL
  OR a.manufacturing_date IS NOT NULL
ON DUPLICATE KEY UPDATE lots.lot_number = lots.lot_number; -- Ignore duplicates

-- 6. SUPPRESSION DES ANCIENNES COLONNES LOT DE ARTICLES
-- ===============================================
-- ATTENTION: Cette étape est irréversible. S'assurer que la migration ci-dessus a réussi.
-- Décommenter ces lignes après vérification:

-- ALTER TABLE articles DROP COLUMN IF EXISTS lot_number;
-- ALTER TABLE articles DROP COLUMN IF EXISTS expiration_date;
-- ALTER TABLE articles DROP COLUMN IF EXISTS manufacturing_date;

-- 7. AJOUT DE COLONNES UTILES À MOVEMENTS
-- ===============================================
ALTER TABLE movements
  ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50) DEFAULT NULL COMMENT 'Type de référence (PO, shipment, transfer, etc.)',
  ADD COLUMN IF NOT EXISTS reference_id INT DEFAULT NULL COMMENT 'ID de la référence',
  ADD INDEX IF NOT EXISTS idx_reference (reference_type, reference_id);

-- 8. CONTRAINTES SUPPLÉMENTAIRES SUR STOCKS
-- ===============================================
ALTER TABLE stocks
  ADD CONSTRAINT IF NOT EXISTS chk_quantity_positive CHECK (quantity >= 0),
  ADD CONSTRAINT IF NOT EXISTS chk_min_quantity_valid CHECK (min_quantity IS NULL OR min_quantity >= 0);

-- ===============================================
-- FIN DE LA MIGRATION
-- ===============================================

-- Pour exécuter cette migration:
-- 1. Sauvegarder la base de données
-- 2. Ouvrir phpMyAdmin ou MySQL Workbench
-- 3. Sélectionner la base 'storetrack_db'
-- 4. Exécuter ce script SQL ligne par ligne ou en bloc
-- 5. Vérifier que les tables sont créées: SHOW TABLES LIKE '%lot%';
-- 6. Vérifier les données migrées: SELECT COUNT(*) FROM lots;
-- 7. Après validation, décommenter la section 6 pour supprimer les anciennes colonnes
