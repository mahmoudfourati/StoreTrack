/**
 * Script d'initialisation des stocks manquants
 * À exécuter UNE FOIS sur la base de données existante
 * 
 * Ce script crée les lignes stocks manquantes pour toutes les combinaisons
 * article × entrepôt qui n'existent pas encore dans la table stocks.
 * 
 * Usage: node scripts/initializeStocks.js
 */

const db = require("../config/db");

async function initializeMissingStocks() {
  try {
    console.log("🚀 Démarrage de l'initialisation des stocks...\n");

    // 1. Récupérer tous les articles
    const [articles] = await db.query("SELECT id, name, min_stock FROM articles");
    console.log(`📦 Articles trouvés: ${articles.length}`);

    // 2. Récupérer tous les entrepôts
    const [warehouses] = await db.query("SELECT id, name FROM warehouses");
    console.log(`🏢 Entrepôts trouvés: ${warehouses.length}\n`);

    // 3. Statistiques
    let created = 0;
    let existing = 0;
    let errors = 0;

    console.log("🔄 Création des stocks manquants...\n");

    // 4. Pour chaque combinaison article × entrepôt
    for (const article of articles) {
      for (const warehouse of warehouses) {
        try {
          // Utiliser INSERT IGNORE pour éviter les doublons
          const [result] = await db.query(
            `INSERT IGNORE INTO stocks (article_id, warehouse_id, quantity, min_quantity)
             VALUES (?, ?, 0, ?)`,
            [article.id, warehouse.id, article.min_stock || 5]
          );

          if (result.affectedRows > 0) {
            created++;
            console.log(
              `✅ Créé: ${article.name} → ${warehouse.name} (min: ${article.min_stock || 5})`
            );
          } else {
            existing++;
          }
        } catch (err) {
          errors++;
          console.error(
            `❌ Erreur: ${article.name} → ${warehouse.name}: ${err.message}`
          );
        }
      }
    }

    // 5. Résumé final
    console.log("\n" + "=".repeat(60));
    console.log("📊 RÉSUMÉ DE L'INITIALISATION");
    console.log("=".repeat(60));
    console.log(`✅ Stocks créés:      ${created}`);
    console.log(`ℹ️  Déjà existants:    ${existing}`);
    console.log(`❌ Erreurs:           ${errors}`);
    console.log(`📦 Total traité:      ${articles.length * warehouses.length}`);
    console.log("=".repeat(60));

    // 6. Vérification finale
    const [verification] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM articles) * (SELECT COUNT(*) FROM warehouses) AS expected,
        COUNT(*) AS actual
      FROM stocks
    `);

    console.log("\n🔍 VÉRIFICATION:");
    console.log(`Lignes attendues: ${verification[0].expected}`);
    console.log(`Lignes actuelles: ${verification[0].actual}`);

    if (verification[0].expected === verification[0].actual) {
      console.log("✅ Toutes les combinaisons article×entrepôt ont des stocks!\n");
    } else {
      console.log(
        `⚠️  Manque ${verification[0].expected - verification[0].actual} lignes\n`
      );
    }

    console.log("✅ Initialisation terminée avec succès!");
    process.exit(0);
  } catch (error) {
    console.error("❌ ERREUR FATALE:", error);
    process.exit(1);
  }
}

// Exécuter le script
initializeMissingStocks();
