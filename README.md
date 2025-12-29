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

## 🔧 Installation

### 1. Cloner le projet

```bash
git clone https://github.com/votre-username/storetrack.git
cd storetrack
```

### 2. Configuration de la base de données

Créer une base de données MySQL:

```sql
CREATE DATABASE storetrack_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Importer le schéma (optionnel):

```bash
mysql -u root -p storetrack_db < backend/storetrack_db_backup.sql
```

### 3. Backend Setup

```bash
cd backend
npm install
```

Créer un fichier `.env` dans le dossier `backend/`:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=storetrack_db
DB_PORT=3306

# JWT
JWT_SECRET=votre_secret_jwt_super_securise_ici

# Server
PORT=5000
NODE_ENV=development
```

Créer un utilisateur admin:

```bash
node createAdmin.js
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

Créer un fichier `.env.local` dans le dossier `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🚦 Démarrage

### Lancer le Backend

```bash
cd backend
npm start
```

Le serveur démarre sur `http://localhost:5000`

### Lancer le Frontend

```bash
cd frontend
npm run dev
```

L'application est accessible sur `http://localhost:3000`

### Connexion par défaut

```
Email: admin@storetrack.com
Mot de passe: 123456
```

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


