const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// INSCRIPTION (Pour créer tes premiers utilisateurs)
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        
        // Hacher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
        await db.query(sql, [username, email, hashedPassword, role || 'worker']);

        res.status(201).json({ message: 'Utilisateur créé !' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CONNEXION
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Trouver l'utilisateur
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }
        const user = users[0];

        // 2. Vérifier le mot de passe
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        // 3. Créer le token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            userId: user.id,
            username: user.username,
            role: user.role,
            token: token
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;