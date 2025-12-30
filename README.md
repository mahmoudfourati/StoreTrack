# 📦 StoreTrack

Système de gestion d'entrepôt moderne avec algorithme FEFO (First Expired First Out) pour la gestion intelligente des stocks et des expéditions.

## 🚀 Fonctionnalités Principales

- **Gestion Multi-Entrepôts** - Support de plusieurs entrepôts avec transferts inter-sites
- **Système FEFO Automatique** - Sélection intelligente des lots selon leur date d'expiration
- **Gestion des Lots** - Traçabilité complète avec numéros de lot et dates de péremption
- **Bons de Commande** - Workflow complet de la commande à la réception
- **Expéditions & Livraisons** - Préparation automatique avec picking FEFO
- **Mouvements de Stock** - Historique complet de tous les mouvements
- **Gestion des Articles** - Base de données produits avec images
- **Clients & Fournisseurs** - Annuaire complet des partenaires
- **Système de Notifications** - Alertes en temps réel (stocks bas, péremption proche)
- **Rapports & Tableaux de Bord** - Statistiques et analyses visuelles
- **Multi-langue** - Support Français, Anglais, Arabe

## 🛠️ Technologies Utilisées

### Backend
- **Node.js** avec Express.js
- **MySQL** / MariaDB
- **JWT** pour l'authentification
- **Bcrypt** pour le hashing des mots de passe
- **Multer** pour l'upload de fichiers

### Frontend
- **Next.js 16** (App Router)
- **React 19**
- **Turbopack** pour le build ultra-rapide
- **Tailwind CSS** pour le styling
- **shadcn/ui** pour les composants UI
- **Axios** pour les requêtes API
- **Lucide React** pour les icônes
- **Sonner** pour les notifications toast

## 📋 Prérequis

- Node.js 18+ 
- MySQL 8.0+ ou MariaDB 10.6+
- npm ou yarn

## 🔧 Installation Complète - Guide Pas à Pas

### Étape 1: Prérequis - Vérifier les installations

Avant de commencer, assurez-vous d'avoir installé:

