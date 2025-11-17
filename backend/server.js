
const db = require("./db");
const express = require("express");
const app = express();
app.use(express.json());
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
app.use("/api/shipments", require("./routes/shipments"));
app.use("/api/shipment_entries", require("./routes/shipment_entries"));
app.use("/api/transfers", require("./routes/transfers"));
app.use("/api/internal_requests", require("./routes/internal_requests"));
app.use("/api/tickets", require("./routes/tickets"));


app.get("/", (req, res) => {
  res.send("Backend StoreTrack fonctionne !");
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Serveur backend lancé sur le port ${PORT}`);
});
