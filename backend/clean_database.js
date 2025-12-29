const db = require('./config/db');

async function cleanDatabase() {
  try {
    console.log('🧹 Nettoyage de la base de données...\n');

    // Helper function to safely delete from table
    const safeDelete = async (tableName) => {
      try {
        await db.query(`DELETE FROM ${tableName}`);
        return true;
      } catch (err) {
        if (err.message.includes("doesn't exist")) {
          console.log(`   ⚠️  Table ${tableName} n'existe pas (ignorée)`);
          return false;
        }
        throw err;
      }
    };

    // 1. Supprimer les données de test/transactions
    console.log('📦 Suppression des lots et mouvements...');
    await safeDelete('lot_movements');
    await safeDelete('lots');
    await safeDelete('movements');
    
    console.log('📤 Suppression des expéditions...');
    await safeDelete('shipment_entries');
    await safeDelete('shipment_status_history');
    await safeDelete('shipment_items');
    await safeDelete('shipments');
    
    console.log('📥 Suppression des réceptions...');
    await safeDelete('reception_entries');
    await safeDelete('reception_items');
    await safeDelete('receptions');
    
    console.log('🛒 Suppression des commandes d\'achat...');
    await safeDelete('purchase_order_items');
    await safeDelete('purchase_orders');
    
    console.log('🔄 Suppression des transferts et demandes...');
    await safeDelete('transfer_items');
    await safeDelete('transfers');
    await safeDelete('internal_request_items');
    await safeDelete('internal_requests');
    
    console.log('🎫 Suppression des tickets...');
    await safeDelete('tickets');
    
    console.log('🔔 Suppression des notifications...');
    await safeDelete('notifications');
    
    console.log('📊 Réinitialisation des stocks...');
    await db.query('UPDATE stocks SET quantity = 0, min_quantity = NULL');
    
    // 2. Réinitialiser les auto_increment
    console.log('🔢 Réinitialisation des compteurs...');
    const resetAutoIncrement = async (tableName) => {
      try {
        await db.query(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1`);
      } catch (err) {
        if (!err.message.includes("doesn't exist")) {
          console.log(`   ⚠️  Erreur sur ${tableName}: ${err.message}`);
        }
      }
    };
    
    await resetAutoIncrement('lots');
    await resetAutoIncrement('movements');
    await resetAutoIncrement('shipments');
    await resetAutoIncrement('purchase_orders');
    await resetAutoIncrement('receptions');
    await resetAutoIncrement('transfers');
    await resetAutoIncrement('internal_requests');
    await resetAutoIncrement('tickets');
    await resetAutoIncrement('notifications');
    
    // 3. Garder les données essentielles (users, warehouses, clients, suppliers, articles)
    console.log('\n✅ Base de données nettoyée avec succès!');
    console.log('\n📋 Données conservées:');
    
    const [users] = await db.query('SELECT COUNT(*) as count FROM users');
    console.log(`   - Utilisateurs: ${users[0].count}`);
    
    const [warehouses] = await db.query('SELECT COUNT(*) as count FROM warehouses');
    console.log(`   - Entrepôts: ${warehouses[0].count}`);
    
    const [clients] = await db.query('SELECT COUNT(*) as count FROM clients');
    console.log(`   - Clients: ${clients[0].count}`);
    
    const [suppliers] = await db.query('SELECT COUNT(*) as count FROM suppliers');
    console.log(`   - Fournisseurs: ${suppliers[0].count}`);
    
    const [articles] = await db.query('SELECT COUNT(*) as count FROM articles');
    console.log(`   - Articles: ${articles[0].count}`);
    
    console.log('\n💡 Vous pouvez maintenant commencer avec une base propre!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors du nettoyage:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

cleanDatabase();
