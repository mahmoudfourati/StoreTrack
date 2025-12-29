-- Migration: Ajout gestion des lots et dates de péremption
-- Date: 2025-12-27

-- Ajouter colonnes lot dans la table articles
ALTER TABLE articles 
ADD COLUMN lot_number VARCHAR(100) DEFAULT NULL AFTER sku,
ADD COLUMN expiration_date DATE DEFAULT NULL AFTER lot_number,
ADD COLUMN manufacturing_date DATE DEFAULT NULL AFTER expiration_date;

-- Index pour recherche rapide par lot
CREATE INDEX idx_lot_number ON articles(lot_number);
CREATE INDEX idx_expiration_date ON articles(expiration_date);

-- Table pour traçabilité des lots dans les mouvements
CREATE TABLE IF NOT EXISTS lot_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  movement_id INT NOT NULL,
  article_id INT NOT NULL,
  lot_number VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  expiration_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (movement_id) REFERENCES movements(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  INDEX idx_lot_mov (lot_number),
  INDEX idx_movement (movement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table pour historique des lots périmés
CREATE TABLE IF NOT EXISTS expired_lots_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT NOT NULL,
  lot_number VARCHAR(100) NOT NULL,
  expiration_date DATE NOT NULL,
  quantity_at_expiration INT DEFAULT 0,
  status ENUM('expired', 'disposed', 'returned') DEFAULT 'expired',
  notes TEXT,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  INDEX idx_expiration (expiration_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vue pour lots expirant dans les 30 jours
CREATE OR REPLACE VIEW expiring_lots AS
SELECT 
  a.id AS article_id,
  a.name AS article_name,
  a.sku,
  a.lot_number,
  a.expiration_date,
  DATEDIFF(a.expiration_date, CURDATE()) AS days_until_expiration,
  s.quantity,
  w.name AS warehouse_name
FROM articles a
LEFT JOIN stocks s ON a.id = s.article_id
LEFT JOIN warehouses w ON s.warehouse_id = w.id
WHERE a.expiration_date IS NOT NULL
  AND a.expiration_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY a.expiration_date ASC;

-- Insérer quelques lots de test
INSERT INTO articles (name, sku, lot_number, expiration_date, manufacturing_date, price, min_stock)
VALUES 
('Article Lot Test 1', 'LOT-001', 'LOT-2025-001', '2025-03-15', '2024-12-01', 25.00, 10),
('Article Lot Test 2', 'LOT-002', 'LOT-2025-002', '2025-01-20', '2024-11-15', 30.00, 5);
