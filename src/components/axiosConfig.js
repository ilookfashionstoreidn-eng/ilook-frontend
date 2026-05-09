import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || '/api/', // URL backend Anda
});

// Menambahkan header default untuk setiap permintaan
api.defaults.headers.common['Content-Type'] = 'application/json';

// Menangani token JWT
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token'); // Simpan token setelah login
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
