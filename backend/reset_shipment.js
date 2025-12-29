const db = require('./config/db');

async function reset() {
  try {
    // Delete existing dispatch data
    await db.query(`DELETE FROM lot_movements WHERE movement_id IN (SELECT id FROM movements WHERE note LIKE 'Expédition #7%')`);
    await db.query(`DELETE FROM movements WHERE note LIKE 'Expédition #7%'`);
    await db.query(`DELETE FROM shipment_entries WHERE shipment_id = 7`);
    
    // Reset quantities
    await db.query(`UPDATE shipment_items SET qty_dispatched = 0 WHERE shipment_id = 7`);
    await db.query(`UPDATE shipments SET status = 'draft' WHERE id = 7`);
    await db.query(`UPDATE stocks SET quantity = 80 WHERE article_id = 36 AND warehouse_id = 1`);
    await db.query(`UPDATE lots SET quantity = 30, status = 'active' WHERE id = 6`);
    await db.query(`UPDATE lots SET quantity = 50, status = 'active' WHERE id = 8`);
    
    console.log('✅ Shipment #7 réinitialisé');
    process.exit(0);
  } catch(err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

reset();
