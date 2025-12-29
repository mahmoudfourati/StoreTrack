// frontend/lib/axios.js
import axios from 'axios';

// On crée une instance d'axios avec l'URL de base
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // L'adresse de ton backend
});

// INTERCEPTEUR : Avant chaque requête, on ajoute le token si on en a un
api.interceptors.request.use(
  (config) => {
    // On cherche le token dans le stockage local du navigateur
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;