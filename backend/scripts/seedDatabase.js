/**
 * SCRIPT DE REMPLISSAGE COMPLET DE LA BASE DE DONNÉES
 * StoreTrack - Données de démonstration réalistes
 * 
 * Usage: node scripts/seedDatabase.js
 */

const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Fonction utilitaire pour les dates
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

async function seedDatabase() {
  let connection;
  
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    console.log('🚀 Démarrage du remplissage de la base de données...\n');

    // ============================================
    // 1. UTILISATEURS
    // ============================================
    console.log('👥 Création des utilisateurs...');
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    
    const users = [
      { username: 'admin', email: 'admin@storetrack.com', password: await bcrypt.hash('Admin123!', 10), role: 'admin' },
      { username: 'manager1', email: 'manager1@storetrack.com', password: hashedPassword, role: 'manager' },
      { username: 'manager2', email: 'manager2@storetrack.com', password: hashedPassword, role: 'manager' },
      { username: 'operator1', email: 'operator1@storetrack.com', password: hashedPassword, role: 'operator' },
      { username: 'operator2', email: 'operator2@storetrack.com', password: hashedPassword, role: 'operator' },
      { username: 'operator3', email: 'operator3@storetrack.com', password: hashedPassword, role: 'operator' }
    ];

    for (const user of users) {
      await connection.query(
        'INSERT IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [user.username, user.email, user.password, user.role]
      );
    }
    console.log(`✅ ${users.length} utilisateurs créés\n`);

    // ============================================
    // 2. ENTREPÔTS
    // ============================================
    console.log('🏢 Création des entrepôts...');
    const warehouses = [
      { name: 'Entrepôt Central Paris', location: '15 Rue de la Logistique, 75001 Paris' },
      { name: 'Entrepôt Lyon', location: '45 Avenue de la Distribution, 69002 Lyon' },
      { name: 'Entrepôt Marseille', location: '28 Boulevard du Commerce, 13001 Marseille' },
      { name: 'Entrepôt Lille', location: '12 Rue de la Marchandise, 59000 Lille' }
    ];

    const warehouseIds = [];
    for (const warehouse of warehouses) {
      const [result] = await connection.query(
        'INSERT INTO warehouses (name, location) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        [warehouse.name, warehouse.location]
      );
      warehouseIds.push(result.insertId);
    }
    console.log(`✅ ${warehouses.length} entrepôts créés\n`);

    // ============================================
    // 3. FOURNISSEURS
    // ============================================
    console.log('📦 Création des fournisseurs...');
    const suppliers = [
      { name: 'TechSupply France', contact_name: 'Jean Dupont', email: 'contact@techsupply.fr', phone: '+33 1 45 67 89 01', address: '23 Rue de la Tech, Paris' },
      { name: 'ElectroDistrib', contact_name: 'Marie Martin', email: 'info@electrodistrib.fr', phone: '+33 1 45 67 89 02', address: '56 Avenue de l\'Électronique, Lyon' },
      { name: 'MegaStock Alimentaire', contact_name: 'Pierre Bernard', email: 'sales@megastock.fr', phone: '+33 1 45 67 89 03', address: '89 Boulevard de l\'Alimentation, Marseille' },
      { name: 'Pharma Solutions', contact_name: 'Sophie Durand', email: 'contact@pharmasolutions.fr', phone: '+33 1 45 67 89 04', address: '12 Rue de la Santé, Lille' },
      { name: 'Bureau Pro', contact_name: 'Luc Moreau', email: 'info@bureaupro.fr', phone: '+33 1 45 67 89 05', address: '34 Avenue du Bureau, Paris' }
    ];

    const supplierIds = [];
    for (const supplier of suppliers) {
      const [result] = await connection.query(
        'INSERT INTO suppliers (name, contact_name, email, phone, address) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        [supplier.name, supplier.contact_name, supplier.email, supplier.phone, supplier.address]
      );
      supplierIds.push(result.insertId);
    }
    console.log(`✅ ${suppliers.length} fournisseurs créés\n`);

    // ============================================
    // 4. CLIENTS
    // ============================================
    console.log('🤝 Création des clients...');
    const clients = [
      { name: 'Carrefour Paris', contact_name: 'Directeur Commercial', email: 'carrefour.paris@example.com', phone: '+33 1 23 45 67 01', address: '100 Avenue des Champs, Paris' },
      { name: 'Leclerc Lyon', contact_name: 'Service Achats', email: 'achats@leclerc-lyon.fr', phone: '+33 4 78 90 12 34', address: '50 Rue du Commerce, Lyon' },
      { name: 'Auchan Marseille', contact_name: 'Responsable Logistique', email: 'logistique@auchan-marseille.fr', phone: '+33 4 91 23 45 67', address: '75 Boulevard de la Mer, Marseille' },
      { name: 'Intermarché Lille', contact_name: 'Chef de Rayon', email: 'contact@intermarche-lille.fr', phone: '+33 3 20 12 34 56', address: '25 Place du Marché, Lille' },
      { name: 'Monoprix Central', contact_name: 'Service Client', email: 'info@monoprix-central.fr', phone: '+33 1 56 78 90 12', address: '18 Rue de la République, Paris' },
      { name: 'Franprix Distribution', contact_name: 'Responsable Achat', email: 'achat@franprix.fr', phone: '+33 1 67 89 01 23', address: '42 Avenue Victor Hugo, Paris' },
      { name: 'Casino Supermarché', contact_name: 'Direction', email: 'direction@casino-super.fr', phone: '+33 4 72 34 56 78', address: '60 Cours Lafayette, Lyon' }
    ];

    const clientIds = [];
    for (const client of clients) {
      const [result] = await connection.query(
        'INSERT INTO clients (name, contact_name, email, phone, address) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        [client.name, client.contact_name, client.email, client.phone, client.address]
      );
      clientIds.push(result.insertId);
    }
    console.log(`✅ ${clients.length} clients créés\n`);

    // ============================================
    // 5. ARTICLES
    // ============================================
    console.log('📦 Création des articles...');
    const articles = [
      // Électronique
      { name: 'Ordinateur Portable Dell XPS 15', sku: 'DELL-XPS-15-2024', category: 'Électronique', price: 1499.99, stock: 0, min_stock: 10 },
      { name: 'Écran Samsung 27" 4K', sku: 'SAMS-MON-27-4K', category: 'Électronique', price: 399.99, stock: 0, min_stock: 15 },
      { name: 'Clavier Logitech MX Keys', sku: 'LOGI-MX-KEYS', category: 'Électronique', price: 99.99, stock: 0, min_stock: 25 },
      { name: 'Souris Logitech MX Master 3', sku: 'LOGI-MX-MST3', category: 'Électronique', price: 89.99, stock: 0, min_stock: 30 },
      { name: 'Casque Audio Sony WH-1000XM5', sku: 'SONY-WH-1000XM5', category: 'Électronique', price: 349.99, stock: 0, min_stock: 20 },
      
      // Alimentation
      { name: 'Café Arabica Premium 1kg', sku: 'CAFE-ARAB-1KG', category: 'Alimentation', price: 24.99, stock: 0, min_stock: 50 },
      { name: 'Thé Vert Bio Sencha 500g', sku: 'THE-VERT-500G', category: 'Alimentation', price: 12.99, stock: 0, min_stock: 40 },
      { name: 'Chocolat Noir 70% Valrhona 1kg', sku: 'CHOC-NOIR-1KG', category: 'Alimentation', price: 45.99, stock: 0, min_stock: 30 },
      { name: 'Huile d\'Olive Extra Vierge 1L', sku: 'HUILE-OLV-1L', category: 'Alimentation', price: 18.99, stock: 0, min_stock: 60 },
      { name: 'Pâtes Italiennes De Cecco 500g', sku: 'PATES-DECC-500G', category: 'Alimentation', price: 3.99, stock: 0, min_stock: 100 },
      
      // Pharmaceutique
      { name: 'Paracétamol 500mg (boîte 30)', sku: 'PARA-500-30', category: 'Pharmaceutique', price: 2.99, stock: 0, min_stock: 200 },
      { name: 'Ibuprofène 400mg (boîte 20)', sku: 'IBUP-400-20', category: 'Pharmaceutique', price: 3.49, stock: 0, min_stock: 150 },
      { name: 'Vitamine C 1000mg (boîte 60)', sku: 'VIT-C-1000-60', category: 'Pharmaceutique', price: 12.99, stock: 0, min_stock: 100 },
      { name: 'Gel Hydroalcoolique 500ml', sku: 'GEL-HYDRO-500ML', category: 'Pharmaceutique', price: 4.99, stock: 0, min_stock: 80 },
      { name: 'Masques Chirurgicaux (boîte 50)', sku: 'MASK-CHIR-50', category: 'Pharmaceutique', price: 8.99, stock: 0, min_stock: 120 },
      
      // Fournitures Bureau
      { name: 'Ramette Papier A4 (500 feuilles)', sku: 'PAP-A4-500', category: 'Bureau', price: 4.99, stock: 0, min_stock: 150 },
      { name: 'Stylos Bille Bleu (boîte 12)', sku: 'STYLO-BLEU-12', category: 'Bureau', price: 6.99, stock: 0, min_stock: 80 },
      { name: 'Classeurs A4 (lot de 10)', sku: 'CLASS-A4-10', category: 'Bureau', price: 24.99, stock: 0, min_stock: 40 },
      { name: 'Agrafeuse Professionnelle', sku: 'AGRAF-PRO', category: 'Bureau', price: 15.99, stock: 0, min_stock: 25 },
      { name: 'Calculatrice Scientifique', sku: 'CALC-SCIENT', category: 'Bureau', price: 29.99, stock: 0, min_stock: 30 }
    ];

    const articleIds = [];
    for (const article of articles) {
      const [result] = await connection.query(
        'INSERT INTO articles (name, sku, category, price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        [article.name, article.sku, article.category, article.price, article.stock, article.min_stock]
      );
      articleIds.push(result.insertId);
    }
    console.log(`✅ ${articles.length} articles créés\n`);

    // ============================================
    // 6. STOCKS INITIAUX (Quantité 0)
    // ============================================
    console.log('📊 Initialisation des stocks...');
    let stockCount = 0;
    for (const articleId of articleIds) {
      for (const warehouseId of warehouseIds) {
        await connection.query(
          'INSERT IGNORE INTO stocks (article_id, warehouse_id, quantity, min_quantity) VALUES (?, ?, 0, 10)',
          [articleId, warehouseId]
        );
        stockCount++;
      }
    }
    console.log(`✅ ${stockCount} lignes de stock initialisées\n`);

    // ============================================
    // 7. BONS DE COMMANDE FOURNISSEURS
    // ============================================
    console.log('📄 Création des bons de commande...');
    const today = new Date();
    const purchaseOrders = [
      { supplier_id: supplierIds[0], warehouse_id: warehouseIds[0], status: 'received', reference: 'PO-2025-001' },
      { supplier_id: supplierIds[1], warehouse_id: warehouseIds[1], status: 'received', reference: 'PO-2025-002' },
      { supplier_id: supplierIds[2], warehouse_id: warehouseIds[2], status: 'received', reference: 'PO-2025-003' },
      { supplier_id: supplierIds[3], warehouse_id: warehouseIds[0], status: 'pending', reference: 'PO-2025-004' },
      { supplier_id: supplierIds[4], warehouse_id: warehouseIds[1], status: 'pending', reference: 'PO-2025-005' }
    ];

    const purchaseOrderIds = [];
    for (const po of purchaseOrders) {
      const [result] = await connection.query(
        'INSERT INTO purchase_orders (supplier_id, warehouse_id, reference, status, total_amount) VALUES (?, ?, ?, ?, ?)',
        [po.supplier_id, po.warehouse_id, po.reference, po.status, 0]
      );
      purchaseOrderIds.push(result.insertId);
    }
    console.log(`✅ ${purchaseOrders.length} bons de commande créés\n`);

    // ============================================
    // 8. LIGNES DE COMMANDE
    // ============================================
    console.log('📋 Ajout des lignes de commande...');
    const poItems = [
      // PO 1 - Électronique (received)
      { order_id: purchaseOrderIds[0], article_id: articleIds[0], qty_ordered: 50, unit_price: 1499.99 },
      { order_id: purchaseOrderIds[0], article_id: articleIds[1], qty_ordered: 75, unit_price: 399.99 },
      { order_id: purchaseOrderIds[0], article_id: articleIds[2], qty_ordered: 100, unit_price: 99.99 },
      
      // PO 2 - Alimentaire (received)
      { order_id: purchaseOrderIds[1], article_id: articleIds[5], qty_ordered: 200, unit_price: 24.99 },
      { order_id: purchaseOrderIds[1], article_id: articleIds[6], qty_ordered: 150, unit_price: 12.99 },
      { order_id: purchaseOrderIds[1], article_id: articleIds[7], qty_ordered: 100, unit_price: 45.99 },
      
      // PO 3 - Pharmaceutique (received)
      { order_id: purchaseOrderIds[2], article_id: articleIds[10], qty_ordered: 500, unit_price: 2.99 },
      { order_id: purchaseOrderIds[2], article_id: articleIds[11], qty_ordered: 400, unit_price: 3.49 },
      { order_id: purchaseOrderIds[2], article_id: articleIds[12], qty_ordered: 300, unit_price: 12.99 },
      
      // PO 4 - Bureau (pending)
      { order_id: purchaseOrderIds[3], article_id: articleIds[15], qty_ordered: 300, unit_price: 4.99 },
      { order_id: purchaseOrderIds[3], article_id: articleIds[16], qty_ordered: 150, unit_price: 6.99 },
      
      // PO 5 - Mixte (pending)
      { order_id: purchaseOrderIds[4], article_id: articleIds[3], qty_ordered: 80, unit_price: 89.99 },
      { order_id: purchaseOrderIds[4], article_id: articleIds[4], qty_ordered: 60, unit_price: 349.99 }
    ];

    for (const item of poItems) {
      await connection.query(
        'INSERT INTO purchase_order_items (purchase_order_id, article_id, qty_ordered, unit_price) VALUES (?, ?, ?, ?)',
        [item.order_id, item.article_id, item.qty_ordered, item.unit_price]
      );
    }
    
    // Calculer et mettre à jour les totaux des commandes
    for (const poId of purchaseOrderIds) {
      const [items] = await connection.query(
        'SELECT SUM(qty_ordered * unit_price) as total FROM purchase_order_items WHERE purchase_order_id = ?',
        [poId]
      );
      const total = items[0].total || 0;
      await connection.query(
        'UPDATE purchase_orders SET total_amount = ? WHERE id = ?',
        [total, poId]
      );
    }
    console.log(`✅ ${poItems.length} lignes de commande ajoutées avec totaux calculés\n`);

    // ============================================
    // 9. LOTS (données FEFO pour démonstration)
    // ============================================
    console.log('📥 Création des lots avec dates d\'expiration variées...');
    
    const lots = [
      // Café - 3 lots avec différentes dates (pour FEFO) - Entrepôt Paris
      { article_id: articleIds[5], warehouse_id: warehouseIds[0], lot_number: 'CAFE-2024-11-001', manufacturing_date: formatDate(addDays(today, -60)), expiration_date: formatDate(addDays(today, 90)), quantity: 80 },
      { article_id: articleIds[5], warehouse_id: warehouseIds[0], lot_number: 'CAFE-2024-12-001', manufacturing_date: formatDate(addDays(today, -30)), expiration_date: formatDate(addDays(today, 180)), quantity: 70 },
      { article_id: articleIds[5], warehouse_id: warehouseIds[0], lot_number: 'CAFE-2024-12-002', manufacturing_date: formatDate(addDays(today, -20)), expiration_date: formatDate(addDays(today, 270)), quantity: 50 },
      
      // Thé - 2 lots - Entrepôt Lyon
      { article_id: articleIds[6], warehouse_id: warehouseIds[1], lot_number: 'THE-2024-11-001', manufacturing_date: formatDate(addDays(today, -55)), expiration_date: formatDate(addDays(today, 120)), quantity: 70 },
      { article_id: articleIds[6], warehouse_id: warehouseIds[1], lot_number: 'THE-2024-12-001', manufacturing_date: formatDate(addDays(today, -25)), expiration_date: formatDate(addDays(today, 240)), quantity: 80 },
      
      // Chocolat - Entrepôt Marseille
      { article_id: articleIds[7], warehouse_id: warehouseIds[2], lot_number: 'CHOC-2024-11-001', manufacturing_date: formatDate(addDays(today, -50)), expiration_date: formatDate(addDays(today, 150)), quantity: 50 },
      { article_id: articleIds[7], warehouse_id: warehouseIds[2], lot_number: 'CHOC-2024-12-001', manufacturing_date: formatDate(addDays(today, -20)), expiration_date: formatDate(addDays(today, 300)), quantity: 50 },
      
      // Paracétamol - 3 lots (FEFO important) - Entrepôt Paris
      { article_id: articleIds[10], warehouse_id: warehouseIds[0], lot_number: 'PARA-2024-10-001', manufacturing_date: formatDate(addDays(today, -80)), expiration_date: formatDate(addDays(today, 100)), quantity: 200 },
      { article_id: articleIds[10], warehouse_id: warehouseIds[0], lot_number: 'PARA-2024-11-001', manufacturing_date: formatDate(addDays(today, -50)), expiration_date: formatDate(addDays(today, 200)), quantity: 150 },
      { article_id: articleIds[10], warehouse_id: warehouseIds[0], lot_number: 'PARA-2024-12-001', manufacturing_date: formatDate(addDays(today, -20)), expiration_date: formatDate(addDays(today, 330)), quantity: 150 },
      
      // Ibuprofène - Entrepôt Lyon
      { article_id: articleIds[11], warehouse_id: warehouseIds[1], lot_number: 'IBUP-2024-11-001', manufacturing_date: formatDate(addDays(today, -60)), expiration_date: formatDate(addDays(today, 180)), quantity: 200 },
      { article_id: articleIds[11], warehouse_id: warehouseIds[1], lot_number: 'IBUP-2024-12-001', manufacturing_date: formatDate(addDays(today, -30)), expiration_date: formatDate(addDays(today, 300)), quantity: 200 },
      
      // Électronique (longue durée) - Entrepôt Paris
      { article_id: articleIds[0], warehouse_id: warehouseIds[0], lot_number: 'DELL-2024-12-001', manufacturing_date: formatDate(addDays(today, -35)), expiration_date: formatDate(addDays(today, 730)), quantity: 50 },
      { article_id: articleIds[1], warehouse_id: warehouseIds[0], lot_number: 'SAMS-2024-12-001', manufacturing_date: formatDate(addDays(today, -30)), expiration_date: formatDate(addDays(today, 1095)), quantity: 75 },
      { article_id: articleIds[2], warehouse_id: warehouseIds[0], lot_number: 'LOGI-2024-12-001', manufacturing_date: formatDate(addDays(today, -25)), expiration_date: formatDate(addDays(today, 1095)), quantity: 100 }
    ];

    for (const lot of lots) {
      await connection.query(
        'INSERT INTO lots (article_id, warehouse_id, lot_number, manufacturing_date, expiration_date, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [lot.article_id, lot.warehouse_id, lot.lot_number, lot.manufacturing_date, lot.expiration_date, lot.quantity, 'active']
      );
      
      // Mettre à jour les stocks
      await connection.query(
        'UPDATE stocks SET quantity = quantity + ? WHERE article_id = ? AND warehouse_id = ?',
        [lot.quantity, lot.article_id, lot.warehouse_id]
      );
      
      // IMPORTANT: Créer un mouvement pour tracer cette entrée de stock
      const [movement] = await connection.query(
        'INSERT INTO movements (article_id, warehouse_to, qty, type, created_at) VALUES (?, ?, ?, ?, ?)',
        [lot.article_id, lot.warehouse_id, lot.quantity, 'in', formatDate(addDays(today, -Math.floor(Math.random() * 30)))]
      );
      
      // Lier le mouvement au lot
      await connection.query(
        'INSERT INTO lot_movements (movement_id, article_id, lot_number, quantity, expiration_date) VALUES (?, ?, ?, ?, ?)',
        [movement.insertId, lot.article_id, lot.lot_number, lot.quantity, lot.expiration_date]
      );
    }
    
    console.log(`✅ ${lots.length} lots créés avec stocks et mouvements enregistrés\n`);

    // ============================================
    // MISE À JOUR : Synchroniser articles.stock avec la somme des stocks
    // ============================================
    console.log('🔄 Mise à jour des totaux de stock dans la table articles...');
    
    for (const articleId of articleIds) {
      // Calculer le total des stocks pour cet article (somme de tous les entrepôts)
      const [stockSum] = await connection.query(
        'SELECT COALESCE(SUM(quantity), 0) as total FROM stocks WHERE article_id = ?',
        [articleId]
      );
      
      const totalStock = stockSum[0].total;
      
      // Mettre à jour la colonne stock dans la table articles
      await connection.query(
        'UPDATE articles SET stock = ? WHERE id = ?',
        [totalStock, articleId]
      );
    }
    
    console.log('✅ Totaux de stock synchronisés dans la table articles\n');

    // ============================================
    // 10. NOTIFICATIONS
    // ============================================
    console.log('🔔 Création des notifications...');
    
    const notifications = [
      { type: 'stock_low', message: 'Stock faible pour Ordinateur Portable Dell XPS 15', priority: 'high', is_read: 0 },
      { type: 'expiration_warning', message: 'Lot CAFE-2024-11-001 expire dans 90 jours', priority: 'medium', is_read: 0 },
      { type: 'expiration_warning', message: 'Lot PARA-2024-10-001 expire dans 100 jours', priority: 'high', is_read: 0 },
      { type: 'purchase_order', message: 'Nouveau bon de commande PO-2025-004 créé', priority: 'medium', is_read: 1 },
      { type: 'shipment', message: 'Expédition en attente de préparation', priority: 'low', is_read: 1 }
    ];

    for (const notif of notifications) {
      await connection.query(
        'INSERT INTO notifications (type, message, priority, is_read) VALUES (?, ?, ?, ?)',
        [notif.type, notif.message, notif.priority, notif.is_read]
      );
    }
    
    console.log(`✅ ${notifications.length} notifications créées\n`);

    // ============================================
    // COMMIT TRANSACTION
    // ============================================
    await connection.commit();
    console.log('\n🎉 SUCCÈS! Base de données remplie avec des données réalistes!\n');
    
    console.log('📊 RÉSUMÉ:');
    console.log(`   - ${users.length} utilisateurs`);
    console.log(`   - ${warehouses.length} entrepôts`);
    console.log(`   - ${suppliers.length} fournisseurs`);
    console.log(`   - ${clients.length} clients`);
    console.log(`   - ${articles.length} articles`);
    console.log(`   - ${stockCount} lignes de stock`);
    console.log(`   - ${purchaseOrders.length} bons de commande`);
    console.log(`   - ${poItems.length} lignes de commande`);
    console.log(`   - ${lots.length} lots avec dates d'expiration`);
    console.log(`   - ${notifications.length} notifications`);
    
    console.log('\n🔑 IDENTIFIANTS DE CONNEXION:');
    console.log('   Email: admin@storetrack.com');
    console.log('   Mot de passe: Admin123!');
    console.log('\n✨ Le site est prêt à être utilisé avec des données significatives!\n');
    console.log('💡 Note: Les lots alimentaires et pharmaceutiques ont des dates d\'expiration');
    console.log('   variées pour démontrer l\'algorithme FEFO lors des expéditions.\n');
    
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

// Exécuter le script
seedDatabase();
