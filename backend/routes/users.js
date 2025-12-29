const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");

// GET /api/users - Liste tous les utilisateurs
router.get("/", async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/users/:id - Détails d'un utilisateur
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, email, role, created_at FROM users WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/users - Créer un nouvel utilisateur
router.post("/", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis" });
    }

    const validRoles = ["admin", "manager", "worker"];
    const userRole = role || "worker";
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ error: "Rôle invalide" });
    }

    // Vérifier si l'utilisateur existe déjà
    const [existing] = await db.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Nom d'utilisateur ou email déjà utilisé" });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertion
    const [result] = await db.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, userRole]
    );

    res.status(201).json({
      id: result.insertId,
      username,
      email,
      role: userRole,
      message: "Utilisateur créé avec succès"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/users/:id - Modifier un utilisateur
router.put("/:id", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const userId = req.params.id;

    // Vérifier que l'utilisateur existe
    const [existing] = await db.query("SELECT id FROM users WHERE id = ?", [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    // Validation du rôle
    const validRoles = ["admin", "manager", "worker"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: "Rôle invalide" });
    }

    // Vérifier les doublons (username ou email)
    if (username || email) {
      const [duplicates] = await db.query(
        "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?",
        [username || "", email || "", userId]
      );
      if (duplicates.length > 0) {
        return res.status(409).json({ error: "Nom d'utilisateur ou email déjà utilisé" });
      }
    }

    // Construction de la requête UPDATE dynamique
    const updates = [];
    const params = [];

    if (username) {
      updates.push("username = ?");
      params.push(username);
    }
    if (email) {
      updates.push("email = ?");
      params.push(email);
    }
    if (role) {
      updates.push("role = ?");
      params.push(role);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push("password = ?");
      params.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Aucune modification fournie" });
    }

    params.push(userId);
    await db.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

    // Récupérer les données mises à jour
    const [updated] = await db.query(
      "SELECT id, username, email, role, created_at FROM users WHERE id = ?",
      [userId]
    );

    res.json({
      message: "Utilisateur modifié avec succès",
      user: updated[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/users/:id - Supprimer un utilisateur
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const [existing] = await db.query("SELECT id FROM users WHERE id = ?", [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    await db.query("DELETE FROM users WHERE id = ?", [userId]);
    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
