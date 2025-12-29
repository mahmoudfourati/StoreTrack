// backend/// ============================================
// SCRIPT DE CRÉATION D'UTILISATEUR ADMIN
// StoreTrack - Exécuter avec: node createAdmin.js
// ============================================

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAdmin() {
  let connection;
  
  try {
    // Connexion à la base de données
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'storetrack_db'
    });

    console.log('✅ Connecté à la base de données');

    // Données de l'admin par défaut
    const adminData = {
      username: 'admin',
      email: 'admin@storetrack.com',
      password: 'Admin123!', // Mot de passe par défaut
      role: 'admin'
    };

    // Vérifier si l'utilisateur existe déjà
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [adminData.email, adminData.username]
    );

    if (existingUsers.length > 0) {
      console.log('⚠️  Un utilisateur avec cet email/username existe déjà !');
      console.log('📧 Email:', adminData.email);
      console.log('👤 Username:', adminData.username);
      return;
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Insérer l'admin
    const [result] = await connection.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [adminData.username, adminData.email, hashedPassword, adminData.role]
    );

    console.log('\n🎉 Utilisateur admin créé avec succès !');
    console.log('================================');
    console.log('📧 Email:', adminData.email);
    console.log('👤 Username:', adminData.username);
    console.log('🔑 Mot de passe:', adminData.password);
    console.log('🎭 Rôle:', adminData.role);
    console.log('🆔 ID:', result.insertId);
    console.log('================================');
    console.log('\n⚠️  IMPORTANT: Changez le mot de passe après la première connexion !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 La table "users" n\'existe pas encore.');
      console.log('Exécutez d\'abord le script: backend/migrations/fix_database.sql');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Déconnexion de la base de données');
    }
  }
}

// Exécution
createAdmin();
