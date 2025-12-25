// backend/db.js
const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "", // Vide par défaut sous XAMPP
  database: "storetrack_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4' // <--- AJOUT IMPORTANT : Pour gérer les accents correctement
});

module.exports = db;

// Test simple de connexion au démarrage
db.getConnection((err, connection) => {
  if (err) {
    console.error("ERREUR FATALE : Impossible de se connecter à la BDD MySQL !", err.code);
    console.error("Vérifie que XAMPP est lancé et que le nom de la BDD est correct.");
  } else {
    console.log("✅ Connexion MySQL réussie avec succès !");
    connection.release();
  }
});