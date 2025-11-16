// backend/services/movementService.js
const db = require("../db");

async function createMovement({ article_id, warehouse_from = null, warehouse_to = null, qty = 0, type, user = null, note = null }) {
  return new Promise((resolve, reject) => {
    if (!article_id || !qty || !type) return reject(new Error("article_id, qty et type requis"));

    const sqlInsert = `INSERT INTO movements (article_id, warehouse_from, warehouse_to, qty, type, user, note) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(sqlInsert, [article_id, warehouse_from, warehouse_to, qty, type, user, note], (err, res) => {
      if (err) return reject(err);

      // Helper: ensure stock row exists
      function ensureStock(articleId, warehouseId, cb) {
        if (!warehouseId) return cb(null);
        const sqlCheck = `SELECT id FROM stocks WHERE article_id = ? AND warehouse_id = ?`;
        db.query(sqlCheck, [articleId, warehouseId], (errCheck, rows) => {
          if (errCheck) return cb(errCheck);
          if (rows && rows.length > 0) return cb(null);
          const sqlInsertStock = `INSERT INTO stocks (article_id, warehouse_id, quantity) VALUES (?, ?, 0)`;
          db.query(sqlInsertStock, [articleId, warehouseId], cb);
        });
      }

      // Update stocks depending on type
      const afterUpdate = () => {
        // Check alert: if quantity <= min_quantity -> log (console) and optionally create notification
        const warehouseToCheck = (type === "in" || type === "transfer") ? warehouse_to : warehouse_from;
        if (!warehouseToCheck) return resolve({ movementId: res.insertId });

        const sqlAlert = `SELECT * FROM stocks WHERE article_id = ? AND warehouse_id = ? AND min_quantity IS NOT NULL AND quantity <= min_quantity`;
        db.query(sqlAlert, [article_id, warehouseToCheck], (errAlert, rowsAlert) => {
          if (errAlert) {
            // don't block on alert fail
            console.error("Erreur check alert:", errAlert);
            return resolve({ movementId: res.insertId });
          }
          if (rowsAlert && rowsAlert.length > 0) {
            console.log("⚠️ Alerte stock minimum (movementService):", rowsAlert[0]);
            // create a notification row to be consumed by frontend
            const message = `Stock critique pour article_id ${article_id} en warehouse ${warehouseToCheck}`;
            db.query(`INSERT INTO notifications (type, target_id, message) VALUES (?, ?, ?)`, ['stock_alert', null, message], (errNot) => {
              if (errNot) console.error("Erreur insert notification:", errNot);
              return resolve({ movementId: res.insertId });
            });
          } else {
            return resolve({ movementId: res.insertId });
          }
        });
      };

      // Now update stock rows according to type
      if (type === "in") {
        ensureStock(article_id, warehouse_to, (errEnsure) => {
          if (errEnsure) return reject(errEnsure);
          const sqlUpdate = `UPDATE stocks SET quantity = quantity + ? WHERE article_id = ? AND warehouse_id = ?`;
          db.query(sqlUpdate, [qty, article_id, warehouse_to], (errUpd) => {
            if (errUpd) return reject(errUpd);
            afterUpdate();
          });
        });
      } else if (type === "out") {
        ensureStock(article_id, warehouse_from, (errEnsure) => {
          if (errEnsure) return reject(errEnsure);
          const sqlUpdate = `UPDATE stocks SET quantity = quantity - ? WHERE article_id = ? AND warehouse_id = ?`;
          db.query(sqlUpdate, [qty, article_id, warehouse_from], (errUpd) => {
            if (errUpd) return reject(errUpd);
            afterUpdate();
          });
        });
      } else if (type === "transfer") {
        // decrement from source then increment dest
        ensureStock(article_id, warehouse_from, (err1) => {
          if (err1) return reject(err1);
          ensureStock(article_id, warehouse_to, (err2) => {
            if (err2) return reject(err2);
            const sqlMinus = `UPDATE stocks SET quantity = quantity - ? WHERE article_id = ? AND warehouse_id = ?`;
            db.query(sqlMinus, [qty, article_id, warehouse_from], (errMinus) => {
              if (errMinus) return reject(errMinus);
              const sqlPlus = `UPDATE stocks SET quantity = quantity + ? WHERE article_id = ? AND warehouse_id = ?`;
              db.query(sqlPlus, [qty, article_id, warehouse_to], (errPlus) => {
                if (errPlus) return reject(errPlus);
                afterUpdate();
              });
            });
          });
        });
      } else {
        // unknown type: ignore stock update
        afterUpdate();
      }
    });
  });
}

module.exports = { createMovement };
