const db = require('./config/db');

async function fixStock() {
  const sql = `UPDATE stocks SET quantity = 80 WHERE article_id = 36 AND warehouse_id = 1`;
  try {
    await db.query(sql);
    console.log('✅ Stock mis à jour: article 36, warehouse 1 = 80');
    process.exit(0);
  } catch(err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
}

fixStock();