**1. Node.js (version 18 ou supérieure)**
```bash
node --version
# Doit afficher v18.x.x ou supérieur
```
Si pas installé: Télécharger depuis [nodejs.org](https://nodejs.org/)

**2. MySQL ou MariaDB**
```bash
mysql --version
# Doit afficher MySQL 8.0+ ou MariaDB 10.4+
```
Si pas installé: Télécharger depuis [mysql.com](https://dev.mysql.com/downloads/) ou [mariadb.org](https://mariadb.org/download/)

**3. Git**
```bash
git --version
```
Si pas installé: Télécharger depuis [git-scm.com](https://git-scm.com/)

---

### Étape 2: Cloner le projet

```bash
git clone https://github.com/mahmoudfourati/StoreTrack.git
cd StoreTrack
```

---

### Étape 3: Configuration de la Base de Données MySQL

**3.1 Démarrer MySQL**

Windows (XAMPP):
- Ouvrir XAMPP Control Panel
- Cliquer sur "Start" pour MySQL

Windows (Service):
```bash
net start MySQL
```

Linux/Mac:
```bash
sudo systemctl start mysql
# ou
sudo service mysql start
```

**3.2 Créer la base de données**

Se connecter à MySQL:
```bash
mysql -u root -p
# Entrer votre mot de passe MySQL (laisser vide si aucun)
```

Créer la base de données:
```sql
CREATE DATABASE storetrack_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

**3.3 Importer le schéma de base (optionnel)**

Si vous voulez partir avec la structure de base:
```bash
mysql -u root -p storetrack_db < backend/storetrack_db_backup.sql
```

---

### Étape 4: Configuration du Backend

**4.1 Installer les dépendances**

```bash
cd backend
npm install
```

**4.2 Créer le fichier de configuration `.env`**

Créer un fichier nommé `.env` dans le dossier `backend/` avec le contenu suivant:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=storetrack_db
DB_PORT=3306

# JWT Secret (changez cette valeur en production)
JWT_SECRET=your_super_secret_jwt_key_change_in_production_2025

# Server Configuration
PORT=5000
NODE_ENV=development
```

**⚠️ Important:** 
- Si votre MySQL a un mot de passe, mettez-le dans `DB_PASSWORD=votre_mot_de_passe`
- Si vous utilisez un port différent de 3306, changez `DB_PORT`

**4.3 Créer un utilisateur administrateur**

```bash
node createAdmin.js
```

Ceci crée un compte admin avec:
- Email: `admin@storetrack.com`
- Mot de passe: `Admin123!`

---

### Étape 5: Peupler la base de données avec des données de démonstration

**Important:** Cette étape crée des données réalistes pour tester l'application.

```bash
node scripts/seedDatabase.js
```



### Étape 6: Configuration du Frontend

**6.1 Installer les dépendances**

Ouvrir un **nouveau terminal** et naviguer vers le frontend:
```bash
cd frontend
npm install
```

**6.2 Créer le fichier de configuration `.env.local`**

Créer un fichier nommé `.env.local` dans le dossier `frontend/` avec:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

### Étape 7: Démarrer l'application

**7.1 Lancer le Backend**

Dans le terminal backend (ou ouvrez un nouveau terminal):
```bash
cd backend
npm start
```

Vous devriez voir:
```
Serveur backend lancé sur le port 5000
✅ Connecté à la base de données MySQL avec succès !
```

**Le backend tourne sur:** `http://localhost:5000`

**7.2 Lancer le Frontend**

Dans un **nouveau terminal**:
```bash
cd frontend
npm run dev
```

Vous devriez voir:
```
▲ Next.js 16.0.3 (Turbopack)
- Local:        http://localhost:3000
✓ Ready in 1.5s
```

**Le frontend tourne sur:** `http://localhost:3000`

---

### Étape 8: Accéder à l'application

**8.1 Ouvrir votre navigateur**

Aller sur: `http://localhost:3000`

**8.2 Se connecter**

Page de connexion - Utiliser:
```
Email: admin@storetrack.com
Mot de passe: Admin123!
```

**8.3 Explorer les pages**

Une fois connecté, vous aurez accès à:
- 📊 **Dashboard** - Vue d'ensemble avec graphiques et KPIs
- 📦 **Articles** - 20 articles dans 4 catégories
- 🏢 **Entrepôts** - 4 entrepôts configurés
- 📋 **Stock** - État des stocks par article et entrepôt
- 🏷️ **Lots** - 15 lots avec dates d'expiration FEFO
- 🛒 **Commandes d'achats** - 5 bons de commande complétés
- 🔄 **Mouvements** - Historique de tous les mouvements
- 🏭 **Fournisseurs** - 5 fournisseurs
- 📈 **Rapports** - Valorisation du stock et analyses
- ⚙️ **Utilisateurs** - 6 utilisateurs configurés

---
## 🔐 Comptes de Démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@storetrack.com | Admin123! |
| Manager | marie.dubois@storetrack.com | Password123! |
| Opérateur | jean.martin@storetrack.com | Password123! |

---

## 🐛 Dépannage

### Problème: Backend ne démarre pas

**Erreur:** `ECONNREFUSED` ou `ER_ACCESS_DENIED_ERROR`

**Solution:**
1. Vérifier que MySQL est démarré:
   ```bash
   # Windows
   net start MySQL
   
   # Linux/Mac
   sudo systemctl status mysql
   ```

2. Vérifier les credentials dans `backend/.env`:
   - `DB_USER` correct (généralement `root`)
   - `DB_PASSWORD` correct (vide par défaut sur XAMPP)
   - `DB_NAME` = `storetrack_db`

3. Tester la connexion MySQL:
   ```bash
   mysql -u root -p
   # Puis: SHOW DATABASES;
   ```

### Problème: Port 5000 déjà utilisé

**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID [PID_NUMBER] /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

Ou changer le port dans `backend/.env`:
```env
PORT=5001
```
Et dans `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

### Problème: Frontend affiche "Unable to connect"

**Solutions:**
1. Vérifier que le backend tourne (voir terminal backend)
2. Vérifier `frontend/.env.local` existe et contient:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```
3. Redémarrer le frontend:
   ```bash
   # Ctrl+C pour arrêter
   npm run dev
   ```

### Problème: Pas de données visibles

**Solution:** Re-peupler la base de données:
```bash
cd backend
node scripts/seedDatabase.js
```

### Problème: "Module not found"

**Solution:** Réinstaller les dépendances:
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 Support

En cas de problème persistant:
1. Vérifier les logs du terminal backend pour les erreurs
2. Vérifier la console du navigateur (F12) pour les erreurs frontend
3. S'assurer que les deux serveurs (backend + frontend) sont actifs
4. Vérifier les versions: Node.js 18+, MySQL 8.0+

## 📁 Structure du Projet

```
StoreTrack/
├── backend/
│   ├── config/           # Configuration (DB, etc.)
│   ├── middleware/       # Auth, Upload
│   ├── routes/           # Routes API (15+ modules)
│   ├── services/         # Logique métier (FEFO, Mouvements)
│   ├── migrations/       # Scripts SQL
│   ├── uploads/          # Images uploadées
│   └── server.js         # Point d'entrée
│
└── frontend/
    ├── app/              # Pages Next.js (App Router)
    │   ├── articles/
    │   ├── lots/
    │   ├── shipments/
    │   ├── stock/
    │   └── ...
    ├── components/       # Composants React
    │   ├── layout/
    │   └── ui/
    ├── lib/              # Contexts & Utils
    └── locales/          # Traductions i18n
```

## 🎯 Fonctionnalité Clé : Algorithme FEFO

Le système implémente un algorithme **FEFO (First Expired First Out)** qui:

1. Sélectionne automatiquement les lots qui expirent en premier lors des expéditions
2. Optimise la rotation des stocks pour minimiser les pertes
3. Maintient la traçabilité complète des lots utilisés
4. Met à jour les stocks en temps réel avec audit trail

**Implémentation:** `backend/services/lotService.js` → méthode `pickLotsForShipment()`

## 📊 Modules Disponibles

| Module | Description |
|--------|-------------|
| Articles | Gestion catalogue produits |
| Entrepôts | Configuration multi-sites |
| Stocks | État des stocks par entrepôt |
| Lots | Gestion numéros de lot et péremption |
| Bons de Commande | Workflow d'achat complet |
| Réceptions | Entrée de marchandises avec lots |
| Expéditions | Sortie avec picking FEFO |
| Transferts | Mouvements inter-entrepôts |
| Demandes Internes | Requêtes entre services |
| Mouvements | Historique complet |
| Fournisseurs | Annuaire fournisseurs |
| Utilisateurs | Gestion des accès |
| Tickets | Support interne |
| Paramètres | Configuration système |

## 🔐 Sécurité

- ✅ Requêtes SQL paramétrées (protection injection SQL)
- ✅ Authentification JWT
- ✅ Hashing bcrypt (10 rounds)
- ✅ Middleware de vérification de token
- ✅ Validation côté serveur


