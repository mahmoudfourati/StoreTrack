# 🎬 GUIDE VIDÉO - LIVRABLE FINAL STORETRACK

**Durée cible :** 20-25 minutes  
**Format :** Écran divisé (Code à gauche / Navigateur à droite)

---

## 🎯 PARTIE 1 : INTRODUCTION (2 min)

### À MONTRER
- VSCode avec structure backend/frontend
- Navigateur sur localhost:3000

### À DIRE
> "StoreTrack est un système de gestion d'entrepôt avec Next.js 16, Node.js et MySQL. L'originalité : un système FEFO (First Expired First Out) qui optimise automatiquement la rotation des stocks par date de péremption."

### CODE
```
StoreTrack/
├── backend/    # API Node.js + Express + MySQL
├── frontend/   # Next.js 16 + React 19
```

---

## 🏗️ PARTIE 2 : STACK TECHNIQUE (2 min)

### À MONTRER
- backend/server.js
- backend/package.json

### À DIRE
> "**Backend:** Express, MySQL2, JWT, Bcrypt  
> **Frontend:** Next.js 16, React 19, Tailwind, shadcn/ui, Multi-langue (FR/EN/AR)  
> Ports: Backend 5000, Frontend 3000"

### CODE
```javascript
// backend/server.js
const express = require('express');
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/articles', articlesRoutes);
app.listen(5000);
```

---

## 🔐 PARTIE 3 : AUTHENTIFICATION (2 min)

### DÉMONSTRATION
1. Login avec admin@storetrack.com / 123456
2. Montrer le token JWT dans localStorage

### CODE
```javascript
// backend/routes/auth.js - Login
router.post('/login', async (req, res) => {
  const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  const valid = await bcrypt.compare(password, user.password);
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  res.json({ token, user });
});

// backend/middleware/auth.js - Protection des routes
module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.userId = decoded.userId;
  next();
};
```

---

## 📦 PARTIE 4 : MODULES DE BASE (2 min)

### À MONTRER RAPIDEMENT
1. **Dashboard** - Stats en temps réel
2. **Articles** - Créer un article avec image
3. **Entrepôts** - Liste des sites

### À DIRE
> "Interface complète : gestion articles, entrepôts multi-sites, stocks, clients, fournisseurs. Tout est connecté à l'API REST."

---

## 🎯 PARTIE 5 : SYSTÈME FEFO - KILLER FEATURE (10 min)


### WORKFLOW COMPLET

**Étape 1 : Bon de Commande**
- Créer un BC avec 2 articles (100 et 50 unités)

**Étape 2 : Réception avec Lots**
- LOT-001, Article A, expire 01/03/2026 (bientôt)
- LOT-002, Article A, expire 31/12/2027 (tard)
- LOT-003, Article B, expire 15/06/2026

**Étape 3 : Expédition (FEFO automatique)**
- Demander 80 unités d'Article A
- Le système utilise LOT-001 en priorité (expire en premier)

### CODE FEFO - ALGORITHME CLÉ
```javascript
// backend/services/lotService.js
async pickLotsForShipment(articleId, warehouseId, quantityNeeded) {
  // 1. Récupérer lots triés par date expiration
  const [lots] = await db.query(`
    SELECT lot_number, expiration_date, quantity
    FROM lots l
    JOIN stocks s ON l.article_id = s.article_id
    WHERE l.article_id = ? AND s.warehouse_id = ? AND s.quantity > 0
    ORDER BY l.expiration_date ASC
  `, [articleId, warehouseId]);
  
  // 2. Sélection FEFO
  let remaining = quantityNeeded;
  const selected = [];
  
  for (const lot of lots) {
    if (remaining <= 0) break;
    const qty = Math.min(remaining, lot.quantity);
    selected.push({ lot_number: lot.lot_number, quantity: qty });
    remaining -= qty;
  }
  
  return selected;
}
```

