// backend/server.js
const db = require("./config/db");
const express = require("express");
const cors = require("cors");
const app = express();
// ... Imports
const authRoutes = require('./routes/auth');
const path = require('path'); // Ajoute ça tout en haut avec les autres require
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Parse JSON bodies
app.use(express.json());

// --- CORS configuration (DEV) ---
const allowedOrigins = [
  "http://localhost:3000", 
  "http://localhost:5173", 
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: Origin not allowed - " + origin));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
};

app.use(cors(corsOptions));

// AJOUTE CECI :
// Permet d'accéder aux images via http://localhost:5000/uploads/mon-image.jpg
app.use('/uploads', express.static('uploads'));
// -------------------------------

// Routes
const articleRoutes = require("./routes/articles");
app.use("/api/articles", articleRoutes);

const warehouseRoutes = require("./routes/warehouses");
app.use("/api/warehouses", warehouseRoutes);

const stockRoutes = require("./routes/stocks");
app.use("/api/stocks", stockRoutes);

const movementRoutes = require("./routes/movements");
app.use("/api/movements", movementRoutes);

const supplierRoutes = require("./routes/suppliers");
app.use("/api/suppliers", supplierRoutes);

const clientRoutes = require("./routes/clients");
app.use("/api/clients", clientRoutes);

const poRoutes = require("./routes/purchase_orders");
app.use("/api/purchase_orders", poRoutes);

const notificationRoutes = require("./routes/notifications");
app.use("/api/notifications", notificationRoutes);

const receptionRoutes = require("./routes/receptions");
app.use("/api/receptions", receptionRoutes);

// --- ROUTES AJOUTÉES / MODIFIÉES ---
app.use("/api/shipments", require("./routes/shipments"));
app.use("/api/shipment_entries", require("./routes/shipment_entries"));
app.use("/api/transfers", require("./routes/transfers"));
app.use("/api/internal_requests", require("./routes/internal_requests"));
app.use("/api/tickets", require("./routes/tickets"));

// AJOUTE CETTE LIGNE ICI :
app.use("/api/dashboard", require("./routes/dashboard")); 
app.use("/api/lots", require("./routes/lots")); 

// Route API Users (CRUD utilisateurs)
app.use("/api/users", require("./routes/users"));

// ... Routes
app.use('/api/auth', authRoutes); // Route publique (pas de protection)

// Exemple : Si tu veux protéger les routes Articles, tu ferais :
// const auth = require('./middleware/auth');
// app.use('/api/articles', auth, articleRoutes); 
// (Mais pour l'instant, laisse ouvert le temps de tester le login)


// Healthcheck
app.get("/", (req, res) => {
  res.send("Backend StoreTrack fonctionne !");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur backend lancé sur le port ${PORT}`);
});