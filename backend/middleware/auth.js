const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
    try {
        // Récupérer le token du header "Authorization: Bearer <token>"
        const token = req.headers.authorization.split(' ')[1]; 
        
        // Vérifier le token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        
        // Ajouter l'info utilisateur à la requête pour l'utiliser plus tard
        req.user = {
            userId: decodedToken.userId,
            role: decodedToken.role
        };
        
        next(); // C'est bon, passe à la suite
    } catch (error) {
        res.status(401).json({ message: 'Authentification requise !' });
    }
};