### DISPATCH AVEC FEFO
```javascript
// backend/routes/shipments.js
router.post('/:id/dispatch', auth, async (req, res) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  
  try {
    for (const item of items) {
      // APPEL FEFO
      const lots = await lotService.pickLotsForShipment(
        item.article_id, warehouse_id, item.quantity
      );
      
      // Mise à jour stocks et lots
      for (const lot of lots) {
        await connection.query(
          'UPDATE lots SET quantity = quantity - ? WHERE lot_number = ?',
          [lot.quantity, lot.lot_number]
        );
        await connection.query(
          'UPDATE stocks SET quantity = quantity - ? WHERE article_id = ?',
          [lot.quantity, item.article_id]
        );
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
  }
});
```

---

## 📋 PARTIE 6 : TRAÇABILITÉ & BASE DE DONNÉES (3 min)

### À MONTRER
- Page Mouvements
- Console MySQL avec requête

### À DIRE
> "Chaque opération génère un mouvement. Traçabilité complète avec lot_movements."

### STRUCTURE BD
```sql
-- Table lots (dates d'expiration)
CREATE TABLE lots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT,
  lot_number VARCHAR(50) UNIQUE,
  expiration_date DATE NOT NULL,
  quantity INT,
  INDEX idx_expiration (expiration_date)
);

-- Table lot_movements (traçabilité FEFO)
CREATE TABLE lot_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  movement_id INT,
  lot_number VARCHAR(50),
  quantity INT,
  expiration_date DATE
);
```

---

## 🌐 PARTIE 7 : FONCTIONNALITÉS AVANCÉES (2 min)

### À MONTRER RAPIDEMENT
1. **Notifications** - Alertes stock bas + expiration proche
2. **Multi-langue** - Français/Anglais/Arabe
3. **Transferts** - Entre entrepôts
4. **Rapports** - Graphiques Recharts

### CODE NOTIFICATIONS
```javascript
// backend/services/notificationService.js
async checkStockAlerts() {
  // Stocks bas
  const [low] = await db.query(`
    SELECT * FROM stocks s JOIN articles a ON s.article_id = a.id
    WHERE s.quantity <= a.min_stock
  `);
  
  // Expirations proches (30 jours)
  const [expiring] = await db.query(`
    SELECT * FROM lots
    WHERE expiration_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
  `);
}
```

---

## 🚀 PARTIE 8 : CONFIGURATION & DÉPLOIEMENT (2 min)

### À MONTRER
- README.md
- .env.example
- package.json

### À DIRE
> "**Installation Backend:**  
> npm install → Configurer .env → Importer BD → npm start (port 5000)
>
> **Installation Frontend:**  
> npm install → Configurer .env.local → npm run dev (port 3000)
>
> **Prérequis:** Node.js 18+, MySQL 8.0+"

---

## 🎓 CONCLUSION (2 min)

### À DIRE
> "**Récapitulatif StoreTrack:**
>
> **Innovation :** Algorithme FEFO automatique (optimisation rotation stocks)
>
> **Stack moderne :** Next.js 16 + React 19 + Node.js + MySQL
>
> **Fonctionnalités pro :** Multi-entrepôts, traçabilité complète, notifications, multi-langue
>
> **Sécurité :** JWT, bcrypt, SQL paramétrisé
>
> **Architecture :** Modulaire, scalable, maintenable
>
> Le système FEFO est la killer feature : il optimise automatiquement les stocks par date de péremption, réduisant les pertes.
>
> Code disponible sur GitHub : https://github.com/mahmoudfourati/StoreTrack
>
> Merci!"

---

## ✅ CHECKLIST RAPIDE

### Avant enregistrement
- [ ] Backend + Frontend lancés
- [ ] Données test prêtes
- [ ] Code ouvert dans VSCode
- [ ] Navigateur sur login

### Pendant vidéo
- [ ] Parler clairement
- [ ] Alterner UI ↔ Code
- [ ] Insister sur FEFO (5 min dédiées)
- [ ] Montrer transactions SQL
- [ ] Expliquer choix techniques

### Points clés
✅ Algorithme FEFO (originalité)  
✅ Stack ultra-moderne (Next.js 16, React 19)  
✅ Traçabilité complète  
✅ Architecture RESTful propre  
✅ Sécurité (JWT, bcrypt, SQL injection)

---

**Durée finale : 20-25 minutes | Focus : FEFO + Architecture + Démonstration**
