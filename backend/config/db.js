// backend/db.js
// IMPORTANT : On ajoute '/promise' à la fin de l'import
const mysql = require('mysql2/promise'); 
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // Mets ton mot de passe si tu en as un
    database: process.env.DB_NAME || 'storetrack_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test de connexion optionnel pour voir si ça marche au démarrage
pool.getConnection()
    .then(conn => {
        console.log("✅ Connecté à la base de données MySQL avec succès !");
        conn.release();
    })
    .catch(err => {
        console.error("❌ Erreur de connexion MySQL :", err.message);
    });

module.exports = pool;