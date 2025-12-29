// backend/middleware/upload.js
const multer = require('multer');
const path = require('path');

// Configuration du stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Indique où sauvegarder les fichiers
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Renomme le fichier pour éviter les doublons (Nom + Date + Extension)
        // ex: chaise-167894400.jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtre pour n'accepter que les images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Le fichier doit être une image !'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 // Limite à 5MB
    },
    fileFilter: fileFilter
});

module.exports = upload;