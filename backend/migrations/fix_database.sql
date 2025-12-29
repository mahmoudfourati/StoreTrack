-- ===============================================
-- SCRIPT DE CORRECTION DE LA BASE DE DONNÉES
-- StoreTrack - 26 Décembre 2025
-- ===============================================

-- 1. CORRECTION DE LA TABLE ARTICLES
-- ===============================================
-- Modifier price_tnd en price
ALTER TABLE articles 
  CHANGE COLUMN price_tnd price FLOAT DEFAULT 0;

-- Ajouter les colonnes manquantes
ALTER TABLE articles 
  ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) DEFAULT NULL;

-- 2. CRÉATION DE LA TABLE USERS
-- ===============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'worker') DEFAULT 'worker',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. AJOUT D'INDEX POUR PERFORMANCES
-- ===============================================
ALTER TABLE movements 
  ADD INDEX IF NOT EXISTS idx_created_at (created_at);

ALTER TABLE stocks 
  ADD INDEX IF NOT EXISTS idx_quantity (quantity);

ALTER TABLE purchase_orders 
  ADD INDEX IF NOT EXISTS idx_status (status);

ALTER TABLE shipments 
  ADD INDEX IF NOT EXISTS idx_status (status);

-- 4. CORRECTION DES DONNÉES EXISTANTES
-- ===============================================
-- S'assurer que les articles ont des valeurs par défaut
UPDATE articles 
SET stock = COALESCE(stock, 0), 
    min_stock = COALESCE(min_stock, 5) 
WHERE stock IS NULL OR min_stock IS NULL;

-- ===============================================
-- FIN DU SCRIPT
-- ===============================================
-- Pour exécuter ce script :
-- 1. Ouvrir phpMyAdmin ou MySQL Workbench
-- 2. Sélectionner la base 'storetrack_db'
-- 3. Exécuter ce script SQL
-- ===============================================
